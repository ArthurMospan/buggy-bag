'use client';
import { useState } from 'react';
import { Bug, BugStatus, BugSeverity, Annotation } from '@/lib/types';
import Dialog from '@/components/ui/Dialog';
import Badge from '@/components/ui/DataDisplay/Badge';
import { Select } from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import { format } from 'date-fns';
import { uk } from 'date-fns/locale';
import { Save, ChevronDown, ChevronUp } from 'lucide-react';

const STATUS_OPTIONS = [
  { value: 'open',        label: 'Open',        dotColor: '#6366f1' },
  { value: 'in_progress', label: 'In Progress', dotColor: '#f97316' },
  { value: 'resolved',    label: 'Resolved',    dotColor: '#10b981' },
  { value: 'closed',      label: 'Closed',      dotColor: '#9a9a9a' },
];

const STATUS_CFG: Record<BugStatus, { label: string; variant: 'info' | 'warning' | 'success' | 'default' }> = {
  open:        { label: 'Open',        variant: 'info' },
  in_progress: { label: 'In Progress', variant: 'warning' },
  resolved:    { label: 'Resolved',    variant: 'success' },
  closed:      { label: 'Closed',      variant: 'default' },
};

const SEVERITY_COLOR: Record<string, string> = {
  critical: '#dc2626',
  high:     '#f97316',
  medium:   '#f59e0b',
  low:      '#6b7280',
};

// ── Pin overlay ─────────────────────────────────────────────────────────────
function PinOverlay({ annotations }: { annotations: Annotation[] }) {
  const [hovered, setHovered] = useState<number | null>(null);
  return (
    <>
      {annotations.map((ann, i) => (
        <div
          key={i}
          className="absolute"
          style={{ left: `${ann.x}%`, top: `${ann.y}%`, transform: 'translate(-50%, -50%)' }}
          onMouseEnter={() => setHovered(i)}
          onMouseLeave={() => setHovered(null)}
        >
          <div className="w-[22px] h-[22px] bg-[#ef4444] text-white rounded-full flex items-center justify-center text-[10px] font-bold shadow-lg cursor-pointer border-2 border-white select-none">
            {ann.index ?? i + 1}
          </div>
          {hovered === i && ann.text && (
            <div className="absolute bottom-[28px] left-1/2 -translate-x-1/2 bg-[#1f1f1f] text-white text-[11px] font-semibold px-[10px] py-[6px] rounded-[8px] whitespace-nowrap shadow-lg z-10 max-w-[220px] text-center leading-snug pointer-events-none">
              {ann.text}
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#1f1f1f]" />
            </div>
          )}
        </div>
      ))}
    </>
  );
}

// ── Collapsible section ─────────────────────────────────────────────────────
function Section({ title, children, defaultOpen = false }: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-[#e9e9e9] rounded-[12px] overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-[14px] py-[10px] bg-[#f9f9f9] hover:bg-[#f4f4f5] transition-colors"
      >
        <span className="text-[11px] font-bold text-[#9a9a9a] uppercase tracking-wider">{title}</span>
        {open ? <ChevronUp size={14} className="text-[#9a9a9a]" /> : <ChevronDown size={14} className="text-[#9a9a9a]" />}
      </button>
      {open && <div className="p-[14px]">{children}</div>}
    </div>
  );
}

// ── Main modal ──────────────────────────────────────────────────────────────
const SEVERITY_OPTIONS = [
  { value: 'low',      label: 'Low' },
  { value: 'medium',   label: 'Medium' },
  { value: 'high',     label: 'High' },
  { value: 'critical', label: 'Critical' },
];

interface BugDetailModalProps {
  bug: Bug | null;
  onClose: () => void;
  onStatusChange: (id: string, status: BugStatus) => Promise<void>;
  onSeverityChange?: (id: string, severity: BugSeverity) => Promise<void>;
}

export default function BugDetailModal({ bug, onClose, onStatusChange, onSeverityChange }: BugDetailModalProps) {
  const [status,   setStatus]   = useState<BugStatus>(bug?.status ?? 'open');
  const [severity, setSeverity] = useState<BugSeverity>(bug?.severity ?? 'low');
  const [saving, setSaving] = useState(false);

  if (bug && status !== bug.status && !saving) setStatus(bug.status);
  if (bug && severity !== bug.severity && !saving) setSeverity(bug.severity ?? 'low');
  if (!bug) return null;

  const cfg = STATUS_CFG[bug.status];
  const tc  = bug.tech_context;
  const hasAnnotations = (bug.json_annotations?.length ?? 0) > 0;
  const networkErrors  = tc?.networkRequests?.filter(r => r.isError) ?? [];

  const handleSave = async () => {
    setSaving(true);
    const tasks: Promise<void>[] = [];
    if (status !== bug.status) tasks.push(onStatusChange(bug.id, status));
    if (severity !== bug.severity && onSeverityChange) tasks.push(onSeverityChange(bug.id, severity));
    await Promise.all(tasks);
    setSaving(false);
  };

  const hasChanges = status !== bug.status || severity !== (bug.severity ?? 'low');

  return (
    <Dialog isOpen={!!bug} onClose={onClose} title="Деталі баг-репорту" size="lg">
      <div className="flex flex-col gap-[16px]">

        {/* Screenshot + pins */}
        {bug.image_url && (
          <div className="relative bg-[#f4f4f5] rounded-[12px] overflow-hidden">
            <img src={bug.image_url} alt="Bug screenshot" className="w-full object-contain max-h-[340px]" />
            {hasAnnotations && <div className="absolute inset-0"><PinOverlay annotations={bug.json_annotations} /></div>}
          </div>
        )}

        {/* Core meta */}
        <div className="grid grid-cols-3 gap-[8px]">
          <div className="bg-[#f4f4f5] rounded-[10px] p-[12px]">
            <div className="text-[10px] font-bold text-[#9a9a9a] uppercase tracking-wider mb-[4px]">Статус</div>
            <Badge variant={cfg.variant} size="md">{cfg.label}</Badge>
          </div>
          <div className="bg-[#f4f4f5] rounded-[10px] p-[12px]">
            <div className="text-[10px] font-bold text-[#9a9a9a] uppercase tracking-wider mb-[4px]">Severity</div>
            <span className="text-[13px] font-bold capitalize" style={{ color: SEVERITY_COLOR[bug.severity ?? 'low'] }}>
              {bug.severity ?? '—'}
            </span>
          </div>
          <div className="bg-[#f4f4f5] rounded-[10px] p-[12px]">
            <div className="text-[10px] font-bold text-[#9a9a9a] uppercase tracking-wider mb-[4px]">Дата</div>
            <div className="text-[12px] font-semibold text-[#1f1f1f]">
              {format(new Date(bug.created_at), 'dd MMM, HH:mm', { locale: uk })}
            </div>
          </div>
        </div>

        {/* Description */}
        {bug.description && (
          <div className="bg-[#f4f4f5] rounded-[10px] p-[12px]">
            <div className="text-[10px] font-bold text-[#9a9a9a] uppercase tracking-wider mb-[6px]">Опис</div>
            <p className="text-[13px] text-[#1f1f1f] leading-relaxed whitespace-pre-wrap">{bug.description}</p>
          </div>
        )}

        {/* Tech context sections */}
        {tc && (
          <>
            {/* Component + route */}
            <Section title="Компонент та контекст" defaultOpen>
              <div className="grid grid-cols-2 gap-[8px]">
                {tc.component && (
                  <div>
                    <div className="text-[10px] font-bold text-[#9a9a9a] mb-[3px]">Компонент</div>
                    <code className="text-[12px] font-mono text-[#6366f1] bg-[#eef2ff] px-[6px] py-[2px] rounded-[4px]">
                      {tc.component.name}
                    </code>
                    {tc.component.props && Object.keys(tc.component.props).length > 0 && (
                      <div className="mt-[6px] text-[11px] font-mono text-[#9a9a9a] bg-[#f4f4f5] rounded-[6px] p-[8px] leading-relaxed">
                        {Object.entries(tc.component.props).map(([k, v]) => (
                          <div key={k}><span className="text-[#6366f1]">{k}</span>: {String(v)}</div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <div className="flex flex-col gap-[6px]">
                  <div>
                    <div className="text-[10px] font-bold text-[#9a9a9a] mb-[3px]">Route</div>
                    <code className="text-[11px] font-mono text-[#1f1f1f]">{tc.route}</code>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-[#9a9a9a] mb-[3px]">Viewport</div>
                    <code className="text-[11px] font-mono text-[#1f1f1f]">{tc.viewport}</code>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-[#9a9a9a] mb-[3px]">Browser</div>
                    <span className="text-[11px] text-[#9a9a9a] break-all">{tc.userAgent?.split(' ').slice(-2).join(' ')}</span>
                  </div>
                </div>
              </div>
            </Section>

            {/* Network errors */}
            {tc.networkRequests?.length > 0 && (
              <Section title={`Мережеві запити (${networkErrors.length > 0 ? `${networkErrors.length} помилок` : 'чисто'})`} defaultOpen={networkErrors.length > 0}>
                <div className="flex flex-col gap-[4px]">
                  {tc.networkRequests.map((r, i) => (
                    <div key={i} className={`flex items-center gap-[8px] px-[10px] py-[7px] rounded-[8px] text-[11px] font-mono ${r.isError ? 'bg-[#fff0f0]' : 'bg-[#f4f4f5]'}`}>
                      <span className={`text-[10px] font-bold px-[6px] py-[2px] rounded-[4px] shrink-0 ${r.isError ? 'bg-[#fee2e2] text-[#991b1b]' : 'bg-[#dcfce7] text-[#166534]'}`}>
                        {r.status || 'ERR'}
                      </span>
                      <span className="text-[#9a9a9a] shrink-0">{r.method}</span>
                      <span className={`flex-1 truncate ${r.isError ? 'text-[#dc2626]' : 'text-[#1f1f1f]'}`}>{r.url}</span>
                      <span className="text-[#cfcfcf] shrink-0">{r.durationMs}ms</span>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Console errors */}
            {tc.consoleErrors?.length > 0 && (
              <Section title={`Console (${tc.consoleErrors.length})`} defaultOpen>
                <div className="flex flex-col gap-[4px]">
                  {tc.consoleErrors.map((e, i) => (
                    <div key={i} className={`px-[10px] py-[7px] rounded-[8px] ${e.level === 'error' ? 'bg-[#fff0f0]' : 'bg-[#fffbeb]'}`}>
                      <div className="flex items-center gap-[6px] mb-[2px]">
                        <span className={`text-[9px] font-bold uppercase px-[5px] py-[1px] rounded-[3px] ${e.level === 'error' ? 'bg-[#fee2e2] text-[#991b1b]' : 'bg-[#fef3c7] text-[#92400e]'}`}>
                          {e.level}
                        </span>
                        {e.source && <span className="text-[10px] text-[#9a9a9a] font-mono">{e.source}</span>}
                      </div>
                      <p className="text-[11px] font-mono text-[#1f1f1f] leading-relaxed break-all">{e.message}</p>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Event log / steps */}
            {tc.eventLog?.length > 0 && (
              <Section title={`Кроки відтворення (${tc.eventLog.length})`}>
                <div className="flex flex-col gap-[3px]">
                  {tc.eventLog.map((e, i) => (
                    <div key={i} className="flex items-start gap-[8px] text-[12px]">
                      <span className="text-[#cfcfcf] font-mono shrink-0 mt-[1px]">{i + 1}.</span>
                      <span className={`${e.type === 'console_error' || e.type === 'network_error' ? 'text-[#dc2626]' : 'text-[#1f1f1f]'}`}>
                        {e.description}
                      </span>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Store snapshot */}
            {tc.storeSnapshot && Object.keys(tc.storeSnapshot).length > 0 && (
              <Section title="Store snapshot">
                <pre className="text-[11px] font-mono text-[#1f1f1f] leading-relaxed overflow-x-auto whitespace-pre-wrap bg-[#f4f4f5] rounded-[8px] p-[10px]">
                  {JSON.stringify(tc.storeSnapshot, null, 2)}
                </pre>
              </Section>
            )}
          </>
        )}

        {/* Pins list */}
        {hasAnnotations && (
          <Section title={`Піни (${bug.json_annotations.length})`}>
            <div className="flex flex-col gap-[6px]">
              {bug.json_annotations.map((ann, i) => (
                <div key={i} className="flex items-start gap-[8px] bg-[#f4f4f5] rounded-[8px] px-[10px] py-[8px]">
                  <div className="w-[18px] h-[18px] bg-[#ef4444] text-white rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 mt-[1px]">
                    {ann.index ?? i + 1}
                  </div>
                  <span className="text-[12px] text-[#1f1f1f] font-semibold">{ann.text}</span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Status + Severity changer */}
        <div className="flex items-end gap-[10px] pt-[12px] border-t border-[#f0f0f0]">
          <div className="flex-1">
            <div className="text-[11px] font-bold text-[#9a9a9a] uppercase tracking-wider mb-[6px]">Статус</div>
            <Select value={status} onChange={(v: string) => setStatus(v as BugStatus)} options={STATUS_OPTIONS} />
          </div>
          <div className="flex-1">
            <div className="text-[11px] font-bold text-[#9a9a9a] uppercase tracking-wider mb-[6px]">Severity</div>
            <Select value={severity} onChange={(v: string) => setSeverity(v as BugSeverity)} options={SEVERITY_OPTIONS} />
          </div>
          <Button style="primary" size="lg" icon={Save} loading={saving} onClick={handleSave} disabled={!hasChanges}>
            Зберегти
          </Button>
        </div>

      </div>
    </Dialog>
  );
}
bold">{ann.text}</span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Status + Severity changer */}
        <div className="flex items-end gap-[10px] pt-[12px] border-t border-[#f0f0f0]">
          <div className="flex-1">
            <div className="text-[11px] font-bold text-[#9a9a9a] uppercase tracking-wider mb-[6px]">Статус</div>
            <Select value={status} onChange={(v: string) => setStatus(v as BugStatus)} options={STATUS_OPTIONS} />
          </div>
          <div className="flex-1">
            <div className="text-[11px] font-bold text-[#9a9a9a] uppercase tracking-wider mb-[6px]">Severity</div>
            <Select value={severity} onChange={(v: string) => setSeverity(v as BugSeverity)} options={SEVERITY_OPTIONS} />
          </div>
          <Button style="primary" size="lg" icon={Save} loading={saving} onClick={handleSave} disabled={!hasChanges}>
            Зберегти
          </Button>
        </div>

      </div>
    </Dialog>
  );
}

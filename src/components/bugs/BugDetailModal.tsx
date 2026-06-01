'use client';
import { useState } from 'react';
import { Bug, BugStatus, Annotation } from '@/lib/types';
import Dialog from '@/components/ui/Dialog';
import Badge from '@/components/ui/DataDisplay/Badge';
import { Select } from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import { format } from 'date-fns';
import { uk } from 'date-fns/locale';
import { Save } from 'lucide-react';

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

// ── Pin overlay ────────────────────────────────────────
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
          {/* Pin dot */}
          <div className="w-[22px] h-[22px] bg-[#ef4444] text-white rounded-full flex items-center justify-center text-[10px] font-bold shadow-lg cursor-pointer border-2 border-white select-none">
            {ann.index ?? i + 1}
          </div>
          {/* Tooltip */}
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

// ── Main modal ─────────────────────────────────────────
interface BugDetailModalProps {
  bug: Bug | null;
  onClose: () => void;
  onStatusChange: (id: string, status: BugStatus) => Promise<void>;
}

export default function BugDetailModal({ bug, onClose, onStatusChange }: BugDetailModalProps) {
  const [status, setStatus] = useState<BugStatus>(bug?.status ?? 'open');
  const [saving, setSaving] = useState(false);

  // Sync local status when bug prop changes
  if (bug && status !== bug.status && !saving) {
    setStatus(bug.status);
  }

  if (!bug) return null;

  const cfg = STATUS_CFG[bug.status];
  const hasAnnotations = (bug.json_annotations?.length ?? 0) > 0;

  const handleSave = async () => {
    setSaving(true);
    await onStatusChange(bug.id, status);
    setSaving(false);
  };

  return (
    <Dialog isOpen={!!bug} onClose={onClose} title="Деталі баг-репорту" size="lg">
      <div className="flex flex-col gap-[20px]">

        {/* Screenshot + pins */}
        {bug.image_url && (
          <div className="relative bg-[#f4f4f5] rounded-[12px] overflow-hidden">
            <img
              src={bug.image_url}
              alt="Bug screenshot"
              className="w-full object-contain max-h-[380px]"
            />
            {hasAnnotations && (
              <div className="absolute inset-0">
                <PinOverlay annotations={bug.json_annotations} />
              </div>
            )}
          </div>
        )}

        {/* Metadata grid */}
        <div className="grid grid-cols-2 gap-[10px]">
          <div className="bg-[#f4f4f5] rounded-[12px] p-[14px]">
            <div className="text-[10px] font-bold text-[#9a9a9a] uppercase tracking-wider mb-[4px]">Проєкт</div>
            <div className="text-[14px] font-bold text-[#1f1f1f] truncate">{bug.project_id}</div>
          </div>
          <div className="bg-[#f4f4f5] rounded-[12px] p-[14px]">
            <div className="text-[10px] font-bold text-[#9a9a9a] uppercase tracking-wider mb-[4px]">Статус</div>
            <Badge variant={cfg.variant} size="md">{cfg.label}</Badge>
          </div>
          <div className="bg-[#f4f4f5] rounded-[12px] p-[14px] col-span-2">
            <div className="text-[10px] font-bold text-[#9a9a9a] uppercase tracking-wider mb-[4px]">Дата</div>
            <div className="text-[13px] font-semibold text-[#1f1f1f]">
              {format(new Date(bug.created_at), 'dd MMMM yyyy, HH:mm', { locale: uk })}
            </div>
          </div>
        </div>

        {/* Description */}
        {bug.description && (
          <div>
            <div className="text-[11px] font-bold text-[#9a9a9a] uppercase tracking-wider mb-[6px]">Опис</div>
            <p className="text-[13px] text-[#1f1f1f] leading-relaxed bg-[#f4f4f5] rounded-[12px] p-[14px]">
              {bug.description}
            </p>
          </div>
        )}

        {/* Annotations list */}
        {hasAnnotations && (
          <div>
            <div className="text-[11px] font-bold text-[#9a9a9a] uppercase tracking-wider mb-[8px]">
              Піни ({bug.json_annotations.length})
            </div>
            <div className="flex flex-col gap-[6px]">
              {bug.json_annotations.map((ann, i) => (
                <div key={i} className="flex items-start gap-[10px] bg-[#f4f4f5] rounded-[10px] px-[12px] py-[10px]">
                  <div className="w-[20px] h-[20px] bg-[#ef4444] text-white rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 mt-[1px]">
                    {ann.index ?? i + 1}
                  </div>
                  <span className="text-[13px] text-[#1f1f1f] font-semibold leading-snug">{ann.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Status changer */}
        <div className="flex items-end gap-[10px] pt-[16px] border-t border-[#f0f0f0]">
          <div className="flex-1">
            <div className="text-[11px] font-bold text-[#9a9a9a] uppercase tracking-wider mb-[6px]">
              Змінити статус
            </div>
            <Select
              value={status}
              onChange={(v: string) => setStatus(v as BugStatus)}
              options={STATUS_OPTIONS}
            />
          </div>
          <Button
            style="primary"
            size="lg"
            icon={Save}
            loading={saving}
            onClick={handleSave}
            disabled={status === bug.status}
          >
            Зберегти
          </Button>
        </div>

      </div>
    </Dialog>
  );
}

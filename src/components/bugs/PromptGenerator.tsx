'use client';
import { useState } from 'react';
import { Bug, BugStatus } from '@/lib/types';
import Dialog from '@/components/ui/Dialog';
import Button from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Forms/Textarea';
import { Sparkles, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';

interface PromptGeneratorProps {
  bugs: Bug[];
  onStatusChange?: (id: string, status: BugStatus) => void;
}

function formatPrompt(bugs: Bug[]): string {
  if (bugs.length === 0) return 'Не вибрано жодного бага.';

  const lines: string[] = [
    '# Bug Report Summary',
    `Date: ${new Date().toLocaleString('uk-UA')}`,
    `Bugs: ${bugs.length}`,
    '',
  ];

  bugs.forEach((bug, i) => {
    lines.push(`---`);
    lines.push(`## Bug #${i + 1}`);
    lines.push(`Status: ${bug.status}`);
    lines.push(`Submitted: ${new Date(bug.created_at).toLocaleString('uk-UA')}`);
    if (bug.description) lines.push(`Description: ${bug.description}`);
    if (bug.image_url) lines.push(`Screenshot: ${bug.image_url}`);
    if (bug.json_annotations?.length) {
      lines.push(`Annotations (${bug.json_annotations.length}):`);
      bug.json_annotations.forEach((ann, j) => {
        lines.push(`  ${ann.index ?? j + 1}. ${ann.text} [x:${ann.x.toFixed(1)}%, y:${ann.y.toFixed(1)}%]`);
      });
    }
    lines.push('');
  });

  return lines.join('\n');
}

export default function PromptGenerator({ bugs, onStatusChange }: PromptGeneratorProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showSelector, setShowSelector] = useState(false);
  const [markedDone, setMarkedDone] = useState(false);

  const selectable = bugs.filter(b => b.status === 'open' || b.status === 'in_progress');
  const selected = bugs.filter(b => selectedIds.has(b.id));
  const prompt = formatPrompt(selected);

  const toggleAll = () => {
    if (selectedIds.size === selectable.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(selectable.map(b => b.id)));
    }
  };

  const toggleOne = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleOpen = () => {
    // Pre-select all open/in_progress bugs
    setSelectedIds(new Set(selectable.map(b => b.id)));
    setMarkedDone(false);
    setCopied(false);
    setShowSelector(false);
    setOpen(true);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleMarkResolved = async () => {
    if (!onStatusChange) return;
    for (const id of selectedIds) {
      onStatusChange(id, 'resolved');
    }
    setMarkedDone(true);
    setSelectedIds(new Set());
  };

  return (
    <>
      <Button style="secondary" size="lg" icon={Sparkles} onClick={handleOpen}>
        AI Баг-репорт
      </Button>

      <Dialog isOpen={open} onClose={() => setOpen(false)} title="AI Баг-репорт" size="md">
        <div className="flex flex-col gap-[16px]">

          {/* Selection summary + toggle */}
          <div className="flex items-center justify-between">
            <p className="text-[13px] text-[#9a9a9a]">
              Вибрано{' '}
              <strong className="text-[#1f1f1f]">{selected.length}</strong>{' '}
              з {selectable.length} активних багів
            </p>
            <button
              onClick={() => setShowSelector(v => !v)}
              className="flex items-center gap-[4px] text-[12px] font-bold text-[#6366f1] hover:underline"
            >
              {showSelector ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              {showSelector ? 'Сховати вибір' : 'Змінити вибір'}
            </button>
          </div>

          {/* Collapsible bug selector */}
          {showSelector && (
            <div className="border border-[#e9e9e9] rounded-[12px] overflow-hidden">
              <div
                className="flex items-center gap-[10px] px-[12px] py-[10px] bg-[#f9f9f9] border-b border-[#e9e9e9] cursor-pointer"
                onClick={toggleAll}
              >
                <input
                  type="checkbox"
                  readOnly
                  checked={selectedIds.size === selectable.length && selectable.length > 0}
                  className="w-[14px] h-[14px] accent-[#1f1f1f]"
                />
                <span className="text-[12px] font-bold text-[#1f1f1f]">Вибрати всі</span>
              </div>
              <div className="max-h-[180px] overflow-y-auto">
                {selectable.map(bug => (
                  <div
                    key={bug.id}
                    className="flex items-start gap-[10px] px-[12px] py-[10px] border-b border-[#f0f0f0] last:border-0 cursor-pointer hover:bg-[#f9f9f9]"
                    onClick={() => toggleOne(bug.id)}
                  >
                    <input
                      type="checkbox"
                      readOnly
                      checked={selectedIds.has(bug.id)}
                      className="w-[14px] h-[14px] mt-[1px] accent-[#1f1f1f] shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-[12px] font-bold text-[#1f1f1f] truncate">
                        {bug.description || 'Без опису'}
                      </p>
                      <p className="text-[11px] text-[#9a9a9a]">
                        {bug.status} · {new Date(bug.created_at).toLocaleDateString('uk-UA')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Prompt textarea */}
          <Textarea
            readOnly
            value={prompt}
            rows={12}
            className="font-mono text-[11px] leading-relaxed"
          />

          {/* Actions */}
          <div className="flex gap-[8px]">
            <Button
              style="primary"
              size="lg"
              icon={copied ? Check : Copy}
              onClick={handleCopy}
              className="flex-1"
              disabled={selected.length === 0}
            >
              {copied ? 'Скопійовано!' : 'Копіювати промпт'}
            </Button>
            {onStatusChange && selected.length > 0 && !markedDone && (
              <Button style="secondary" size="lg" onClick={handleMarkResolved}>
                Закрити вибрані
              </Button>
            )}
            {markedDone && (
              <span className="flex items-center gap-[6px] text-[13px] font-bold text-[#10b981] px-[12px]">
                <Check size={14} /> Закрито
              </span>
            )}
          </div>

        </div>
      </Dialog>
    </>
  );
}

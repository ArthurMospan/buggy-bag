'use client';
import { useState } from 'react';
import { Bug } from '@/lib/types';
import Dialog from '@/components/ui/Dialog';
import Button from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Forms/Textarea';
import { Sparkles, Copy, Check } from 'lucide-react';

interface PromptGeneratorProps {
  bugs: Bug[];
}

function formatPrompt(bugs: Bug[]): string {
  const active = bugs.filter(b => b.status === 'open' || b.status === 'in_progress');

  if (active.length === 0) {
    return 'Немає активних багів (open або in_progress).';
  }

  const lines: string[] = [
    '# Bug Report Summary',
    `Date: ${new Date().toLocaleString('uk-UA')}`,
    `Active bugs: ${active.length}`,
    '',
  ];

  active.forEach((bug, i) => {
    lines.push(`---`);
    lines.push(`## Bug #${i + 1}`);
    lines.push(`Project: ${bug.project_id}`);
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

export default function PromptGenerator({ bugs }: PromptGeneratorProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const active = bugs.filter(b => b.status === 'open' || b.status === 'in_progress');
  const prompt = formatPrompt(bugs);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <Button style="secondary" size="lg" icon={Sparkles} onClick={() => setOpen(true)}>
        AI Баг-репорт
      </Button>

      <Dialog isOpen={open} onClose={() => setOpen(false)} title="AI Prompt Generator" size="md">
        <div className="flex flex-col gap-[16px]">

          {/* Info line */}
          <p className="text-[13px] text-[#9a9a9a]">
            Зібрано{' '}
            <strong className="text-[#1f1f1f]">{active.length}</strong>{' '}
            активних багів (open + in_progress). Скопіюйте нижче і вставте в AI-помічника.
          </p>

          {/* Prompt textarea */}
          <Textarea
            readOnly
            value={prompt}
            rows={14}
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
            >
              {copied ? 'Скопійовано!' : 'Копіювати'}
            </Button>
            <Button style="secondary" size="lg" onClick={() => setOpen(false)}>
              Закрити
            </Button>
          </div>

        </div>
      </Dialog>
    </>
  );
}

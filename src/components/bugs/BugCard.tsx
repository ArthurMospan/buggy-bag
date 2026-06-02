'use client';
import { Bug, BugStatus, BugSeverity } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { uk } from 'date-fns/locale';
import { Check } from 'lucide-react';

const STATUS_DOT: Record<BugStatus, string> = {
  open:        '#6366f1',
  in_progress: '#f97316',
  resolved:    '#10b981',
  closed:      '#9a9a9a',
};

const STATUS_LABEL: Record<BugStatus, string> = {
  open:        'Новий',
  in_progress: 'В роботі',
  resolved:    'Виправлено',
  closed:      'Закрито',
};

const SEV_COLOR: Record<BugSeverity, string> = {
  critical: '#dc2626',
  high:     '#f97316',
  medium:   '#f59e0b',
  low:      '#9a9a9a',
};

interface BugCardProps {
  bug: Bug;
  selected?: boolean;
  onClick: () => void;
  onSelect?: (e: React.MouseEvent) => void;
}

export default function BugCard({ bug, selected, onClick, onSelect }: BugCardProps) {
  const timeAgo = formatDistanceToNow(new Date(bug.created_at), { addSuffix: true, locale: uk });
  const sev = bug.severity ?? 'low';

  return (
    <div
      onClick={onClick}
      className="bg-white border rounded-[16px] overflow-hidden cursor-pointer transition-all duration-150 flex flex-col relative"
      style={{
        borderColor: selected ? '#6366f1' : '#e9e9e9',
        boxShadow: selected ? '0 0 0 3px rgba(99,102,241,0.15)' : undefined,
      }}
    >
      {onSelect && (
        <button
          type="button"
          onClick={onSelect}
          className="absolute top-[8px] left-[8px] z-10"
          style={{
            width: '22px', height: '22px', borderRadius: '6px',
            background: selected ? '#6366f1' : 'rgba(255,255,255,0.9)',
            border: selected ? '2px solid #6366f1' : '1.5px solid rgba(0,0,0,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {selected && <Check size={12} color="white" strokeWidth={3} />}
        </button>
      )}

      <div className="w-full h-[140px] bg-[#f4f4f5] overflow-hidden relative shrink-0">
        {bug.image_url ? (
          <img src={bug.image_url} alt="Bug screenshot" className="w-full h-full object-cover object-top" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-[12px] font-semibold text-[#cfcfcf]">Без скріншота</span>
          </div>
        )}
        <div className="absolute bottom-[8px] right-[8px] text-white text-[10px] font-bold px-[7px] py-[2px] rounded-full"
          style={{ background: SEV_COLOR[sev] }}>
          {sev}
        </div>
      </div>

      <div className="p-[12px] flex flex-col gap-[6px] flex-1">
        <div className="flex items-center gap-[6px]">
          <div className="w-[7px] h-[7px] rounded-full shrink-0" style={{ background: STATUS_DOT[bug.status] }} />
          <span className="text-[11px] font-bold" style={{ color: STATUS_DOT[bug.status] }}>
            {STATUS_LABEL[bug.status]}
          </span>
          <span className="text-[10px] text-[#cfcfcf] ml-auto">{timeAgo}</span>
        </div>
        {bug.description ? (
          <p className="text-[12px] text-[#1f1f1f] font-semibold line-clamp-2 leading-relaxed">{bug.description}</p>
        ) : (
          <p className="text-[12px] text-[#cfcfcf] italic">Без опису</p>
        )}
        {bug.tech_context?.component && (
          <span className="text-[10px] font-mono text-[#9a9a9a] bg-[#f4f4f5] px-[6px] py-[2px] rounded-[4px] self-start">
            {bug.tech_context.component.name}
          </span>
        )}
      </div>
    </div>
  );
}

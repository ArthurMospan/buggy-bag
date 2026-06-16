'use client';
import { Bug, BugStatus, BugSeverity } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { uk } from 'date-fns/locale';
import { Check } from 'lucide-react';

const STATUS_DOT: Record<BugStatus, string> = {
  open:        '#71717a',
  in_progress: '#fb923c',
  resolved:    '#34d399',
  closed:      '#71717a',
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
      className={`rounded-[20px] overflow-hidden cursor-pointer transition-all duration-200 flex flex-col relative
        ${selected ? 'bg-[#e4e4e5]' : 'bg-[#f4f4f5] hover:bg-[#ececec]'}`}
    >
      {onSelect && (
        <button
          type="button"
          onClick={onSelect}
          className="absolute top-[8px] left-[8px] z-10"
          style={{
            width: '22px', height: '22px', borderRadius: '8px',
            background: selected ? '#1f1f1f' : 'rgba(255,255,255,0.8)',
            border: selected ? 'none' : '1px solid rgba(0,0,0,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(4px)',
            transition: 'all 0.2s ease',
          }}
        >
          {selected && <Check size={14} color="white" strokeWidth={3} />}
        </button>
      )}

      <div className="w-full h-[130px] bg-[#f4f4f5] overflow-hidden relative shrink-0">
        {bug.image_url ? (
          <img src={bug.image_url} alt="Bug screenshot" className="w-full h-full object-cover object-top opacity-90" crossOrigin="anonymous" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-[11px] font-medium text-[#9a9a9a]">Без скріншота</span>
          </div>
        )}
        <div className="absolute bottom-[8px] right-[8px] text-white text-[9px] font-bold px-[7px] py-[2px] rounded-full"
          style={{ background: SEV_COLOR[sev] }}>
          {sev}
        </div>
      </div>

      <div className="p-[14px] flex flex-col gap-[6px] flex-1">
        <div className="flex items-center gap-[6px]">
          <div className="w-[8px] h-[8px] rounded-full shrink-0" style={{ background: STATUS_DOT[bug.status] }} />
          <span className="text-[12px] font-semibold" style={{ color: STATUS_DOT[bug.status] }}>
            {STATUS_LABEL[bug.status]}
          </span>
          <span className="text-[11px] text-[#9a9a9a] ml-auto">{timeAgo}</span>
        </div>
        {bug.description ? (
          <p className="text-[13px] text-[#3f3f46] font-normal line-clamp-3 leading-relaxed mt-1">{bug.description}</p>
        ) : (
          <p className="text-[13px] text-[#9a9a9a] italic mt-1">Без опису</p>
        )}
        {bug.tech_context?.component && (
          <span className="text-[11px] font-mono text-[#52525b] bg-[#e4e4e7] px-[6px] py-[2px] rounded-[6px] self-start mt-2">
            {bug.tech_context.component.name}
          </span>
        )}
      </div>
    </div>
  );
}

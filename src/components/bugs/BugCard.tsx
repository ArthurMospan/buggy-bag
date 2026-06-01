'use client';
import { Bug, BugStatus } from '@/lib/types';
import Badge from '@/components/ui/DataDisplay/Badge';
import { formatDistanceToNow } from 'date-fns';
import { uk } from 'date-fns/locale';
import { Pin } from 'lucide-react';

const STATUS_CFG: Record<BugStatus, { label: string; variant: 'info' | 'warning' | 'success' | 'default' }> = {
  open:        { label: 'Open',        variant: 'info' },
  in_progress: { label: 'In Progress', variant: 'warning' },
  resolved:    { label: 'Resolved',    variant: 'success' },
  closed:      { label: 'Closed',      variant: 'default' },
};

interface BugCardProps {
  bug: Bug;
  onClick: () => void;
}

export default function BugCard({ bug, onClick }: BugCardProps) {
  const cfg = STATUS_CFG[bug.status] ?? STATUS_CFG.open;
  const pinCount = bug.json_annotations?.length ?? 0;
  const timeAgo = formatDistanceToNow(new Date(bug.created_at), { addSuffix: true, locale: uk });

  return (
    <div
      onClick={onClick}
      className="bg-white border border-[#e9e9e9] rounded-[16px] overflow-hidden cursor-pointer hover:border-[#cfcfcf] hover:ring-4 hover:ring-[#1f1f1f]/5 transition-all duration-200 flex flex-col"
    >
      {/* Screenshot thumbnail */}
      <div className="w-full h-[160px] bg-[#f4f4f5] overflow-hidden relative shrink-0">
        {bug.image_url ? (
          <img
            src={bug.image_url}
            alt="Bug screenshot"
            className="w-full h-full object-cover object-top"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-[12px] font-semibold text-[#cfcfcf]">Без скріншота</span>
          </div>
        )}
        {/* Pin count badge */}
        {pinCount > 0 && (
          <div className="absolute top-[8px] right-[8px] flex items-center gap-[4px] bg-black/50 text-white text-[10px] font-bold px-[8px] py-[3px] rounded-full backdrop-blur-sm">
            <Pin size={9} />
            {pinCount}
          </div>
        )}
      </div>

      {/* Card body */}
      <div className="p-[14px] flex flex-col gap-[8px] flex-1">
        <div className="flex items-center justify-between gap-[8px]">
          <Badge variant={cfg.variant} size="sm">{cfg.label}</Badge>
          <span className="text-[10px] font-semibold text-[#cfcfcf] shrink-0">{timeAgo}</span>
        </div>

        <div>
          <div className="text-[11px] font-bold text-[#9a9a9a] uppercase tracking-wider mb-[3px]">
            {bug.project_id}
          </div>
          {bug.description ? (
            <p className="text-[12px] text-[#1f1f1f] font-semibold line-clamp-2 leading-relaxed">
              {bug.description}
            </p>
          ) : (
            <p className="text-[12px] text-[#cfcfcf] font-semibold italic">Без опису</p>
          )}
        </div>
      </div>
    </div>
  );
}

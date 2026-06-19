'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Check, ArrowRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { uk } from 'date-fns/locale';
import { STATUS_CFG, SEVERITY_CFG } from '@/lib/constants';

interface BugCardProps {
  bug: any;
  isChecked?: boolean;
  toggleSelectBug?: (id: string) => void;
  handleInlineUpdate?: (bugId: string, field: 'status' | 'severity', value: string) => void;
  projectId?: string;
  projectName?: string; // added to show project name in dashboard
  className?: string;
  onClick?: () => void;
}

export default function BugCard({ bug, isChecked = false, toggleSelectBug, handleInlineUpdate, projectId, projectName, className = '', onClick }: BugCardProps) {
  const [openDropdown, setOpenDropdown] = useState<'status' | 'severity' | null>(null);

  const statusCfg = STATUS_CFG.find(s => s.value === bug.status) || STATUS_CFG[0];
  const sevCfg = SEVERITY_CFG.find(s => s.value === (bug.severity ?? '1')) || SEVERITY_CFG[0];

  let hasPin = false;
  let pinX = 50;
  let pinY = 50;
  if (bug.json_annotations && bug.json_annotations.length > 0) {
    const ann = bug.json_annotations[0];
    if (typeof ann.x === 'number' && typeof ann.y === 'number') {
      pinX = Math.max(0, Math.min(100, ann.x));
      pinY = Math.max(0, Math.min(100, ann.y));
      hasPin = true;
    }
  }

  const pinCount = bug.json_annotations?.length || bug.json_shapes?.filter((s: any) => s.type === 'pin').length || 0;

  return (
    <div
      onClick={() => {
        if (toggleSelectBug) toggleSelectBug(bug.id);
        else if (onClick) onClick();
      }}
      className={`group/card shrink-0 ${toggleSelectBug || onClick ? 'cursor-pointer' : ''} transition-colors duration-300 ease-out rounded-[18px] h-[193px] p-[2px] ${
        isChecked ? 'bg-[#4F46E5]' : 'bg-transparent hover:bg-[#e9e9e9]'
      } ${className}`}
    >
      {/* Outer wrapper: the ONLY way to fix jagged subpixel bleed 100% reliably in all browsers is an inner shadow/ring that covers the exact border edge. */}
      <div className="relative w-full h-full rounded-[16px] overflow-hidden isolate bg-[#f4f4f5] transform-gpu">
        
        {/* Anti-aliasing / Border mask for the image - fixes jagged edges! Made lighter per request */}
        <div className="absolute inset-0 rounded-[16px] ring-1 ring-inset ring-black/5 pointer-events-none z-30" />

        {/* Image Section */}
        <div className="absolute inset-0 bottom-[44px] overflow-hidden bg-[#fafafa]">
          {bug.image_url ? (
            <img
              src={bug.image_url}
              alt="Screenshot"
              crossOrigin="anonymous"
              className="w-full h-full object-cover transition-transform duration-500 ease-out"
              style={hasPin ? {
                objectPosition: `${pinX}% ${pinY}%`,
                transformOrigin: `${pinX}% ${pinY}%`,
                transform: `translate(calc(50% - ${pinX}%), calc(50% - ${pinY}%)) scale(3)`
              } : {
                objectPosition: 'left top'
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[#9a9a9a] text-[12px]">Без скріншоту</div>
          )}
        </div>

        {/* Selection Tint */}
        <div className={`absolute inset-0 transition-all duration-200 pointer-events-none z-20 ${isChecked ? 'bg-[#4F46E5]/10' : 'bg-transparent'}`} />

        {/* Checkbox (Top-Left) */}
        {toggleSelectBug && (
          <div className={`absolute top-[16px] left-[16px] w-[20px] h-[20px] rounded-[6px] flex items-center justify-center transition-all duration-300 z-40 ${
            isChecked ? 'bg-[#4F46E5] border-none' : 'bg-black/20 border border-white/30 backdrop-blur-md group-hover/card:bg-black/30 group-hover/card:border-white/50 group-hover/card:scale-110'
          }`}>
            {isChecked ? <Check size={12} strokeWidth={3} className="text-white" /> : <Check size={12} strokeWidth={3} className="text-black/0 group-hover/card:text-black/30 transition-colors duration-300" />}
          </div>
        )}

        {/* Project Name Override (Top-Left) - specifically for Dashboard */}
        {!toggleSelectBug && projectName && (
          <div className="absolute top-[12px] left-[12px] bg-black/40 backdrop-blur-md px-[8px] py-[3px] rounded-[6px] flex items-center gap-[4px] z-40 border border-white/20">
            <span className="w-[5px] h-[5px] rounded-full bg-white/40" />
            <span className="text-[10px] font-bold text-white shadow-sm truncate max-w-[120px]">{projectName}</span>
          </div>
        )}

        {/* Status & Severity (Top-Right) */}
        <div className="absolute top-[16px] right-[16px] z-40 flex items-center gap-[6px] pointer-events-auto">
          {/* Custom Status Dropdown */}
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); if(handleInlineUpdate) setOpenDropdown(prev => prev === 'status' ? null : 'status'); }}
              className="h-[24px] px-[8px] rounded-[6px] flex items-center gap-[6px] text-[11px] font-medium transition-colors hover:bg-black/40 bg-black/30 backdrop-blur-md border border-white/20 text-white"
            >
              <div className="w-[6px] h-[6px] rounded-full" style={{ backgroundColor: statusCfg.color }} />
              {statusCfg.label}
            </button>

            {openDropdown === 'status' && handleInlineUpdate && (
              <>
                <div className="fixed inset-0 z-40 cursor-default" onClick={(e) => { e.stopPropagation(); setOpenDropdown(null); }} />
                <div className="absolute top-[calc(100%+6px)] right-0 w-[140px] bg-[#1f1f1f] border border-[#3f3f46] rounded-[8px] shadow-xl overflow-hidden z-50 py-[4px]">
                  {STATUS_CFG.map(s => (
                    <button
                      key={s.value}
                      onClick={(e) => { e.stopPropagation(); handleInlineUpdate(bug.id, 'status', s.value); setOpenDropdown(null); }}
                      className="w-full text-left px-[12px] py-[6px] text-[12px] font-medium text-white hover:bg-[#3f3f46] transition-colors flex items-center gap-[8px]"
                    >
                      <div className="w-[8px] h-[8px] rounded-full" style={{ backgroundColor: s.color }} />
                      {s.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Custom Priority Dropdown */}
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); if(handleInlineUpdate) setOpenDropdown(prev => prev === 'severity' ? null : 'severity'); }}
              className="h-[24px] px-[8px] rounded-[6px] flex items-center gap-[6px] text-[11px] font-medium transition-colors hover:bg-black/40 bg-black/30 backdrop-blur-md border border-white/20 text-white"
            >
              <div className="w-[6px] h-[6px] rounded-full" style={{ backgroundColor: sevCfg.color }} />
              {sevCfg.label}
            </button>

            {openDropdown === 'severity' && handleInlineUpdate && (
              <>
                <div className="fixed inset-0 z-40 cursor-default" onClick={(e) => { e.stopPropagation(); setOpenDropdown(null); }} />
                <div className="absolute top-[calc(100%+6px)] right-0 w-[80px] bg-[#1f1f1f] border border-[#3f3f46] rounded-[8px] shadow-xl overflow-hidden z-50 py-[4px] max-h-[150px] overflow-y-auto custom-scrollbar">
                  {SEVERITY_CFG.map(s => (
                    <button
                      key={s.value}
                      onClick={(e) => { e.stopPropagation(); handleInlineUpdate(bug.id, 'severity', s.value); setOpenDropdown(null); }}
                      className="w-full text-left px-[12px] py-[6px] text-[12px] font-medium text-white hover:bg-[#3f3f46] transition-colors flex items-center gap-[8px]"
                    >
                      <div className="w-[8px] h-[8px] rounded-full" style={{ backgroundColor: s.color }} />
                      {s.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Bottom Strip (Сіра підложка) */}
        <div className="absolute bottom-0 left-0 right-0 h-[44px] bg-[#f4f4f5] border-t border-black/5 flex items-center justify-between px-[12px] z-20">
          
          {/* Date & Pin Count */}
          <div className="flex items-center gap-[6px]">
            <span className="text-[#71717a] text-[11px] font-medium">
              {formatDistanceToNow(new Date(bug.created_at), { addSuffix: true, locale: uk })}
            </span>
            <div className="w-[4px] h-[4px] rounded-full bg-[#d4d4d8]" />
            <span className="text-[#71717a] text-[11px] font-medium">
              {pinCount} міток
            </span>
          </div>

          {/* Details Button - gray default, #1f1f1f on hover */}
          <Link
            href={`/projects/${projectId || bug.project_id}/bugs/${bug.id}`}
            onClick={e => e.stopPropagation()}
            className="group/details pointer-events-auto shrink-0 bg-[#e4e4e7] hover:bg-[#1f1f1f] text-[#52525b] hover:text-white transition-colors h-[28px] px-[12px] rounded-[6px] flex items-center justify-center gap-[6px] font-semibold text-[11px]"
          >
            <span className="leading-none pt-[1px]">Деталі</span>
            <ArrowRight size={12} className="text-[#52525b] group-hover/details:text-white transition-colors" strokeWidth={2} />
          </Link>
        </div>
      </div>
    </div>
  );
}

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

  let normalizedSeverity = bug.severity as string;
  if (['low', 'medium', 'high', 'critical'].includes(normalizedSeverity)) {
    if (normalizedSeverity === 'low') normalizedSeverity = '1';
    else if (normalizedSeverity === 'medium') normalizedSeverity = '5';
    else if (normalizedSeverity === 'high') normalizedSeverity = '8';
    else if (normalizedSeverity === 'critical') normalizedSeverity = '10';
  }
  normalizedSeverity = normalizedSeverity ?? '1';

  const sevCfg = SEVERITY_CFG.find(s => s.value === normalizedSeverity) || SEVERITY_CFG[0];

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
      className={`group/card shrink-0 ${toggleSelectBug || onClick ? 'cursor-pointer' : ''} transition-all duration-300 ease-out rounded-[20px] h-[189px] p-[4px] relative z-10 hover:z-30 ${
        isChecked ? 'bg-[#4F46E5]' : 'bg-transparent hover:bg-[#F0F0F0]'
      } ${className}`}
    >
      {/* Outer wrapper */}
      <div className={`relative w-full h-full rounded-[16px] isolate bg-[#f4f4f5] bg-clip-padding transform-gpu border border-solid transition-all duration-300 ${
        isChecked ? 'border-transparent' : 'border-[#ededed] group-hover/card:border-transparent'
      }`}>

        {/* Image Section */}
        <div className="absolute inset-0 bottom-[44px] overflow-hidden bg-[#fafafa] rounded-t-[16px]">
          {bug.image_url ? (
            <img
              src={bug.image_url}
              alt="Screenshot"
              crossOrigin="anonymous"
              className="w-full h-full object-cover transition-transform duration-500 ease-out rounded-t-[16px]"
              style={hasPin ? {
                objectPosition: `${pinX}% ${pinY}%`,
                transformOrigin: `${pinX}% ${pinY}%`,
                transform: `translate(calc(50% - ${pinX}%), calc(50% - ${pinY}%)) scale(2)`
              } : {
                objectPosition: 'left top'
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[#9a9a9a] text-[12px]">Без скріншоту</div>
          )}
        </div>

        {/* Gradient Overlay */}
        <div 
          className="absolute -inset-px pointer-events-none z-10 rounded-[16px]"
          style={{ background: 'linear-gradient(180deg, rgba(115, 115, 115, 0.30) 0%, rgba(217, 217, 217, 0.00) 19.05%)' }}
        />

        {/* Route Overlay (Hover) */}
        {bug.tech_context?.route && (
          <div className="absolute bottom-[52px] left-[12px] opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 z-30 pointer-events-none max-w-[180px]">
            <span className="bg-black/40 backdrop-blur-sm px-[6px] py-[2px] rounded-[4px] text-white/90 text-[9px] font-mono tracking-wider truncate block text-left">
              ...{bug.tech_context.route.slice(-25)}
            </span>
          </div>
        )}

        {/* Selection Tint */}
        <div className={`absolute inset-0 transition-all duration-200 pointer-events-none z-20 ${isChecked ? 'bg-[#4F46E5]/10' : 'bg-transparent'}`} />

        {/* Top-Left Badges (Severity & Status) */}
        <div className="absolute top-[16px] left-[16px] z-40 flex items-center gap-[4px] pointer-events-auto">
          {/* Severity Badge */}
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); if(handleInlineUpdate) setOpenDropdown(prev => prev === 'severity' ? null : 'severity'); }}
              disabled={!handleInlineUpdate}
              className="w-[20px] h-[20px] rounded-[6px] flex items-center justify-center text-[10px] font-bold text-white backdrop-blur-[4px] border border-black/10 transition-transform hover:scale-105 active:scale-95 cursor-pointer disabled:cursor-default tabular-nums"
              style={{ 
                lineHeight: '1',
                backgroundColor: (() => {
                  const num = parseInt(normalizedSeverity) || 1;
                  const colors: Record<number, string> = {
                    1: 'rgba(52, 211, 153, 0.85)',   // Emerald
                    2: 'rgba(16, 185, 129, 0.85)',   // Green
                    3: 'rgba(14, 165, 233, 0.85)',   // Sky
                    4: 'rgba(59, 130, 246, 0.85)',   // Blue
                    5: 'rgba(99, 102, 241, 0.85)',   // Indigo
                    6: 'rgba(168, 85, 247, 0.85)',   // Purple
                    7: 'rgba(236, 72, 153, 0.85)',   // Pink
                    8: 'rgba(245, 158, 11, 0.85)',   // Amber
                    9: 'rgba(249, 115, 22, 0.85)',   // Orange
                    10: 'rgba(255, 96, 75, 0.85)',   // Red
                  };
                  return colors[num] || colors[1];
                })()
              }}
            >
              {sevCfg.label}
            </button>

            {openDropdown === 'severity' && handleInlineUpdate && (
              <>
                <div className="fixed inset-0 z-40 cursor-default" onClick={(e) => { e.stopPropagation(); setOpenDropdown(null); }} />
                {/* 5x2 Grid for Severity dropdown */}
                 <div className="absolute top-[calc(100%+6px)] left-0 w-[148px] bg-[#1f1f1f] border border-[#3f3f46] rounded-[10px] shadow-xl z-50 p-[6px] grid grid-cols-5 gap-[4px] transform origin-top-left transition-all">
                  {Array.from({ length: 10 }, (_, i) => {
                    const num = i + 1;
                    const colors: Record<number, string> = {
                      1: 'rgba(52, 211, 153, 0.85)',
                      2: 'rgba(16, 185, 129, 0.85)',
                      3: 'rgba(14, 165, 233, 0.85)',
                      4: 'rgba(59, 130, 246, 0.85)',
                      5: 'rgba(99, 102, 241, 0.85)',
                      6: 'rgba(168, 85, 247, 0.85)',
                      7: 'rgba(236, 72, 153, 0.85)',
                      8: 'rgba(245, 158, 11, 0.85)',
                      9: 'rgba(249, 115, 22, 0.85)',
                      10: 'rgba(255, 96, 75, 0.85)',
                    };
                    const bgCol = colors[num];
                    return (
                      <button
                        key={num}
                        onClick={(e) => { e.stopPropagation(); handleInlineUpdate(bug.id, 'severity', num.toString()); setOpenDropdown(null); }}
                        className="w-[24px] h-[24px] rounded-[4px] text-[10px] font-bold text-white flex items-center justify-center hover:scale-115 active:scale-90 transition-transform cursor-pointer"
                        style={{ backgroundColor: bgCol }}
                      >
                        {num}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Status Badge */}
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); if(handleInlineUpdate) setOpenDropdown(prev => prev === 'status' ? null : 'status'); }}
              disabled={!handleInlineUpdate}
              className="h-[20px] px-[6px] rounded-[6px] flex items-center justify-center text-[10px] font-semibold text-white backdrop-blur-[4px] border border-black/10 transition-transform hover:scale-105 active:scale-95 cursor-pointer disabled:cursor-default"
              style={{ 
                backgroundColor: statusCfg.color
              }}
            >
              {statusCfg.label}
            </button>

            {openDropdown === 'status' && handleInlineUpdate && (
              <>
                <div className="fixed inset-0 z-40 cursor-default" onClick={(e) => { e.stopPropagation(); setOpenDropdown(null); }} />
                <div className="absolute top-[calc(100%+6px)] left-0 w-[140px] bg-[#1f1f1f] border border-[#3f3f46] rounded-[8px] shadow-xl overflow-hidden z-50 py-[4px]">
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
        </div>

        {/* Checkbox (Top-Right) */}
        {toggleSelectBug && (
          <div 
            onClick={(e) => { e.stopPropagation(); toggleSelectBug(bug.id); }}
            className={`absolute top-[16px] right-[16px] w-[20px] h-[20px] rounded-[7px] flex items-center justify-center transition-all duration-300 z-40 cursor-pointer backdrop-blur-[4px] ring-1 ring-inset ${
            isChecked ? 'bg-[#4F46E5] ring-transparent' : 'bg-black/40 ring-white/50'
          }`}>
            {isChecked ? (
              <Check size={13} strokeWidth={3.5} className="text-white" />
            ) : (
              <Check size={13} strokeWidth={3} className="text-white/40 md:text-white/0 group-hover/card:text-white/80 transition-colors duration-300" />
            )}
          </div>
        )}

        {/* Project Name Override (Top-Right) - specifically for Dashboard if checkbox is absent */}
        {!toggleSelectBug && projectName && (
          <Link
            href={`/projects/${projectId || bug.project_id}`}
            onClick={e => e.stopPropagation()}
            className="absolute top-[16px] right-[16px] bg-black/40 hover:bg-black/60 backdrop-blur-md px-[8px] py-[3px] rounded-[6px] flex items-center gap-[4px] z-40 border border-white/20 cursor-pointer transition-colors duration-150"
          >
            <span className="w-[5px] h-[5px] rounded-full bg-white/40" />
            <span className="text-[10px] font-bold text-white shadow-sm truncate max-w-[120px]">{projectName}</span>
          </Link>
        )}

        {/* Bottom Strip (Footer) */}
        <div className="absolute bottom-0 left-0 right-0 h-[44px] backdrop-blur-[4px] bg-[#f4f4f5]/85 border-t border-[rgba(237,237,237,0.7)] flex items-center justify-between px-[16px] z-20 rounded-bl-[16px] rounded-br-[16px]">
          
          <div className="flex flex-col justify-center gap-[2px]">
            {/* Bug ID Text */}
            <span className="text-[#1f1f1f] text-[12px] font-bold font-mono tracking-wider leading-none pointer-events-none">
              {bug.human_id || bug.id.split('-')[0]}
            </span>

            {/* Date & Pin Count */}
            <div className="flex items-center gap-[4px]">
              <span className="text-[#8b8b92] text-[10px] font-normal leading-none">
                {formatDistanceToNow(new Date(bug.created_at), { addSuffix: true, locale: uk })}
              </span>
              <span className="text-[#c2c2c2] text-[10px] font-thin leading-none">
                •
              </span>
              <span className="text-[#8b8b92] text-[10px] font-normal leading-none">
                {pinCount} міток
              </span>
            </div>
          </div>

          {/* Details Button */}
          <Link
            href={`/projects/${projectId || bug.project_id}/bugs/${bug.id}`}
            onClick={e => e.stopPropagation()}
            className="group/details pointer-events-auto shrink-0 bg-[#e4e4e7] hover:bg-[#1f1f1f] text-[#52525b] hover:text-white transition-all duration-200 h-[20px] px-[6px] rounded-[4px] flex items-center justify-center gap-[4px] font-semibold text-[10px]"
          >
            <span className="leading-none">Деталі</span>
            <ArrowRight size={10} className="text-[#52525b] group-hover/details:text-white transition-colors" strokeWidth={2} />
          </Link>
        </div>
      </div>
    </div>
  );
}

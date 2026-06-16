'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Settings, Bug } from 'lucide-react';

export default function ProjectTabs({ projectId }: { projectId: string }) {
  const pathname = usePathname();
  const isIntegration = pathname.endsWith('/integration');

  return (
    <div className="flex items-center gap-[3px] bg-[#f4f4f5] p-[3px] rounded-[10px] shrink-0">
      <Link
        href={`/projects/${projectId}`}
        className={`flex items-center gap-[6px] px-[13px] py-[6px] rounded-[7px] text-[12px] font-semibold transition-all ${
          !isIntegration
            ? 'bg-white text-[#1f1f1f] shadow-sm'
            : 'text-[#9a9a9a] hover:text-[#1f1f1f] hover:bg-white/50'
        }`}
      >
        <Bug size={14} />
        Баги
      </Link>
      <Link
        href={`/projects/${projectId}/integration`}
        className={`flex items-center gap-[6px] px-[13px] py-[6px] rounded-[7px] text-[12px] font-semibold transition-all ${
          isIntegration
            ? 'bg-white text-[#1f1f1f] shadow-sm'
            : 'text-[#9a9a9a] hover:text-[#1f1f1f] hover:bg-white/50'
        }`}
      >
        <Settings size={14} />
        Налаштування
      </Link>
    </div>
  );
}

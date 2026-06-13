'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Settings, Bug } from 'lucide-react';

export default function ProjectTabs({ projectId }: { projectId: string }) {
  const pathname = usePathname();
  const isIntegration = pathname.endsWith('/integration');

  return (
    <div className="flex items-center gap-[4px] bg-[#f4f4f5] p-[4px] rounded-[12px] shrink-0">
      <Link href={`/projects/${projectId}`}
        className={`flex items-center gap-[6px] px-[14px] py-[8px] rounded-[8px] text-[13px] font-semibold transition-colors ${!isIntegration ? 'bg-white shadow-sm text-[#1f1f1f]' : 'text-[#9a9a9a] hover:text-[#1f1f1f]'}`}>
        <Bug size={16} />
        Баги
      </Link>
      <Link href={`/projects/${projectId}/integration`}
        className={`flex items-center gap-[6px] px-[14px] py-[8px] rounded-[8px] text-[13px] font-semibold transition-colors ${isIntegration ? 'bg-white shadow-sm text-[#1f1f1f]' : 'text-[#9a9a9a] hover:text-[#1f1f1f]'}`}>
        <Settings size={16} />
        Налаштування
      </Link>
    </div>
  );
}

'use client';
import { Bug, LayoutDashboard, LogOut, Plug } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import Button from '@/components/ui/Button';

interface SidebarProps {
  userEmail?: string;
}

export default function Sidebar({ userEmail = '' }: SidebarProps) {
  const pathname = usePathname();
  const params   = useParams<{ id?: string }>();
  const router   = useRouter();
  const projectId = params?.id;

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const isActive = (href: string) => pathname === href;

  return (
    <div className="flex flex-col h-full py-[16px] px-[12px]">

      {/* Logo */}
      <div className="flex items-center gap-[10px] px-[10px] py-[8px] mb-[8px]">
        <div className="w-[28px] h-[28px] bg-[#1f1f1f] rounded-[8px] flex items-center justify-center shrink-0">
          <Bug size={14} className="text-white" />
        </div>
        <span className="text-[14px] font-bold text-[#1f1f1f]">BuggyBag</span>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-[2px] flex-1">

        {/* Projects root */}
        <Link
          href="/"
          className={`flex items-center gap-[10px] px-[12px] py-[9px] rounded-[10px] text-[13px] font-semibold transition-colors ${
            isActive('/') ? 'bg-white text-[#1f1f1f] shadow-sm' : 'text-[#9a9a9a] hover:text-[#1f1f1f] hover:bg-[#ebebeb]'
          }`}
        >
          <LayoutDashboard size={15} />
          Проєкти
        </Link>

        {/* Project sub-nav — only shown when inside a project */}
        {projectId && (
          <div className="flex flex-col gap-[2px] mt-[2px] pl-[8px]">
            <Link
              href={`/projects/${projectId}`}
              className={`flex items-center gap-[10px] px-[12px] py-[8px] rounded-[10px] text-[12px] font-semibold transition-colors ${
                isActive(`/projects/${projectId}`)
                  ? 'bg-white text-[#1f1f1f] shadow-sm'
                  : 'text-[#9a9a9a] hover:text-[#1f1f1f] hover:bg-[#ebebeb]'
              }`}
            >
              <Bug size={13} />
              Баги
            </Link>
            <Link
              href={`/projects/${projectId}/setup`}
              className={`flex items-center gap-[10px] px-[12px] py-[8px] rounded-[10px] text-[12px] font-semibold transition-colors ${
                isActive(`/projects/${projectId}/setup`)
                  ? 'bg-white text-[#1f1f1f] shadow-sm'
                  : 'text-[#9a9a9a] hover:text-[#1f1f1f] hover:bg-[#ebebeb]'
              }`}
            >
              <Plug size={13} />
              Інтеграція
            </Link>
          </div>
        )}
      </nav>

      {/* User section */}
      <div className="border-t border-[#e9e9e9] pt-[12px] mt-[12px]">
        {userEmail && (
          <p className="text-[11px] font-semibold text-[#9a9a9a] px-[12px] mb-[8px] truncate">
            {userEmail}
          </p>
        )}
        <Button
          style="ghost"
          size="sm"
          icon={LogOut}
          onClick={handleLogout}
          className="w-full justify-start px-[12px]"
        >
          Вийти
        </Button>
      </div>

    </div>
  );
}

'use client';
import { useEffect, useState } from 'react';
import { Bug, LogOut, Plus, FolderOpen } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import type { Project } from '@/lib/types';

interface SidebarProps {
  userEmail?: string;
}

export default function Sidebar({ userEmail = '' }: SidebarProps) {
  const pathname  = usePathname();
  const router    = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    fetch('/api/projects')
      .then(r => r.json())
      .then(d => setProjects(d.projects ?? []));
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const activeProjectId = pathname.match(/\/projects\/([^/]+)/)?.[1];

  return (
    <div className="flex flex-col h-full py-[16px] px-[12px]">

      {/* Logo */}
      <Link href="/" className="flex items-center gap-[10px] px-[10px] py-[8px] mb-[12px] hover:opacity-70 transition-opacity">
        <div className="w-[28px] h-[28px] shrink-0">
          <img src="/bug-logo.svg" alt="BuggyBag Logo" width={28} height={28} />
        </div>
        <span className="text-[14px] font-bold text-[#1f1f1f]">BuggyBag</span>
      </Link>

      {/* Project list */}
      <p className="text-[10px] font-bold text-[#9a9a9a] uppercase tracking-wider px-[10px] mb-[6px]">
        Проєкти
      </p>

      <nav className="flex flex-col gap-[2px] flex-1 overflow-y-auto">
        {projects.map(p => {
          const isActive = activeProjectId === p.id;
          return (
            <Link
              key={p.id}
              href={`/projects/${p.id}`}
              className={`flex items-center gap-[8px] px-[10px] py-[8px] rounded-[10px] text-[13px] font-semibold transition-colors ${
                isActive
                  ? 'bg-[#f0f0f0] text-[#1f1f1f]'
                  : 'text-[#9a9a9a] hover:text-[#1f1f1f] hover:bg-[#ebebeb]'
              }`}
            >
              <FolderOpen size={14} className="shrink-0" />
              <span className="truncate flex-1">{p.name}</span>
            </Link>
          );
        })}

        <Link
          href="/?new=1"
          className="flex items-center gap-[8px] px-[10px] py-[8px] rounded-[10px] text-[12px] font-semibold text-[#9a9a9a] hover:text-[#1f1f1f] hover:bg-[#ebebeb] transition-colors mt-[4px]"
        >
          <Plus size={13} />
          Новий проєкт
        </Link>
      </nav>

      {/* User section */}
      <div className="border-t border-[#e9e9e9] pt-[12px] mt-[12px]">
        {userEmail && (
          <p className="text-[11px] font-semibold text-[#9a9a9a] px-[10px] mb-[8px] truncate">
            {userEmail}
          </p>
        )}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-[8px] px-[10px] py-[7px] rounded-[10px] text-[12px] font-semibold text-[#9a9a9a] hover:text-[#1f1f1f] hover:bg-[#ebebeb] transition-colors"
        >
          <LogOut size={13} />
          Вийти
        </button>
      </div>

    </div>
  );
}

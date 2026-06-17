'use client';
import { useEffect, useState, useRef } from 'react';
import { Plus, LogOut, User, ChevronUp, Folder } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import type { Project } from '@/lib/types';
import Dialog from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

interface SidebarProps {
  userEmail?: string;
  userName?: string;
  userAvatar?: string;
}

function ProjectRow({ project, isActive, onClick }: { project: Project; isActive: boolean; onClick: () => void }) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const lastRead = localStorage.getItem(`BUGGY_BAG_LAST_READ_${project.id}`);
    fetch(`/api/bugs?project_id=${project.id}`)
      .then(res => res.json())
      .then(data => {
        if (data.bugs) {
          const unread = lastRead
            ? data.bugs.filter((b: any) => new Date(b.created_at) > new Date(lastRead))
            : data.bugs;
          setUnreadCount(unread.length);
        }
      })
      .catch(() => {});
  }, [project.id]);

  useEffect(() => {
    if (isActive) {
      localStorage.setItem(`BUGGY_BAG_LAST_READ_${project.id}`, new Date().toISOString());
      // We don't strictly need to set unreadCount to 0 synchronously here,
      // but if we do, it shouldn't cause infinite renders if we just depend on isActive/project.id
      // A better way is to clear it and rely on the next fetch
      setUnreadCount(0);
    }
  }, [isActive, project.id]);

  return (
    <div
      className={`relative group w-full flex items-center gap-[10px] px-[12px] py-[12px] cursor-pointer rounded-[12px] transition-colors ${
        isActive ? 'bg-[#242424]' : 'bg-transparent hover:bg-[#242424]'
      }`}
      onClick={onClick}
      title={project.name}
    >
      {/* Icon */}
      <div 
        className={`w-[32px] h-[32px] flex items-center justify-center rounded-[8px] shrink-0 overflow-hidden ${
          isActive ? 'bg-[#333333]' : 'bg-[#242424]'
        }`}
      >
        {project.favicon_url ? (
          <img src={project.favicon_url} alt="Favicon" width={18} height={18} className="rounded-sm object-contain" />
        ) : (
          <Folder size={16} className={isActive ? 'text-white' : 'text-[#9a9a9a]'} />
        )}
      </div>

      {/* Name and domain */}
      <div className="flex-1 min-w-0 flex flex-col justify-center gap-[2px]">
        <span className={`text-[14px] leading-[20px] font-normal truncate ${isActive ? 'text-white' : 'text-[#9a9a9a]'}`}>
          {project.name}
        </span>
        <span className="text-[10px] leading-[16px] text-[#666] font-normal truncate">
          {project.connected_domain ? project.connected_domain : 'Не підключено'}
        </span>
      </div>

      {/* Unread Badge */}
      {unreadCount > 0 && !isActive && (
        <div className="shrink-0 bg-[#ef4444] text-white text-[10px] font-bold min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full">
          {unreadCount > 9 ? '9+' : unreadCount}
        </div>
      )}
    </div>
  );
}

export default function Sidebar({ userEmail = '', userName = '', userAvatar = '' }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/projects')
      .then(r => r.json())
      .then(d => setProjects(d.projects ?? []));
  }, []);

  // Close the profile menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newName.trim() || creating) return;
    setCreating(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      });
      const data = await res.json();
      if (data.project) {
        setProjects(prev => [data.project, ...prev]);
        setNewName('');
        setShowNewDialog(false);
        router.push(`/projects/${data.project.id}`);
      }
    } finally {
      setCreating(false);
    }
  };

  const activeProjectId = pathname.match(/\/projects\/([^/]+)/)?.[1];

  return (
    <div className="flex flex-col h-full w-full py-[12px] overflow-y-auto custom-scrollbar relative bg-transparent">

      {/* App Logo */}
      <div className="flex flex-col px-[20px] pt-[12px] pb-[16px] shrink-0 relative">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center min-w-0 flex-1">
            <Link href="/" className="flex items-center justify-center shrink-0 hover:opacity-80 transition-opacity">
              <Image src="/bug-logo-white.svg" alt="BuggyBag Logo" width={32} height={32} className="object-contain" />
            </Link>
            <div className="flex min-w-0 ml-[12px] justify-center">
              <Link href="/" className="hover:opacity-80 transition-opacity flex items-center">
                 <h1 className="text-white text-[20px] font-bold tracking-tight leading-none truncate">BuggyBag</h1>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Projects Header */}
      <div className="flex items-center justify-between px-[20px] mt-[16px] mb-[12px]">
        <span className="text-[10px] font-semibold text-[#666] tracking-[0.1px] uppercase leading-[16px]">
          ПРОЄКТИ
        </span>
        <button
          onClick={() => setShowNewDialog(true)}
          className="text-[#484747] hover:text-white transition-colors flex items-center justify-center"
          title="Додати проєкт"
        >
          <Plus size={16} strokeWidth={2} />
        </button>
      </div>

      {/* Projects List */}
      <div className="flex-1 flex flex-col gap-[2px] px-[12px] mt-0">
        {projects.map(p => (
          <ProjectRow
            key={p.id}
            project={p}
            isActive={activeProjectId === p.id}
            onClick={() => router.push(`/projects/${p.id}`)}
          />
        ))}
      </div>

      {/* Bottom Profile Menu */}
      {userEmail && (
        <div ref={menuRef} className="px-[20px] pb-0 mt-auto shrink-0 relative">
          {menuOpen && (
            <div className="absolute left-[20px] right-[20px] bottom-[calc(100%+8px)] bg-[#242424] border border-[#333] rounded-[12px] shadow-xl overflow-hidden py-1 z-50">
              <button
                onClick={() => { setMenuOpen(false); router.push('/profile'); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium text-white hover:bg-[#333] transition-colors"
              >
                <User size={14} /> Профіль
              </button>
              <button
                onClick={() => { setMenuOpen(false); if (confirm('Вийти з акаунту?')) handleLogout(); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium text-[#ef4444] hover:bg-[#ef4444]/20 transition-colors"
              >
                <LogOut size={14} /> Вийти
              </button>
            </div>
          )}

          <button
            onClick={() => setMenuOpen(v => !v)}
            className="w-full flex items-center gap-[12px] p-[12px] bg-[#252525] rounded-[12px] hover:bg-[#2a2a2a] transition-colors"
          >
            {userAvatar ? (
              <div className="w-[32px] h-[32px] flex items-center justify-center rounded-full shrink-0 overflow-hidden shadow-sm">
                <img src={userAvatar} alt="Avatar" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-[32px] h-[32px] flex items-center justify-center bg-gradient-to-br from-[#4b5563] to-[#1f2937] text-[#ffffff] font-semibold text-[14px] rounded-full shrink-0 overflow-hidden shadow-sm">
                 {userName ? userName.charAt(0).toUpperCase() : (userEmail ? userEmail.charAt(0).toUpperCase() : <User size={16} />)}
              </div>
            )}
            <div className="flex flex-col flex-1 min-w-0 text-left gap-[2px]">
              <span className="text-[12px] font-normal text-[#9a9a9a] truncate leading-[18px]">{userName || userEmail || 'Користувач'}</span>
              <span className="text-[10px] font-normal text-[#666] truncate leading-[14px]">{userEmail}</span>
            </div>
          </button>
        </div>
      )}

      {/* New Project Dialog */}
      <Dialog
        isOpen={showNewDialog}
        onClose={() => { setShowNewDialog(false); setNewName(''); }}
        title="Новий проєкт"
        size="sm"
      >
        <form onSubmit={handleCreate} className="flex flex-col gap-[12px]">
          <Input
            autoFocus
            type="text"
            placeholder="Назва проєкту"
            value={newName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewName(e.target.value)}
          />
          <div className="flex gap-[8px] pt-[4px]">
            <Button
              type="button"
              style="secondary"
              size="md"
              className="flex-1"
              onClick={() => { setShowNewDialog(false); setNewName(''); }}
            >
              Скасувати
            </Button>
            <Button
              type="submit"
              style="primary"
              size="md"
              className="flex-1"
              disabled={!newName.trim() || creating}
              loading={creating}
            >
              {creating ? 'Створюємо...' : 'Створити'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}

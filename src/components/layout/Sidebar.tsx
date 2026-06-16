'use client';
import { useEffect, useState, useRef } from 'react';
import { Plus, LogOut, User, ChevronUp } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import type { Project } from '@/lib/types';
import Dialog from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

interface SidebarProps {
  userEmail?: string;
}

function ProjectRow({ project, isActive, onClick }: { project: Project; isActive: boolean; onClick: () => void }) {
  const accentColor = project.favicon_color || '#1f1f1f';
  const [unreadCount, setUnreadCount] = useState(0);
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    // Check unread bugs
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
      setUnreadCount(0);
    }
  }, [isActive, project.id]);

  const fallbackLetter = project.name.charAt(0).toUpperCase();

  return (
    <div
      className="relative group w-full flex items-center gap-2.5 pl-3 pr-2.5 py-2 cursor-pointer rounded-lg transition-colors"
      style={{ backgroundColor: isActive ? '#f4f4f5' : 'transparent' }}
      onClick={onClick}
      title={project.name}
      onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.backgroundColor = '#f4f4f5'; }}
      onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.backgroundColor = 'transparent'; }}
    >
      {/* Active indicator — thin left stripe */}
      <div
        className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full transition-all duration-300 ${
          isActive ? 'h-5' : 'h-0'
        }`}
        style={{ backgroundColor: accentColor }}
      />

      {/* Project Icon */}
      <div
        className="w-7 h-7 flex items-center justify-center rounded-[8px] overflow-hidden shrink-0"
        style={{
          backgroundColor: '#f4f4f5',
          color: '#1f1f1f',
        }}
      >
        {project.favicon_url && !showFallback ? (
          <img
            src={project.favicon_url}
            alt={project.name}
            className="w-full h-full object-cover"
            onError={() => setShowFallback(true)}
          />
        ) : (
          <span className="text-[11px] font-bold">{fallbackLetter}</span>
        )}
      </div>

      {/* Name and domain */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <span className={`text-[13px] font-medium truncate ${isActive ? 'text-[#1f1f1f]' : 'text-[#9a9a9a]'}`}>
          {project.name}
        </span>
        <span className={`text-[10px] truncate ${isActive ? 'text-[#71717a]' : 'text-[#a1a1aa]'}`}>
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

export default function Sidebar({ userEmail = '' }: SidebarProps) {
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
    <div className="flex flex-col h-full w-full py-3 overflow-y-auto no-scrollbar relative">

      {/* App Logo */}
      <Link href="/" className="flex items-center gap-2.5 px-3.5 py-1.5 mb-3 shrink-0 group">
        <img src="/bug-logo.svg" alt="Logo" width={24} height={24} className="shrink-0" />
        <span className="text-[15px] font-bold text-[#1f1f1f] truncate">Buggy Bag</span>
      </Link>

      {/* Projects List */}
      <div className="flex-1 flex flex-col gap-0.5 px-2">
        {projects.map(p => (
          <ProjectRow
            key={p.id}
            project={p}
            isActive={activeProjectId === p.id}
            onClick={() => router.push(`/projects/${p.id}`)}
          />
        ))}

        {/* Create Project Row — muted, same shape as a project row */}
        <button
          onClick={() => setShowNewDialog(true)}
          className="flex items-center gap-2.5 pl-3 pr-2.5 py-2 rounded-lg text-[#9a9a9a] hover:text-[#1f1f1f] hover:bg-[#f4f4f5] transition-colors mt-0.5"
        >
          <div className="w-7 h-7 flex items-center justify-center rounded-[8px] border border-[#e9e9e9] shrink-0">
            <Plus size={13} />
          </div>
          <span className="text-[13px] font-medium">Додати проєкт</span>
        </button>
      </div>

      {/* Bottom Profile Menu */}
      {userEmail && (
        <div ref={menuRef} className="mt-2 px-2 shrink-0 relative">
          {menuOpen && (
            <div className="absolute left-2 right-2 bottom-[calc(100%+2px)] bg-[#ffffff] rounded-lg shadow-[0_8px_30px_rgba(0,0,0,0.08)] overflow-hidden py-1 z-50">
              <button
                onClick={() => { setMenuOpen(false); router.push('/profile'); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-[13px] font-medium text-[#1f1f1f] hover:bg-[#f4f4f5] transition-colors"
              >
                <User size={14} /> Профіль
              </button>
              <button
                onClick={() => { setMenuOpen(false); if (confirm('Вийти з акаунту?')) handleLogout(); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-[13px] font-medium text-[#ef4444] hover:bg-[#ef4444]/10 transition-colors"
              >
                <LogOut size={14} /> Вийти
              </button>
            </div>
          )}

          <button
            onClick={() => setMenuOpen(v => !v)}
            className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-[#f4f4f5] transition-colors"
          >
            <div className="w-7 h-7 flex items-center justify-center bg-[#f4f4f5] text-[#1f1f1f] rounded-full shrink-0">
              <User size={14} />
            </div>
            <span className="text-[12px] font-medium text-[#9a9a9a] truncate flex-1 text-left">{userEmail}</span>
            <ChevronUp size={13} className={`text-[#9a9a9a] shrink-0 transition-transform ${menuOpen ? '' : 'rotate-180'}`} />
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

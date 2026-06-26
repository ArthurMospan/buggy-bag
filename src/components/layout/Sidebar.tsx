'use client';
import { useEffect, useState, useRef } from 'react';
import { Plus, LogOut, User, ChevronUp, Folder, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
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
  isCollapsed?: boolean;
  setIsCollapsed?: (val: boolean) => void;
}

function ProjectRow({ project, isActive, onClick, isCollapsed, setHoveredTooltip }: { project: Project; isActive: boolean; onClick: () => void; isCollapsed?: boolean; setHoveredTooltip?: (t: {text: string, top: number} | null) => void }) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchUnreadCount = () => {
      fetch(`/api/bugs?project_id=${project.id}&_nocache=${Date.now()}`)
        .then(res => res.json())
        .then(data => {
          if (data.bugs) {
            const openBugs = data.bugs.filter((b: any) => b.status === 'open');
            setUnreadCount(openBugs.length);
          }
        })
        .catch(() => {});
    };

    fetchUnreadCount();

    // Polling fallback every 5 seconds since postgres_changes is blocked by RLS
    const pollInterval = setInterval(() => {
      fetchUnreadCount();
    }, 5000);

    const supabase = createClient();
    const channelId = `sidebar_unread_${project.id}_${Math.random()}`;
    const channel = supabase.channel(channelId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bugs', filter: `project_id=eq.${project.id}` }, () => {
        fetchUnreadCount();
      })
      .subscribe();

    return () => {
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };
  }, [project.id]);

  return (
    <div
      className={`relative group flex items-center px-[8px] py-[8px] cursor-pointer rounded-[12px] transition-colors shrink-0 ${
        isActive ? 'bg-[#242424]' : 'bg-transparent hover:bg-[#242424]'
      }`}
      onClick={onClick}
      onMouseEnter={(e) => {
        if (isCollapsed && setHoveredTooltip) {
          const rect = e.currentTarget.getBoundingClientRect();
          setHoveredTooltip({ text: project.name, top: rect.top + rect.height / 2 });
        }
      }}
      onMouseLeave={() => setHoveredTooltip?.(null)}
    >
      {/* Icon */}
      <div 
        className={`relative w-[32px] h-[32px] flex items-center justify-center rounded-[8px] shrink-0 overflow-visible transition-colors ${
          isActive ? 'bg-[#333333]' : 'bg-[#242424]'
        }`}
      >
        {project.favicon_url ? (
          <img 
            src={project.favicon_url} 
            alt="" 
            width={18} 
            height={18} 
            className="rounded-sm object-contain" 
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextElementSibling?.classList.remove('hidden');
            }} 
          />
        ) : null}
        <Folder 
          size={16} 
          className={`${project.favicon_url ? 'hidden' : ''} ${isActive ? 'text-white' : 'text-[#9a9a9a]'}`} 
        />

        {/* Unread Badge (Collapsed dot) */}
        <div className={`absolute top-[-4px] right-[-4px] transition-all duration-300 ${isCollapsed && unreadCount > 0 ? 'opacity-100 scale-100' : 'opacity-0 scale-50 pointer-events-none'}`}>
          <div 
            className={`bg-[#ef4444] text-white text-[8px] font-bold flex items-center justify-center border-[2px] border-[#1f1f1f] ${unreadCount > 99 ? 'rounded-[7px] px-[4px] h-[14px]' : 'w-[14px] h-[14px] rounded-full'}`}
            style={{ lineHeight: '1' }}
          >
            {unreadCount}
          </div>
        </div>
      </div>

      {/* Name and domain */}
      <div className={`flex flex-col justify-center overflow-hidden transition-all duration-300 whitespace-nowrap ${isCollapsed ? 'opacity-0 max-w-0 ml-0' : 'opacity-100 max-w-[200px] ml-[12px] flex-1'}`}>
        <span className={`block text-[14px] leading-[20px] font-normal truncate ${isActive ? 'text-white' : 'text-[#9a9a9a]'}`}>
          {project.name}
        </span>
        <span className="block text-[10px] leading-[16px] text-[#666] font-normal truncate">
          {project.connected_domain ? project.connected_domain : 'Не підключено'}
        </span>
      </div>

      {/* Unread Badge (Expanded pill) */}
      <div className={`overflow-hidden transition-all duration-300 flex items-center ${!isCollapsed && unreadCount > 0 ? 'opacity-100 ml-[8px]' : 'opacity-0 w-0 ml-0'}`}>
        <div 
          className={`shrink-0 bg-[#ef4444] text-white text-[10px] font-bold h-[18px] flex items-center justify-center ${unreadCount > 99 ? 'rounded-[9px] px-[5px]' : 'w-[18px] rounded-full'}`}
          style={{ lineHeight: '1' }}
        >
          {unreadCount}
        </div>
      </div>
    </div>
  );
}

export default function Sidebar({ userEmail = '', userName = '', userAvatar = '', isCollapsed = false, setIsCollapsed }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [hoveredTooltip, setHoveredTooltip] = useState<{ text: string; top: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const fetchProjects = () => {
    fetch('/api/projects')
      .then(r => r.json())
      .then(d => setProjects(d.projects ?? []));
  };

  useEffect(() => {
    fetchProjects();

    window.addEventListener('projects-updated', fetchProjects);
    return () => {
      window.removeEventListener('projects-updated', fetchProjects);
    };
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
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch (err) {
      console.error('[Sidebar Logout] Supabase signOut error:', err);
    }
    
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('[Sidebar Logout] API logout error:', err);
    }

    window.location.href = '/login';
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
    <>
      <div className="flex flex-col h-full w-full relative bg-transparent">

        {/* App Logo */}
      <div className={`flex flex-col pt-[24px] pb-[16px] shrink-0 relative transition-all duration-300 ${isCollapsed ? 'px-[12px]' : 'px-[24px]'}`}>
        <div className="flex items-center justify-between w-full h-[32px]">
          <div className="flex items-center min-w-0 flex-1">
            <Link href="/" className={`flex items-center justify-center shrink-0 hover:opacity-80 transition-all duration-300 ${isCollapsed ? 'ml-[8px]' : 'ml-0'}`}>
              <Image src="/bug-logo-white.svg" alt="BuggyBag Logo" width={32} height={32} className="object-contain" />
            </Link>
            <div className={`flex items-center min-w-0 overflow-hidden transition-all duration-300 ${isCollapsed ? 'opacity-0 max-w-0 ml-0' : 'opacity-100 max-w-[200px] ml-[12px]'}`}>
              <Link href="/" className="hover:opacity-80 transition-opacity flex items-center whitespace-nowrap">
                 <h1 className="text-white text-[20px] font-bold tracking-tight leading-none truncate">BuggyBag</h1>
              </Link>
            </div>
          </div>
          
          <button 
            onClick={() => setIsCollapsed?.(!isCollapsed)} 
            className={`text-[#484747] hover:text-white hover:bg-[#242424] rounded-[8px] transition-all duration-300 flex items-center justify-center shrink-0 overflow-hidden ${isCollapsed ? 'opacity-0 max-w-0 pointer-events-none' : 'opacity-100 max-w-[32px] w-[32px] h-[32px]'}`}
            title="Згорнути"
          >
            <PanelLeftClose size={18} />
          </button>
        </div>

        {/* Collapsed Open Button */}
        <div className={`flex transition-all duration-300 overflow-hidden ${isCollapsed ? 'opacity-100 max-h-[32px] mt-[16px] ml-[8px]' : 'opacity-0 max-h-0 mt-0 ml-0'}`}>
          <button 
            onClick={() => setIsCollapsed?.(!isCollapsed)} 
            className="w-[32px] h-[32px] flex items-center justify-center rounded-[8px] bg-[#242424] hover:bg-[#333] text-[#484747] hover:text-white transition-colors"
            title="Розгорнути"
          >
            <PanelLeftOpen size={16} />
          </button>
        </div>
      </div>

      {/* Projects List (Scrollable area) */}
      <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-[2px] px-[12px] pb-[20px]">
        {projects.map(p => (
          <ProjectRow
            key={p.id}
            project={p}
            isActive={activeProjectId === p.id}
            onClick={() => router.push(`/projects/${p.id}`)}
            isCollapsed={isCollapsed}
            setHoveredTooltip={setHoveredTooltip}
          />
        ))}
      </div>

      {/* Add Project Button (Fixed above user menu) */}
      <div className={`shrink-0 flex mt-auto mb-[8px] transition-all duration-300 ${isCollapsed ? 'px-[12px]' : 'px-[24px]'}`}>
        <button
          onClick={() => setShowNewDialog(true)}
          className={`flex items-center h-[32px] rounded-[8px] text-[#9a9a9a] hover:text-white bg-[#252525] hover:bg-[#2a2a2a] transition-all duration-300 overflow-hidden ${isCollapsed ? 'w-[32px] ml-[8px]' : 'w-full ml-0'}`}
          title="Додати проєкт"
        >
          <div className="flex items-center justify-center shrink-0 w-[32px] h-[32px]">
            <Plus size={14} strokeWidth={2} />
          </div>
          <div className={`overflow-hidden transition-all duration-300 whitespace-nowrap flex flex-col text-left justify-center ${isCollapsed ? 'max-w-0 opacity-0 ml-0' : 'max-w-[200px] opacity-100 ml-[4px] flex-1'}`}>
            <span className="text-[12px] font-medium leading-[16px]">Новий проєкт</span>
          </div>
        </button>
      </div>

      {/* Bottom Profile Menu (Original styling) */}
      {userEmail && (
        <div ref={menuRef} className={`shrink-0 relative pb-[12px] transition-all duration-300 ${isCollapsed ? 'px-[12px]' : 'px-[24px]'}`}>
          {menuOpen && (
            <div className={`absolute bottom-[calc(100%+8px)] bg-[#242424] border border-[#333] rounded-[12px] shadow-xl overflow-hidden py-1 z-50 ${isCollapsed ? 'left-[12px] min-w-[200px]' : 'left-[12px] right-[12px]'}`}>
              <button
                onClick={() => { setMenuOpen(false); router.push('/profile'); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium text-white hover:bg-[#333] transition-colors"
              >
                <User size={14} /> Профіль
              </button>
              <button
                onClick={() => {
                  handleLogout();
                  setMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium text-[#ef4444] hover:bg-[#ef4444]/20 transition-colors"
              >
                <LogOut size={14} /> Вийти
              </button>
            </div>
          )}

          <button
            onClick={() => setMenuOpen(v => !v)}
            className={`flex items-center p-[8px] rounded-[12px] w-full transition-colors ${isCollapsed ? 'bg-transparent hover:bg-[#2a2a2a]' : 'bg-[#252525] hover:bg-[#2a2a2a]'}`}
            title={isCollapsed ? userName || userEmail : undefined}
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
            <div className={`flex flex-col text-left overflow-hidden transition-all duration-300 whitespace-nowrap ${isCollapsed ? 'opacity-0 max-w-0 ml-0' : 'opacity-100 max-w-[200px] ml-[12px] flex-1'}`}>
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
    
    {/* Portal-like Tooltip rendered outside normal flow */}
    {hoveredTooltip && isCollapsed && (
      <div 
        className="fixed left-[84px] bg-[#242424] text-[#ececec] text-[12px] font-medium px-[10px] py-[6px] rounded-[8px] z-[100] shadow-xl whitespace-nowrap border border-[#333] pointer-events-none -translate-y-1/2 animate-in fade-in zoom-in-95 duration-150"
        style={{ top: hoveredTooltip.top }}
      >
        {hoveredTooltip.text}
      </div>
    )}
    </>
  );
}

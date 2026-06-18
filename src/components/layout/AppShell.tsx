'use client';

import { useEffect, useRef, useState } from 'react';
import Sidebar from './Sidebar';

interface AppShellProps {
  children: React.ReactNode;
  userEmail?: string;
  userName?: string;
  userAvatar?: string;
}

export default function AppShell({ children, userEmail = '', userName = '', userAvatar = '' }: AppShellProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('BUGGY_BAG_SIDEBAR_COLLAPSED');
    if (saved === 'true') setIsCollapsed(true);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        containerRef.current.style.setProperty('--mouse-x', `${x}px`);
        containerRef.current.style.setProperty('--mouse-y', `${y}px`);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const toggleCollapse = (val: boolean) => {
    setIsCollapsed(val);
    localStorage.setItem('BUGGY_BAG_SIDEBAR_COLLAPSED', String(val));
  };

  return (
    <div 
      ref={containerRef}
      className="h-screen flex overflow-hidden relative bg-[#1f1f1f]"
    >
      <aside className={`flex flex-col shrink-0 overflow-visible relative z-20 transition-all duration-300 ease-in-out ${isCollapsed ? 'w-[72px]' : 'w-[284px]'}`}>
        <Sidebar 
          userEmail={userEmail} 
          userName={userName} 
          userAvatar={userAvatar} 
          isCollapsed={isCollapsed}
          setIsCollapsed={toggleCollapse}
        />
      </aside>
      <main className="flex-1 flex overflow-hidden relative z-10 bg-transparent rounded-[24px] my-[12px] mr-[12px] clip-rounded border border-[#2a2a2a]">
        {children}
      </main>
    </div>
  );
}

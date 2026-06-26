'use client';

import { useEffect, useRef, useState } from 'react';
import Sidebar from './Sidebar';
import MobileHeader from './MobileHeader';
import MobileDrawer from './MobileDrawer';

interface AppShellProps {
  children: React.ReactNode;
  userEmail?: string;
  userName?: string;
  userAvatar?: string;
}

export default function AppShell({ children, userEmail = '', userName = '', userAvatar = '' }: AppShellProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

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
    <div className="flex flex-col h-screen overflow-hidden bg-white md:bg-transparent">
      {/* ── Mobile Header (hidden on desktop) ── */}
      <MobileHeader
        onBurgerClick={() => setIsMobileDrawerOpen(true)}
      />

      {/* ── Mobile Drawer (hidden on desktop) ── */}
      <MobileDrawer
        isOpen={isMobileDrawerOpen}
        onClose={() => setIsMobileDrawerOpen(false)}
        userEmail={userEmail}
        userName={userName}
        userAvatar={userAvatar}
      />

      {/* ── Desktop + Mobile main container ── */}
      <div
        ref={containerRef}
        className="flex-1 flex overflow-hidden relative bg-white md:bg-[#1f1f1f] h-[calc(100dvh-60px)] md:h-auto"
      >
        {/* Desktop-only sidebar */}
        <aside className={`hidden md:flex flex-col shrink-0 overflow-visible relative z-20 transition-all duration-300 ease-in-out ${isCollapsed ? 'w-[72px]' : 'w-[284px]'}`}>
          <Sidebar
            userEmail={userEmail}
            userName={userName}
            userAvatar={userAvatar}
            isCollapsed={isCollapsed}
            setIsCollapsed={toggleCollapse}
          />
        </aside>

        {/* Main content area */}
        <main className="flex-1 flex overflow-hidden relative z-10 bg-white md:bg-transparent md:rounded-[24px] md:my-[12px] md:mr-[12px] md:clip-rounded md:border md:border-[#2a2a2a]">
          {children}
        </main>
      </div>
    </div>
  );
}

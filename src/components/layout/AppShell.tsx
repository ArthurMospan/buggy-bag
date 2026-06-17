'use client';

import { useEffect, useRef } from 'react';
import Sidebar from './Sidebar';

interface AppShellProps {
  children: React.ReactNode;
  userEmail?: string;
  userName?: string;
  userAvatar?: string;
}

export default function AppShell({ children, userEmail = '', userName = '', userAvatar = '' }: AppShellProps) {
  const containerRef = useRef<HTMLDivElement>(null);

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

  return (
    <div 
      ref={containerRef}
      className="h-screen flex overflow-hidden relative bg-[#1f1f1f]"
    >
      <aside className="w-[284px] flex flex-col shrink-0 overflow-hidden relative z-20">
        <Sidebar userEmail={userEmail} userName={userName} userAvatar={userAvatar} />
      </aside>
      <main className="flex-1 flex overflow-hidden relative z-10 bg-[#ffffff] rounded-[24px] my-[12px] mr-[12px]">
        {children}
      </main>
    </div>
  );
}

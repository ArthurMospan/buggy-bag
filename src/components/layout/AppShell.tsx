'use client';

import { useEffect, useRef } from 'react';
import Sidebar from './Sidebar';

interface AppShellProps {
  children: React.ReactNode;
  userEmail?: string;
}

export default function AppShell({ children, userEmail = '' }: AppShellProps) {
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
      className="h-screen flex p-[8px] gap-[8px] overflow-hidden relative"
      style={{
        backgroundColor: '#f4f4f5',
      }}
    >
      <aside className="w-[210px] bg-[#ffffff] flex flex-col shrink-0 overflow-hidden relative z-20 rounded-[16px]">
        <Sidebar userEmail={userEmail} />
      </aside>
      <main className="flex-1 flex overflow-hidden relative z-10 bg-[#ffffff] rounded-[16px]">
        {children}
      </main>
    </div>
  );
}

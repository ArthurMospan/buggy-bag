'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string;
  userName?: string;
  userAvatar?: string;
}

export default function MobileDrawer({
  isOpen,
  onClose,
  userEmail = '',
  userName = '',
  userAvatar = '',
}: MobileDrawerProps) {
  const pathname = usePathname();

  // Close drawer on route change
  useEffect(() => {
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`md:hidden fixed inset-0 z-[60] bg-black/60 backdrop-blur-[2px] transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <div
        className={`md:hidden fixed top-0 left-0 h-full w-[284px] z-[70] flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar rendered inside drawer — reuses existing component as-is */}
        <div className={`flex flex-col h-full w-full bg-[#1f1f1f] rounded-r-[20px] overflow-hidden ${isOpen ? 'shadow-[4px_0_32px_rgba(0,0,0,0.4)]' : ''}`}>
          <Sidebar
            userEmail={userEmail}
            userName={userName}
            userAvatar={userAvatar}
            isCollapsed={false}
            setIsCollapsed={() => {}}
          />
        </div>
      </div>
    </>
  );
}

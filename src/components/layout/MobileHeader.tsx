'use client';

import { Menu, ChevronLeft } from 'lucide-react';
import Image from 'next/image';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface MobileHeaderProps {
  onBurgerClick: () => void;
}

export default function MobileHeader({ onBurgerClick }: MobileHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();

  const searchParams = useSearchParams();
  const isPromptMode = searchParams.get('prompt') === '1';

  return (
    <header className="md:hidden sticky top-0 z-40 w-full bg-[#1f1f1f] rounded-b-[20px] shrink-0">
      <div className="flex items-center h-[60px] px-[16px] gap-[12px]">

        {/* Left: Burger */}
        <div className="flex items-center justify-center w-[36px] h-[36px] shrink-0">
          <button
            onClick={onBurgerClick}
            className="w-[36px] h-[36px] flex items-center justify-center rounded-[10px] text-[#9a9a9a] hover:text-white hover:bg-white/10 active:bg-white/20 transition-all"
            aria-label="Меню"
          >
            <Menu size={20} />
          </button>
        </div>

        {/* Center: Logo + Title */}
        <div className="flex-1 flex items-center justify-center">
          <Link href="/" className="flex items-center gap-[10px] hover:opacity-80 transition-opacity">
            <Image
              src="/bug-logo-white.svg"
              alt="BuggyBag Logo"
              width={28}
              height={28}
              className="object-contain shrink-0"
            />
            <span className="text-white text-[18px] font-bold tracking-tight leading-none">
              BuggyBag
            </span>
          </Link>
        </div>

        {/* Right: empty spacer for centering */}
        <div className="w-[36px] h-[36px] shrink-0" />
      </div>
    </header>
  );
}

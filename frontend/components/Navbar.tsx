'use client';

import React from 'react';
import Link from 'next/link';
import { Bot, Lock } from 'lucide-react';
import { StopAllAiButton } from './StopAllAiButton';
import { useNavbarVisibility } from './NavbarVisibilityContext';

interface NavbarProps {
  onRefresh?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onRefresh }) => {
  const { hiddenOnMobile } = useNavbarVisibility();

  const handleLockSession = () => {
    sessionStorage.removeItem('sunfi_authenticated');
    window.location.reload();
  };

  return (
    <header className={`sticky top-2 sm:top-3 z-40 mx-2 sm:mx-4 md:mx-6 my-1.5 sm:my-2 ${hiddenOnMobile ? 'hidden lg:block' : 'block'}`}>
      <div className="glass-header rounded-2xl h-12 sm:h-16 flex items-center justify-between px-3 sm:px-6 overflow-hidden gap-2">
        {/* Left Brand — min-w-0 prevents overflow */}
        <div className="flex items-center gap-2 min-w-0 shrink">
          <Link href="/" className="flex items-center gap-1.5 sm:gap-3 group min-w-0">
            <div className="flex h-8 w-8 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-[#05392E] text-white font-bold border border-[#03241D] shadow-[0_3px_0_#03241D] transition-transform group-hover:scale-105 shrink-0">
              <Bot className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1 sm:gap-2">
                <span className="text-base sm:text-2xl font-extrabold tracking-tight text-[#111B21] whitespace-nowrap">SUNFI AI</span>
                <span className="hidden sm:inline-block text-[9px] sm:text-xs font-extrabold uppercase tracking-wider px-2 py-0.5 sm:px-3 rounded-full bg-[#E8F5E9] text-[#05392E] border border-[#05392E]/20 whitespace-nowrap">
                  Command Center
                </span>
              </div>
              <span className="hidden sm:block text-xs font-bold text-[#667781] -mt-0.5 truncate">Personal WhatsApp Intelligence</span>
            </div>
          </Link>
        </div>

        {/* Right Actions & Status — shrink-0 prevents squishing */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#E8F5E9] border border-[#05392E]/25 text-xs font-extrabold text-[#05392E] shadow-sm whitespace-nowrap">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#25D366] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#25D366]"></span>
            </span>
            <span>AI Online</span>
          </div>

          <button
            onClick={handleLockSession}
            title="Lock Dashboard Session"
            className="p-1.5 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl bg-[#F7FAF9] border border-[#E5EAEA] hover:border-[#05392E] text-xs font-extrabold text-[#111B21] flex items-center gap-1 sm:gap-1.5 transition shadow-sm shrink-0"
          >
            <Lock className="h-3.5 w-3.5 text-[#05392E]" />
            <span className="hidden md:inline">Lock</span>
          </button>

          <StopAllAiButton onSuccess={onRefresh} />
        </div>
      </div>
    </header>
  );
};

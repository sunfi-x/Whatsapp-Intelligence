'use client';

import React from 'react';
import Link from 'next/link';
import { Bot, Lock } from 'lucide-react';
import { StopAllAiButton } from './StopAllAiButton';

interface NavbarProps {
  onRefresh?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onRefresh }) => {
  const handleLockSession = () => {
    sessionStorage.removeItem('sunfi_authenticated');
    window.location.reload();
  };

  return (
    <header className="sticky top-2 sm:top-3 z-40 mx-2 sm:mx-4 md:mx-6 my-1.5 sm:my-2">
      <div className="glass-header rounded-2xl h-14 sm:h-16 flex items-center justify-between px-3 sm:px-6">
        {/* Left Brand */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/" className="flex items-center gap-2 sm:gap-3 group">
            <div className="flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-[#05392E] text-white font-bold border border-[#03241D] shadow-[0_3px_0_#03241D] transition-transform group-hover:scale-105 shrink-0">
              <Bot className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-lg sm:text-2xl font-extrabold tracking-tight text-[#111B21]">SUNFI AI</span>
                <span className="hidden xs:inline-block text-[9px] sm:text-xs font-extrabold uppercase tracking-wider px-2 py-0.5 sm:px-3 rounded-full bg-[#E8F5E9] text-[#05392E] border border-[#05392E]/20">
                  Command Center
                </span>
              </div>
              <span className="text-[10px] sm:text-xs font-bold text-[#667781] block -mt-0.5 truncate max-w-[150px] sm:max-w-none">Personal WhatsApp Intelligence</span>
            </div>
          </Link>
        </div>

        {/* Right Actions & Status */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#E8F5E9] border border-[#05392E]/25 text-xs font-extrabold text-[#05392E] shadow-sm">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#25D366] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#25D366]"></span>
            </span>
            <span>AI System Online</span>
          </div>

          <button
            onClick={handleLockSession}
            title="Lock Dashboard Session"
            className="px-3 py-1.5 rounded-xl bg-[#F7FAF9] border border-[#E5EAEA] hover:border-[#05392E] text-xs font-extrabold text-[#111B21] flex items-center gap-1.5 transition shadow-sm"
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

'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, MessageSquare, Users, Settings, BarChart3, ShieldCheck, User } from 'lucide-react';

const navItems = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { label: 'Inbox', href: '/inbox', icon: MessageSquare },
  { label: 'Contacts', href: '/contacts', icon: Users },
  { label: 'Analytics', href: '/analytics', icon: BarChart3 },
  { label: 'Settings', href: '/settings', icon: Settings },
];

export const Sidebar = () => {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop Vertical 3D Sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 p-4 flex-col justify-between min-h-[calc(100vh-5.5rem)]">
        {/* 3D Floating Sidebar Surface */}
        <div className="card-3d rounded-3xl p-4 flex flex-col justify-between flex-1">
          <div>
            {/* Section Header */}
            <div className="px-3 py-2 mb-3 flex items-center gap-2.5">
              <div className="h-3 w-3 rounded-full bg-[#25D366] halo-active" />
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#667781]">Navigation</span>
            </div>

            {/* Nav List */}
            <nav className="space-y-2">
              {navItems.map(({ label, href, icon: Icon }) => {
                const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`nav-pill-item flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-base font-extrabold relative group ${
                      isActive ? 'nav-pill-active' : 'text-[#667781]'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-6 rounded-full bg-[#05392E] shadow-sm transition-opacity duration-150 ${
                        isActive ? 'opacity-100' : 'opacity-0'
                      }`}
                    />
                    <div
                      className={`p-1.5 rounded-xl transition-transform duration-150 group-hover:scale-105 ${
                        isActive ? 'bg-[#FFFFFF] text-[#05392E] shadow-sm' : 'text-[#667781]'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className={`font-extrabold ${isActive ? 'text-[#05392E]' : 'text-[#111B21]'}`}>{label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Bottom AI Status & User Info Card */}
          <div className="space-y-3 pt-4 border-t border-[#E5EAEA]">
            <div className="rounded-2xl bg-[#E8F5E9] border border-[#05392E]/20 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-extrabold uppercase tracking-wider text-[#05392E]">System Status</span>
                <span className="flex h-3 w-3 rounded-full bg-[#25D366] halo-active" />
              </div>
              <p className="text-sm font-extrabold text-[#111B21] flex items-center gap-2">
                <ShieldCheck className="h-4.5 w-4.5 text-[#05392E]" />
                WhatsApp AI Active
              </p>
              <p className="text-xs text-[#667781] font-semibold mt-0.5">Human-in-the-loop active</p>
            </div>

            <div className="flex items-center gap-3 px-2 py-1">
              <div className="h-10 w-10 rounded-full bg-[#05392E] border border-[#03241D] flex items-center justify-center text-white text-sm font-bold shadow-sm">
                <User className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-extrabold text-[#111B21] truncate">Personal Account</p>
                <p className="text-xs font-semibold text-[#667781] truncate">sunfi@example.com</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Floating 3D Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-3 left-3 right-3 z-50">
        <div className="card-3d bg-white/95 backdrop-blur-md rounded-2xl p-1.5 flex items-center justify-around shadow-2xl border border-[#05392E]/15">
          {navItems.map(({ label, href, icon: Icon }) => {
            const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={`flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-xl text-[11px] font-extrabold transition-all ${
                  isActive
                    ? 'bg-[#E8F5E9] text-[#05392E] border border-[#05392E]/20 shadow-sm'
                    : 'text-[#667781] hover:text-[#111B21]'
                }`}
              >
                <Icon className={`h-5 w-5 mb-0.5 ${isActive ? 'text-[#05392E]' : 'text-[#667781]'}`} />
                <span className="truncate max-w-[64px] text-center">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
};

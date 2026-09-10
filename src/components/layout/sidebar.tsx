'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutGrid, 
  Monitor, 
  History, 
  Brain, 
  ShieldCheck, 
  AlertTriangle, 
  Wallet, 
  ChevronLeft, 
  ChevronRight, 
  LogOut 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/stores/app-store';
import { BiasXLogo } from '@/components/ui/biasx-logo';

// Core Navigation
const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutGrid },
  { name: 'Terminal', href: '/terminal', icon: Monitor },
  { name: 'Journal', href: '/history', icon: History },
  { name: 'Mistakes', href: '/behavior', icon: Brain },
  { name: 'AI Coach', href: '/coach', icon: AlertTriangle },
  { name: 'Rules', href: '/rules', icon: ShieldCheck },
  { name: 'Accounts', href: '/accounts', icon: Wallet },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, toggleSidebar } = useAppStore();

  return (
    <aside 
      className={cn(
        "flex flex-col h-full bg-[#0a0a0a] border-r border-[#1e1e1e] transition-all duration-300 ease-in-out z-30 shrink-0 select-none shadow-2xl",
        sidebarOpen ? "w-[230px]" : "w-[68px]"
      )}
    >
      {/* Brand Header */}
      <div 
        className={cn(
          "flex items-center h-16 border-b border-[#1e1e1e] transition-all",
          sidebarOpen ? "justify-between px-4" : "justify-center px-0"
        )}
      >
        <Link 
          href="/dashboard" 
          className={cn(
            "flex items-center overflow-hidden transition-all",
            sidebarOpen ? "gap-3" : "justify-center"
          )}
          title="BiasX Trading"
        >
          <div className="relative flex items-center justify-center h-10 w-10 rounded-xl bg-[#181818] border border-[#2c2c2c] text-neutral-100 shrink-0 shadow-md hover:border-neutral-500 transition-colors">
            <BiasXLogo size={26} />
          </div>

          {sidebarOpen && (
            <span className="text-base font-black tracking-wider text-white uppercase font-sans">
              BIASX
            </span>
          )}
        </Link>

        {sidebarOpen && (
          <button 
            onClick={toggleSidebar}
            className="h-8 w-8 flex items-center justify-center text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
            title="Collapse Sidebar"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Main Navigation List */}
      <nav 
        className={cn(
          "flex-1 py-3 flex flex-col gap-1.5 overflow-y-auto overflow-x-hidden",
          sidebarOpen ? "px-3" : "px-2 items-center"
        )}
      >
        {/* In Collapsed Mode: Persistent Expand Toggle at TOP of navigation */}
        {!sidebarOpen && (
          <button 
            onClick={toggleSidebar}
            className="relative group w-11 h-10 mb-2 rounded-xl flex items-center justify-center text-neutral-400 hover:text-white bg-[#141414] hover:bg-[#1a1a1a] border border-[#222222] transition-all cursor-pointer shadow-sm"
            title="Expand Sidebar"
          >
            <ChevronRight className="h-4 w-4 shrink-0 text-neutral-300" />
            <div className="absolute left-[calc(100%+12px)] px-3 py-1.5 rounded-xl bg-[#121212] border border-[#282828] text-white text-xs font-semibold whitespace-nowrap shadow-2xl opacity-0 translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 pointer-events-none transition-all z-50">
              Expand Sidebar
            </div>
          </button>
        )}

        {navItems.map((item, idx) => {
          const isActive = item.href === '/dashboard' 
            ? pathname === '/dashboard' && item.name === 'Dashboard'
            : pathname.startsWith(item.href);

          return (
            <Link
              key={`${item.name}-${idx}`}
              href={item.href}
              className={cn(
                "relative group flex items-center transition-all whitespace-nowrap",
                sidebarOpen 
                  ? "gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-medium w-full" 
                  : "justify-center w-11 h-11 rounded-xl",
                isActive 
                  ? "bg-[#1c1c1c] text-white border border-[#2e2e2e] shadow-md font-semibold" 
                  : "text-neutral-400 hover:bg-[#141414] hover:text-white"
              )}
            >
              <item.icon 
                className={cn(
                  "h-5 w-5 shrink-0 transition-colors", 
                  isActive ? "text-white" : "text-neutral-400 group-hover:text-white"
                )} 
              />
              
              {sidebarOpen && <span>{item.name}</span>}

              {/* Floating Tooltip for Minimized Mode */}
              {!sidebarOpen && (
                <div className="absolute left-[calc(100%+12px)] px-3 py-1.5 rounded-xl bg-[#121212] border border-[#282828] text-white text-xs font-semibold whitespace-nowrap shadow-2xl opacity-0 translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 pointer-events-none transition-all z-50">
                  {item.name}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Profile Strip */}
      <div className="p-3 border-t border-[#1e1e1e]">
        <div className={cn(
          "flex items-center gap-3 p-2 rounded-xl bg-[#111111] border border-[#202020]",
          !sidebarOpen && "justify-center"
        )}>
          <div className="w-7 h-7 rounded-lg bg-neutral-800 flex items-center justify-center text-xs font-bold text-neutral-200">
            D
          </div>
          {sidebarOpen && (
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-white truncate">Demo Account</span>
              <span className="text-[10px] text-neutral-400 font-mono">$2,137.24</span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

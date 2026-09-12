'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutGrid, 
  Monitor, 
  History, 
  Brain, 
  ShieldCheck, 
  Wallet, 
  ChevronLeft, 
  ChevronRight, 
  LogOut,
  BrainCircuit
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { useAppStore } from '@/lib/stores/app-store';
import { BiasXLogo } from '@/components/ui/biasx-logo';
import { fetchDashboardStats } from '@/lib/services/dashboard-stats-cache';

// Core Navigation
const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutGrid },
  { name: 'Terminal', href: '/terminal', icon: Monitor },
  { name: 'Journal', href: '/history', icon: History },
  { name: 'Behavioral Analysis', href: '/behavior', icon: Brain },
  { name: 'BiasX Intelligence', href: '/coach', icon: BrainCircuit },
  { name: 'Rules', href: '/rules', icon: ShieldCheck },
  { name: 'Accounts', href: '/accounts', icon: Wallet },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, toggleSidebar } = useAppStore();
  const [accountInfo, setAccountInfo] = useState<{ name: string; balance: number } | null>(null);

  const refreshAccount = React.useCallback(() => {
    fetchDashboardStats(true)
      .then(d => {
        if (d?.account) {
          setAccountInfo({
            name: d.account.name || 'MT5 Primary Account',
            balance: d.account.balance ?? 2000,
          });
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    refreshAccount();
  }, [pathname, refreshAccount]);

  useEffect(() => {
    const onMutate = () => refreshAccount();
    window.addEventListener('biasx:data-mutated', onMutate);
    window.addEventListener('focus', onMutate);
    return () => {
      window.removeEventListener('biasx:data-mutated', onMutate);
      window.removeEventListener('focus', onMutate);
    };
  }, [refreshAccount]);

  return (
    <aside 
      className={cn(
        "flex flex-col h-full bg-[#E0E5EC] border-r border-[#A0AEC0]/30 transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)] z-30 shrink-0 select-none shadow-[4px_0_16px_rgba(163,177,198,0.25)]",
        sidebarOpen ? "w-[240px]" : "w-[72px]"
      )}
    >
      {/* Brand Header */}
      <div 
        className={cn(
          "flex items-center h-16 border-b border-[#A0AEC0]/30 transition-all",
          sidebarOpen ? "justify-between px-4" : "justify-center px-0"
        )}
      >
        <Link 
          href="/dashboard" 
          className={cn(
            "flex items-center transition-all",
            sidebarOpen ? "gap-3" : "justify-center"
          )}
          title="BiasX Trading"
        >
          <div className="relative flex items-center justify-center h-10 w-10 rounded-[14px] bg-[#E0E5EC] neu-inset-sm shrink-0">
            <BiasXLogo size={22} />
          </div>

          {sidebarOpen && (
            <span className="text-base font-extrabold tracking-wider text-[#3D4852] uppercase font-heading">
              BIASX
            </span>
          )}
        </Link>

        {sidebarOpen && (
          <button 
            onClick={toggleSidebar}
            className="h-8 w-8 flex items-center justify-center text-[#6B7280] hover:text-[#3D4852] rounded-full neu-raised-sm hover:neu-inset-sm transition-all cursor-pointer"
            title="Collapse Sidebar"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Main Navigation List */}
      <nav 
        className={cn(
          "flex-1 py-4 flex flex-col gap-2 overflow-y-auto overflow-x-hidden",
          sidebarOpen ? "px-3" : "px-2 items-center"
        )}
      >
        {/* In Collapsed Mode: Persistent Expand Toggle at TOP of navigation */}
        {!sidebarOpen && (
          <button 
            onClick={toggleSidebar}
            className="relative group w-11 h-10 mb-2 rounded-[20px] flex items-center justify-center text-[#6B7280] hover:text-[#3D4852] bg-[#E0E5EC] neu-raised-sm hover:neu-inset-sm transition-all cursor-pointer"
            title="Expand Sidebar"
          >
            <ChevronRight className="h-4 w-4 shrink-0 text-[#6B7280]" />
            <div className="absolute left-[calc(100%+12px)] px-3 py-1.5 rounded-[16px] bg-[#E0E5EC] neu-raised border border-[#A0AEC0]/30 text-[#3D4852] text-xs font-semibold whitespace-nowrap shadow-xl opacity-0 translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 pointer-events-none transition-all z-50 font-heading">
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
                "relative group flex items-center transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)] whitespace-nowrap font-heading",
                sidebarOpen 
                  ? "gap-3.5 px-4 py-2.5 rounded-[22px] text-sm font-semibold w-full" 
                  : "justify-center w-11 h-11 rounded-[22px]",
                isActive 
                  ? "bg-[#6C63FF] text-white shadow-[3px_3px_8px_rgba(108,99,255,0.35),-1px_-1px_4px_rgba(255,255,255,0.7)] font-bold" 
                  : "text-[#4A5568] hover:text-[#2D3748] hover:neu-raised-sm"
              )}
            >
              <item.icon 
                className={cn(
                  "h-5 w-5 shrink-0 transition-colors", 
                  isActive ? "text-white" : "text-[#4A5568] group-hover:text-[#2D3748]"
                )} 
              />
              
              {sidebarOpen && <span>{item.name}</span>}

              {/* Floating Tooltip for Minimized Mode */}
              {!sidebarOpen && (
                <div className="absolute left-[calc(100%+12px)] px-3 py-1.5 rounded-[16px] bg-[#E0E5EC] neu-raised border border-[#A0AEC0]/30 text-[#2D3748] text-xs font-semibold whitespace-nowrap shadow-xl opacity-0 translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 pointer-events-none transition-all z-50 font-heading">
                  {item.name}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Profile Strip */}
      <div className="p-3 border-t border-[#A0AEC0]/30">
        <div className={cn(
          "flex items-center gap-3 p-2.5 rounded-[20px] bg-[#E0E5EC] neu-inset",
          !sidebarOpen && "justify-center"
        )}>
          <div className="w-7 h-7 rounded-full bg-[#6C63FF] flex items-center justify-center text-white shadow-sm shrink-0">
            <Wallet className="w-3.5 h-3.5" />
          </div>
          {sidebarOpen && (
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-[#2D3748] truncate font-heading">
                {accountInfo?.name || 'MT5 Primary Account'}
              </span>
              <span className="text-xs text-[#4A5568] font-mono font-bold">
                {accountInfo ? formatCurrency(accountInfo.balance) : '$2,137.24'}
              </span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

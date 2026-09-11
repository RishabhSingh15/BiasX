'use client';

import React, { useState, useEffect } from 'react';
import { ChevronDown, Wallet } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { formatCurrency } from '@/lib/utils';
import { fetchDashboardStats } from '@/lib/services/dashboard-stats-cache';

export function TopBar() {
  const pathname = usePathname();
  const [accountInfo, setAccountInfo] = useState<{ name: string; balance: number } | null>(null);

  useEffect(() => {
    fetchDashboardStats()
      .then(d => {
        if (d?.account) {
          setAccountInfo({
            name: d.account.name || 'MT5 Primary Account',
            balance: d.account.balance ?? 2000,
          });
        }
      })
      .catch(() => {});
  }, [pathname]);

  return (
    <header className="h-14 bg-[#E0E5EC] border-b border-[#A0AEC0]/30 flex items-center justify-end px-8 flex-shrink-0 z-10 select-none">
      {/* Right Controls: Unified Account Selector */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-3 px-4 py-2 rounded-[20px] bg-[#E0E5EC] neu-raised-sm hover:neu-inset-sm transition-all cursor-pointer border border-[#A0AEC0]/20">
          <div className="w-6 h-6 rounded-full bg-[#6C63FF]/15 flex items-center justify-center text-[#6C63FF] shrink-0">
            <Wallet className="w-3.5 h-3.5" />
          </div>
          <div className="flex flex-col items-start leading-tight">
            <span className="text-xs font-bold text-[#2D3748] font-heading uppercase tracking-wide">
              {accountInfo?.name || 'MT5 Primary Account'}
            </span>
            <span className="text-sm text-[#2D3748] font-mono font-bold">
              {accountInfo ? formatCurrency(accountInfo.balance) : '$2,137.24'}
            </span>
          </div>
          <ChevronDown className="h-4 w-4 text-[#4A5568]" />
        </div>
      </div>
    </header>
  );
}

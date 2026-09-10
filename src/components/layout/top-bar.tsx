'use client';

import React from 'react';
import { ChevronDown } from 'lucide-react';

export function TopBar() {
  return (
    <header className="h-14 bg-[#080808]/80 backdrop-blur-md border-b border-[#1a1a1a] flex items-center justify-end px-8 flex-shrink-0 z-10">
      {/* Right Controls: Unified Account Selector */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-3 px-3.5 py-1.5 rounded-xl border border-[#222222] bg-[#111111] shadow-lg hover:border-[#333333] transition-colors cursor-pointer">
          <div className="flex flex-col items-start leading-tight">
            <span className="text-xs font-semibold text-neutral-200">Account</span>
            <span className="text-[11px] text-neutral-200 font-mono font-semibold">$2,137.24</span>
          </div>
          <ChevronDown className="h-3.5 w-3.5 text-neutral-400" />
        </div>
      </div>
    </header>
  );
}

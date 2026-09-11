'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Filter, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface JournalFiltersProps {
  availableSymbols: string[];
  selectedSymbolFilter: string;
  setSelectedSymbolFilter: (sym: string) => void;
  selectedSideFilter: string;
  setSelectedSideFilter: (side: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onFilterChange: () => void;
}

export function JournalFilters({
  availableSymbols,
  selectedSymbolFilter,
  setSelectedSymbolFilter,
  selectedSideFilter,
  setSelectedSideFilter,
  searchQuery,
  setSearchQuery,
  onFilterChange,
}: JournalFiltersProps) {
  return (
    <Card className="p-4 md:p-5 bg-[#E0E5EC] neu-raised rounded-[26px] border border-[#A0AEC0]/20">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-sm text-[#4A5568] font-heading font-semibold mr-1">
            <Filter className="w-4 h-4 text-[#6C63FF]" />
            <span>Filter:</span>
          </div>

          {/* Symbol Filter */}
          <div className="flex flex-wrap rounded-[20px] p-1 bg-[#E0E5EC] neu-inset-sm gap-1">
            {availableSymbols.map((sym) => (
              <button
                key={sym}
                onClick={() => { setSelectedSymbolFilter(sym); onFilterChange(); }}
                className={cn(
                  "px-3.5 py-1.5 text-sm font-mono rounded-[14px] transition-all cursor-pointer",
                  selectedSymbolFilter === sym
                    ? "bg-[#E0E5EC] neu-raised-sm text-[#6C63FF] font-bold shadow-sm"
                    : "text-[#4A5568] hover:text-[#2D3748]"
                )}
              >
                {sym === 'ALL' ? 'All Pairs' : sym}
              </button>
            ))}
          </div>

          {/* Side Filter */}
          <div className="flex rounded-[20px] p-1 bg-[#E0E5EC] neu-inset-sm gap-1">
            {['ALL', 'LONG', 'SHORT'].map((side) => (
              <button
                key={side}
                onClick={() => { setSelectedSideFilter(side); onFilterChange(); }}
                className={cn(
                  "px-3.5 py-1.5 text-sm font-mono rounded-[14px] transition-all cursor-pointer",
                  selectedSideFilter === side
                    ? side === 'LONG' 
                      ? "bg-[#38B2AC] text-white font-bold shadow-sm" 
                      : side === 'SHORT' 
                        ? "bg-[#FF6B6B] text-white font-bold shadow-sm" 
                        : "bg-[#E0E5EC] neu-raised-sm text-[#6C63FF] font-bold shadow-sm"
                    : "text-[#4A5568] hover:text-[#2D3748]"
                )}
              >
                {side}
              </button>
            ))}
          </div>
        </div>

        {/* Search Input */}
        <div className="relative min-w-[260px]">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-[#718096]" />
          <input
            type="text"
            placeholder="Search strategy, symbol..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#E0E5EC] neu-inset rounded-[20px] pl-10 pr-3.5 py-2 text-sm font-mono text-[#2D3748] placeholder:text-[#718096] border border-[#A0AEC0]/20 focus:outline-none focus:ring-2 focus:ring-[#6C63FF] transition-colors"
          />
        </div>
      </div>
    </Card>
  );
}

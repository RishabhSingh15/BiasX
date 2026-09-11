'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { formatCurrency, cn } from '@/lib/utils';

interface JournalMetricsBarProps {
  totalAudited: number;
  longTrades: number;
  shortTrades: number;
  winTrades: number;
  lossTrades: number;
  winRate: string;
  totalPnl: number;
}

export function JournalMetricsBar({
  totalAudited,
  longTrades,
  shortTrades,
  winTrades,
  lossTrades,
  winRate,
  totalPnl,
}: JournalMetricsBarProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
      <Card className="p-6 bg-[#E0E5EC] neu-raised rounded-[32px] border border-[#A0AEC0]/20 flex flex-col justify-between">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-heading font-semibold text-[#4A5568]">Total Trades</span>
          <span className="text-xs font-semibold text-[#6C63FF] bg-[#E0E5EC] neu-inset-sm px-3 py-1 rounded-[16px] font-mono">
            All Sessions
          </span>
        </div>
        <div className="text-2xl lg:text-3xl font-bold font-mono text-[#2D3748]">
          {totalAudited} <span className="text-sm font-normal text-[#4A5568] font-body">Trades</span>
        </div>
        <p className="text-sm text-[#4A5568] mt-1.5 font-body">{longTrades} Long &bull; {shortTrades} Short</p>
      </Card>

      <Card className="p-6 bg-[#E0E5EC] neu-raised rounded-[32px] border border-[#A0AEC0]/20 flex flex-col justify-between">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-heading font-semibold text-[#4A5568]">Win Rate</span>
          <span className="text-xs font-semibold text-[#38B2AC] bg-[#E0E5EC] neu-inset-sm px-3 py-1 rounded-[16px] font-mono">
            Profitable
          </span>
        </div>
        <div className="text-2xl lg:text-3xl font-bold font-mono text-[#2D3748]">
          {winRate}% <span className="text-sm font-normal text-[#4A5568] font-body">Avg R:R 1:2.0</span>
        </div>
        <p className="text-sm text-[#4A5568] mt-1.5 font-body">{winTrades} wins &bull; {lossTrades} losses</p>
      </Card>

      <Card className="p-6 bg-[#E0E5EC] neu-raised rounded-[32px] border border-[#A0AEC0]/20 flex flex-col justify-between">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-heading font-semibold text-[#4A5568]">Total Profit/Loss</span>
          <span className="text-xs font-semibold text-[#6C63FF] bg-[#E0E5EC] neu-inset-sm px-3 py-1 rounded-[16px] font-mono">
            All Time
          </span>
        </div>
        <div className={cn("text-2xl lg:text-3xl font-bold font-mono", totalPnl >= 0 ? "text-[#38B2AC]" : "text-[#FF6B6B]")}>
          {totalPnl >= 0 ? '+' : ''}{formatCurrency(totalPnl)}
        </div>
        <p className="text-sm text-[#4A5568] mt-1.5 font-body">Overall result across all trades</p>
      </Card>
    </div>
  );
}

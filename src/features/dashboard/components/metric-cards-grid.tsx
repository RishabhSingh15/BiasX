'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { formatCurrency, getPnlColor, cn } from '@/lib/utils';
import { MiniCandleSparkline } from './sparkline';
import { DashboardData } from '../types';

interface MetricCardsGridProps {
  data: DashboardData;
}

export function MetricCardsGrid({ data }: MetricCardsGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Card 1: Account Balance */}
      <Card className="p-6 flex flex-col justify-between neu-raised rounded-[32px] bg-[#E0E5EC] transition-all group">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-[#4A5568] font-heading">Balance</span>
          <span className="text-[11px] font-semibold text-[#2D3748] bg-[#E0E5EC] neu-inset-sm px-3 py-1 rounded-[16px] flex items-center gap-0.5 font-mono">
            {data.totalTrades > 0 ? `${data.todaysPnl >= 0 ? '+' : ''}${((data.todaysPnl / (data.startingBalance || 2000)) * 100).toFixed(1)}% from $2k` : 'No trades yet'}
          </span>
        </div>
        <div className="flex items-end justify-between">
          <div className="text-2xl lg:text-3xl font-extrabold font-mono tracking-tight text-[#2D3748]">
            {formatCurrency(data.balance)}
          </div>
          <MiniCandleSparkline neutral={true} />
        </div>
      </Card>

      {/* Card 2: Equity */}
      <Card className="p-6 flex flex-col justify-between neu-raised rounded-[32px] bg-[#E0E5EC] transition-all group">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-[#4A5568] font-heading">Equity</span>
          <span className="text-[11px] font-semibold text-[#2D3748] bg-[#E0E5EC] neu-inset-sm px-3 py-1 rounded-[16px] flex items-center gap-0.5 font-mono">
            100% Capital
          </span>
        </div>
        <div className="flex items-end justify-between">
          <div className="text-2xl lg:text-3xl font-extrabold font-mono tracking-tight text-[#2D3748]">
            {formatCurrency(data.equity)}
          </div>
          <MiniCandleSparkline neutral={true} />
        </div>
      </Card>

      {/* Card 3: Cumulative Realized Profit / Loss */}
      <Card className="p-6 flex flex-col justify-between neu-raised rounded-[32px] bg-[#E0E5EC] transition-all group">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-[#4A5568] font-heading">Total Profit/Loss</span>
          <span className="text-[11px] font-semibold text-[#2D3748] bg-[#E0E5EC] neu-inset-sm px-3 py-1 rounded-[16px] flex items-center gap-0.5 font-mono">
            {data.totalTrades} Trades
          </span>
        </div>
        <div className="flex items-end justify-between">
          <div className={cn("text-2xl lg:text-3xl font-extrabold font-mono tracking-tight", getPnlColor(data.todaysPnl))}>
            {data.todaysPnl > 0 ? '+' : ''}{formatCurrency(data.todaysPnl)}
          </div>
          <MiniCandleSparkline isPositive={data.todaysPnl >= 0} />
        </div>
      </Card>
    </div>
  );
}

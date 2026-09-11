'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  TrendingUp, 
  TrendingDown 
} from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';
import { CalendarDay } from '../types';

interface PnlCalendarCardProps {
  rawCalendarDays: any[];
  totalTrades: number;
}

export function PnlCalendarCard({ rawCalendarDays, totalTrades }: PnlCalendarCardProps) {
  const [heatmapUnit, setHeatmapUnit] = useState<'$' | '%' | 'R'>('$');
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);
  const [selectedYearMonth, setSelectedYearMonth] = useState<{ year: number; month: number }>(() => {
    if (rawCalendarDays.length > 0) {
      const firstDateObj = new Date(rawCalendarDays[0].date);
      return {
        year: firstDateObj.getFullYear(),
        month: firstDateObj.getMonth(),
      };
    }
    return {
      year: new Date().getFullYear(),
      month: new Date().getMonth(),
    };
  });

  const activeYear = selectedYearMonth.year;
  const activeMonth = selectedYearMonth.month;
  const daysInMonth = new Date(activeYear, activeMonth + 1, 0).getDate();
  const firstDayWeekday = new Date(activeYear, activeMonth, 1).getDay();

  const currentMonthDays: CalendarDay[] = Array.from({ length: daysInMonth }, (_, i) => {
    const d = i + 1;
    const dateStr = `${activeYear}-${String(activeMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const match = rawCalendarDays.find(c => c.date === dateStr);
    const weekday = new Date(activeYear, activeMonth, d).getDay();
    if (match) {
      return {
        day: d,
        weekday,
        traded: true,
        pnl: match.pnl,
        grossProfit: match.grossProfit,
        grossLoss: match.grossLoss,
        trades: match.trades,
        wins: match.wins,
        losses: match.losses,
        pnlPercent: match.pnlPercent,
        rMultiple: match.rMultiple,
        symbols: match.symbols,
      };
    }
    return {
      day: d,
      weekday,
      traded: false,
    };
  });

  const monthTradedDays = currentMonthDays.filter(d => d.traded);
  const monthNetPnl = Number(monthTradedDays.reduce((sum, d) => sum + (d.pnl || 0), 0).toFixed(2));
  const monthWins = monthTradedDays.reduce((sum, d) => sum + (d.wins || 0), 0);
  const monthLosses = monthTradedDays.reduce((sum, d) => sum + (d.losses || 0), 0);
  const monthWinRate = (monthWins + monthLosses) > 0 ? ((monthWins / (monthWins + monthLosses)) * 100).toFixed(1) : '0.0';
  const monthGrossProfit = Number(monthTradedDays.reduce((s, d) => s + (d.grossProfit !== undefined ? d.grossProfit : ((d.pnl || 0) > 0 ? (d.pnl || 0) : 0)), 0).toFixed(2));
  const monthGrossLoss = Number(monthTradedDays.reduce((s, d) => s + (d.grossLoss !== undefined ? d.grossLoss : ((d.pnl || 0) < 0 ? Math.abs(d.pnl || 0) : 0)), 0).toFixed(2));
  const monthProfitFactor = monthGrossLoss === 0 ? (monthGrossProfit > 0 ? '∞' : '0.00') : (monthGrossProfit / monthGrossLoss).toFixed(2);
  const monthTitle = new Date(activeYear, activeMonth, 1).toLocaleString('default', { month: 'long', year: 'numeric' });

  const handlePrevMonth = () => {
    setSelectedDay(null);
    setSelectedYearMonth(prev => prev.month === 0 ? { year: prev.year - 1, month: 11 } : { year: prev.year, month: prev.month - 1 });
  };

  const handleNextMonth = () => {
    setSelectedDay(null);
    setSelectedYearMonth(prev => prev.month === 11 ? { year: prev.year + 1, month: 0 } : { year: prev.year, month: prev.month + 1 });
  };

  const formatHeatmapVal = (d: CalendarDay) => {
    if (!d.traded) return '';
    const pnl = d.pnl || 0;
    const absVal = Math.abs(pnl).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (heatmapUnit === '$') {
      return pnl >= 0 ? `+$${absVal}` : `-$${absVal}`;
    }
    if (heatmapUnit === '%') {
      const pct = d.pnlPercent || 0;
      return `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
    }
    const r = d.rMultiple || 0;
    return `${r >= 0 ? '+' : ''}${r.toFixed(1)}R`;
  };

  return (
    <Card className="p-6 md:p-7 bg-[#E0E5EC] neu-raised rounded-[32px] border border-[#A0AEC0]/20">
      {/* Header & Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-[#A0AEC0]/25">
        {/* Title & Month Switcher */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-[16px] bg-[#E0E5EC] neu-inset-sm flex items-center justify-center">
              <CalendarIcon className="h-4 w-4 text-[#6C63FF]" />
            </div>
            <h3 className="text-base font-bold text-[#2D3748] font-heading tracking-wide">P&L Calendar Heatmap</h3>
          </div>

          {/* Month Navigation */}
          <div className="flex items-center gap-1 px-2 py-1 rounded-[18px] bg-[#E0E5EC] neu-inset-sm">
            <button 
              onClick={handlePrevMonth}
              className="p-1 rounded-[12px] text-[#4A5568] hover:text-[#6C63FF] hover:bg-[#A0AEC0]/10 transition-colors cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="px-2 font-mono text-xs font-bold text-[#2D3748] min-w-[110px] text-center">
              {monthTitle}
            </span>
            <button 
              onClick={handleNextMonth}
              className="p-1 rounded-[12px] text-[#4A5568] hover:text-[#6C63FF] hover:bg-[#A0AEC0]/10 transition-colors cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Month Summary Ribbon Stats */}
        <div className="flex flex-wrap items-center gap-3 md:gap-5 px-4 py-2 rounded-[20px] bg-[#E0E5EC] neu-inset-sm text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-[#4A5568] font-heading font-semibold">Net P&L:</span>
            <span className={cn("font-mono font-bold text-sm", monthNetPnl >= 0 ? "text-[#38B2AC]" : "text-[#FF6B6B]")}>
              {monthNetPnl >= 0 ? '+' : ''}{formatCurrency(monthNetPnl)}
            </span>
          </div>
          <div className="h-3 w-px bg-[#A0AEC0]/25" />
          <div className="flex items-center gap-1.5">
            <span className="text-[#4A5568] font-heading font-semibold">Days Traded:</span>
            <span className="font-mono font-bold text-[#2D3748]">{monthTradedDays.length}</span>
          </div>
          <div className="h-3 w-px bg-[#A0AEC0]/25" />
          <div className="flex items-center gap-1.5">
            <span className="text-[#4A5568] font-heading font-semibold">Win Rate:</span>
            <span className="font-mono font-bold text-[#2D3748]">{monthWinRate}%</span>
            <span className="text-xs text-[#4A5568] font-mono">({monthWins}W - {monthLosses}L)</span>
          </div>
          <div className="h-3 w-px bg-[#A0AEC0]/25" />
          <div className="flex items-center gap-1.5">
            <span className="text-[#4A5568] font-heading font-semibold">Profit Factor:</span>
            <span className="font-mono font-bold text-[#2D3748]">{monthProfitFactor}</span>
          </div>
        </div>

        {/* Right: Unit Toggles ($, %, R) */}
        <div className="flex items-center gap-3">
          <div className="flex items-center p-1 rounded-[18px] bg-[#E0E5EC] neu-inset-sm text-xs">
            {(['$', '%', 'R'] as const).map((unit) => (
              <button
                key={unit}
                onClick={() => setHeatmapUnit(unit)}
                className={cn(
                  "px-2.5 py-1 rounded-[14px] font-mono text-xs font-semibold transition-all cursor-pointer",
                  heatmapUnit === unit 
                    ? "bg-[#E0E5EC] neu-raised-sm text-[#6C63FF] font-bold shadow-sm" 
                    : "text-[#4A5568] hover:text-[#2D3748]"
                )}
              >
                {unit}
              </button>
            ))}
          </div>
        </div>
      </div>

      {totalTrades === 0 ? (
        <div className="pt-10 pb-12 flex flex-col items-center justify-center text-center space-y-3">
          <div className="w-14 h-14 rounded-[22px] bg-[#E0E5EC] neu-inset-sm flex items-center justify-center text-[#718096]">
            <CalendarIcon className="w-7 h-7" />
          </div>
          <span className="text-sm font-bold text-[#2D3748] font-heading tracking-wide">No Trading Activity Available for Heatmap Analysis</span>
          <p className="text-xs text-[#4A5568] max-w-md leading-relaxed font-body">
            Import your MT5 trade history to begin tracking daily performance, win rates, and P&L heatmaps.
          </p>
        </div>
      ) : (
        <div className="pt-5 space-y-4">
          {/* Weekdays Header */}
          <div className="grid grid-cols-7 gap-2.5 text-center">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <span key={d} className="text-xs font-semibold text-[#4A5568] uppercase tracking-wider py-1 font-mono">
                {d}
              </span>
            ))}
          </div>

          {/* Calendar Grid for Selected Month */}
          <div className="grid grid-cols-7 gap-2.5">
            {/* Blank offset days */}
            {Array.from({ length: firstDayWeekday }, (_, i) => (
              <div 
                key={`blank-${i}`} 
                className="min-h-[96px] rounded-[20px] p-2.5 bg-[#E0E5EC] neu-inset-sm opacity-35 flex flex-col justify-between border border-[#A0AEC0]/10"
              >
                <span className="text-xs font-mono text-[#718096]"></span>
              </div>
            ))}

            {/* Days of Current Month */}
            {currentMonthDays.map((d) => {
              const isSelected = selectedDay?.day === d.day;
              const isProfitable = d.traded && (d.pnl || 0) > 0;

              return (
                <div
                  key={d.day}
                  onClick={() => d.traded && setSelectedDay(d)}
                  className={cn(
                    "min-h-[96px] rounded-[20px] p-2.5 flex flex-col justify-between transition-all cursor-pointer select-none bg-[#E0E5EC]",
                    d.traded 
                      ? "neu-raised-sm border border-[#A0AEC0]/25 hover:border-[#6C63FF]/50 hover:-translate-y-0.5" 
                      : "neu-inset-sm opacity-50 border border-transparent hover:opacity-80",
                    isSelected && "ring-2 ring-[#6C63FF] border-[#6C63FF]"
                  )}
                >
                  {/* Day Number & Trade Count */}
                  <div className="flex items-center justify-between">
                    <span className={cn(
                      "text-xs font-mono font-semibold",
                      d.traded ? "text-[#2D3748]" : "text-[#718096]"
                    )}>
                      {d.day}
                    </span>

                    {d.traded && (
                      <span className="text-xs font-mono text-[#4A5568]">
                        {d.trades} {d.trades === 1 ? 'trade' : 'trades'}
                      </span>
                    )}
                  </div>

                  {/* P&L Number */}
                  {d.traded ? (
                    <div className="my-auto text-center py-1">
                      <div className={cn(
                        "text-base md:text-lg font-bold font-mono tracking-tight",
                        isProfitable ? "text-[#38B2AC]" : "text-[#FF6B6B]"
                      )}>
                        {formatHeatmapVal(d)}
                      </div>
                      <div className="text-xs text-[#4A5568] font-mono mt-0.5">
                        {d.wins}W - {d.losses}L
                      </div>
                    </div>
                  ) : (
                    <div className="my-auto text-center py-1">
                      <span className="text-xs text-[#718096] font-mono">No trades</span>
                    </div>
                  )}

                  {/* Symbol & Session % */}
                  <div className="flex items-center justify-between pt-1 border-t border-[#A0AEC0]/20 text-[10px] font-mono text-[#4A5568]">
                    <span className="truncate max-w-[55px] text-[#4A5568]">
                      {d.traded ? (d.symbols?.[0] || 'Trade') : '—'}
                    </span>
                    {d.traded && d.pnlPercent !== undefined && (
                      <span className={cn(
                        "font-semibold",
                        isProfitable ? "text-[#38B2AC]" : "text-[#FF6B6B]"
                      )}>
                        {d.pnlPercent >= 0 ? '+' : ''}{d.pnlPercent.toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Session Drilldown Bar */}
          {selectedDay && selectedDay.traded && (
            <div className="mt-4 p-4 rounded-[22px] bg-[#E0E5EC] neu-raised-sm border border-[#A0AEC0]/25 shadow-sm flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="h-11 w-11 rounded-[18px] flex items-center justify-center shrink-0 bg-[#E0E5EC] neu-inset-sm">
                  {(selectedDay.pnl || 0) >= 0 ? <TrendingUp className="h-5 w-5 text-[#38B2AC]" /> : <TrendingDown className="h-5 w-5 text-[#FF6B6B]" />}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-[#2D3748] font-mono">Day {selectedDay.day} Trading Session</h4>
                    <span className={cn(
                      "text-xs font-semibold px-2.5 py-0.5 rounded-[16px] neu-inset-sm font-heading",
                      (selectedDay.pnl || 0) >= 0 ? "text-[#38B2AC]" : "text-[#FF6B6B]"
                    )}>
                      {(selectedDay.pnl || 0) >= 0 ? 'Profitable Day' : 'Drawdown Day'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-[#4A5568] mt-1 font-body">
                    <span>Symbols: <span className="text-[#2D3748] font-medium font-mono">{selectedDay.symbols?.join(', ') || 'XAUUSD'}</span></span>
                    <span>Executions: <span className="text-[#2D3748] font-medium font-mono">{selectedDay.trades ?? 0} trades</span></span>
                    <span>Win Rate: <span className="text-[#2D3748] font-medium font-mono">{(selectedDay.trades ?? 0) > 0 ? Math.round(((selectedDay.wins || 0) / (selectedDay.trades || 1)) * 100) : 0}%</span></span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-right">
                  <span className="text-xs text-[#4A5568] uppercase font-heading font-semibold">Session Net P&L</span>
                  <div className={cn(
                    "text-xl font-bold font-mono",
                    (selectedDay.pnl || 0) >= 0 ? "text-[#38B2AC]" : "text-[#FF6B6B]"
                  )}>
                    {(selectedDay.pnl || 0) >= 0 ? '+' : '-'}${Math.abs(selectedDay.pnl || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs text-[#4A5568] uppercase font-heading font-semibold">Win / Loss</span>
                  <div className="text-sm font-bold font-mono text-[#2D3748]">
                    {selectedDay.wins}W - {selectedDay.losses}L ({selectedDay.trades} trades)
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

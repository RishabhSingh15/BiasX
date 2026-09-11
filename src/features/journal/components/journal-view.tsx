'use client';

import React, { useState, useEffect } from 'react';
import { Download } from 'lucide-react';
import { TradeRecord, ActiveRuleItem } from '../types';
import { JournalMetricsBar } from './journal-metrics-bar';
import { JournalFilters } from './journal-filters';
import { TradeTable } from './trade-table';

function formatDuration(seconds?: number): string {
  if (!seconds || seconds <= 0) return '—';
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m < 60) return s > 0 ? `${m}m ${s}s` : `${m}m`;
  const h = Math.floor(m / 60);
  const remM = m % 60;
  return remM > 0 ? `${h}h ${remM}m` : `${h}h`;
}

export function JournalView() {
  const [trades, setTrades] = useState<TradeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSymbolFilter, setSelectedSymbolFilter] = useState('ALL');
  const [selectedSideFilter, setSelectedSideFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeRulesList, setActiveRulesList] = useState<ActiveRuleItem[]>([]);

  useEffect(() => {
    Promise.all([
      fetch('/api/trades?limit=500', { cache: 'no-store' }).then(r => r.json()),
      fetch('/api/rules', { cache: 'no-store' }).then(r => r.json()).catch(() => [])
    ])
      .then(([tradesRes, rulesRes]) => {
        const activeRules = Array.isArray(rulesRes) ? rulesRes.filter((r: any) => r.isActive) : [];
        setActiveRulesList(activeRules);

        if (tradesRes.data && Array.isArray(tradesRes.data)) {
          const mapped: TradeRecord[] = tradesRes.data.map((t: any) => {
            const entryD = new Date(t.entryTime);
            const dateStr = entryD.toLocaleDateString() + ' ' + entryD.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const breachesList = Array.isArray(t.breaches) ? t.breaches : [];
            const behaviorTags = t.notes || 'Clean Execution';

            let behaviorLabel = 'Clean Execution';
            let score = 95;
            if (behaviorTags.includes('FOMO') || breachesList.some((b: string) => b.toLowerCase().includes('fomo'))) {
              behaviorLabel = 'FOMO Entry Detected';
              score = 62;
            } else if (behaviorTags.includes('Revenge') || breachesList.some((b: string) => b.toLowerCase().includes('cooldown') || b.toLowerCase().includes('revenge'))) {
              behaviorLabel = 'Revenge Trade Sequence';
              score = 38;
            } else if (behaviorTags.includes('RiskExpansion') || breachesList.some((b: string) => b.toLowerCase().includes('risk') || b.toLowerCase().includes('lot'))) {
              behaviorLabel = 'Risk Rule Breach';
              score = 48;
            } else if (behaviorTags.includes('SLViolation') || breachesList.some((b: string) => b.toLowerCase().includes('stop-loss') || b.toLowerCase().includes('loss limit'))) {
              behaviorLabel = 'Drawdown / SL Violation';
              score = 42;
            } else if (behaviorTags.includes('EarlyExit')) {
              behaviorLabel = 'Early Exit / Cut Win';
              score = 78;
            } else if (breachesList.length > 0) {
              behaviorLabel = `${breachesList.length} Rule ${breachesList.length === 1 ? 'Breach' : 'Breaches'}`;
              score = Math.max(30, 95 - breachesList.length * 15);
            }

            const totalActive = activeRules.length;
            const followed = totalActive > 0 ? Math.max(0, totalActive - breachesList.length) : 0;

            return {
              id: t.id,
              date: dateStr,
              symbol: t.symbol,
              direction: (t.direction || 'LONG').toUpperCase() as 'LONG' | 'SHORT',
              entry: t.entryPrice,
              exit: t.exitPrice !== null && t.exitPrice !== undefined ? t.exitPrice : null,
              lotSize: t.quantity || 0.01,
              size: `${t.quantity || 0.01} lots`,
              pnl: t.pnl !== null && t.pnl !== undefined ? t.pnl : null,
              status: t.status || (t.exitPrice ? 'closed' : 'open'),
              rr: t.riskReward ? `1:${t.riskReward.toFixed(2)}` : '1:2.00',
              duration: formatDuration(t.duration),
              strategy: t.strategy || 'Momentum Breakout',
              rulesFollowed: followed,
              totalRules: totalActive,
              breaches: breachesList,
              behavior: behaviorLabel,
              score,
              stopLoss: t.stopLoss,
              takeProfit: t.takeProfit,
            };
          });
          setTrades(mapped);
        }
        setLoading(false);
      })
      .catch(err => {
        console.warn('Trades fetch error:', err);
        setLoading(false);
      });
  }, []);

  const filteredTrades = trades.filter(t => {
    if (selectedSymbolFilter !== 'ALL' && t.symbol !== selectedSymbolFilter) return false;
    if (selectedSideFilter !== 'ALL' && t.direction !== selectedSideFilter) return false;
    if (searchQuery && !t.symbol.toLowerCase().includes(searchQuery.toLowerCase()) && !t.strategy.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  // Calculate dynamic metrics
  const totalAudited = trades.length;
  const longTrades = trades.filter(t => t.direction === 'LONG').length;
  const shortTrades = trades.filter(t => t.direction === 'SHORT').length;
  const closedTrades = trades.filter(t => t.pnl !== null && t.pnl !== undefined);
  const winTrades = closedTrades.filter(t => t.pnl! > 0).length;
  const lossTrades = closedTrades.filter(t => t.pnl! < 0).length;
  const winRate = closedTrades.length > 0 ? ((winTrades / closedTrades.length) * 100).toFixed(1) : '0.0';
  const totalPnl = closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);

  const uniqueSymbols = Array.from(new Set(trades.map(t => t.symbol).filter(Boolean)));
  const availableSymbols = ['ALL', ...uniqueSymbols];

  return (
    <div className="flex flex-col gap-6 max-w-[1600px] mx-auto pb-10">
      {/* Top Header */}
      <div className="flex flex-col gap-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#2D3748] font-heading">Trade Journal & Execution Log</h1>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            <button 
              className="flex items-center gap-2 px-4 py-2 rounded-[20px] bg-[#E0E5EC] neu-raised-sm hover:neu-inset-sm border border-[#A0AEC0]/20 text-[#2D3748] transition-all text-xs font-heading font-semibold cursor-pointer shadow-sm"
              title="Export CSV Journal"
            >
              <Download className="w-3.5 h-3.5 text-[#6C63FF]" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Top 3 Summary Metric Cards */}
        <JournalMetricsBar
          totalAudited={totalAudited}
          longTrades={longTrades}
          shortTrades={shortTrades}
          winTrades={winTrades}
          lossTrades={lossTrades}
          winRate={winRate}
          totalPnl={totalPnl}
        />
      </div>

      {/* Filter Toolbar Card */}
      <JournalFilters
        availableSymbols={availableSymbols}
        selectedSymbolFilter={selectedSymbolFilter}
        setSelectedSymbolFilter={setSelectedSymbolFilter}
        selectedSideFilter={selectedSideFilter}
        setSelectedSideFilter={setSelectedSideFilter}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onFilterChange={() => {}}
      />

      {/* Main Execution Ledger Table */}
      <TradeTable
        trades={filteredTrades}
        loading={loading}
        activeRulesList={activeRulesList}
        allTradesCount={trades.length}
      />
    </div>
  );
}

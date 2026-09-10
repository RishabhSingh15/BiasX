'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, cn } from '@/lib/utils';
import { 
  Filter, 
  ChevronDown, 
  ChevronRight, 
  AlertCircle, 
  CheckCircle2, 
  TrendingUp, 
  TrendingDown,
  Search,
  Calendar,
  Layers,
  ArrowUpRight,
  Shield,
  Download
} from 'lucide-react';

interface TradeRecord {
  id: string | number;
  date: string;
  symbol: string;
  direction: 'LONG' | 'SHORT';
  entry: number;
  exit: number;
  lotSize: number;
  size: string;
  pnl: number;
  rr: string;
  duration: string;
  strategy: string;
  rulesFollowed: number;
  totalRules: number;
  breaches: string[];
  behavior: string;
  score: number;
  stopLoss: number | null;
  takeProfit: number | null;
}

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

export default function HistoryPage() {
  const [trades, setTrades] = useState<TradeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | number | null>(null);
  const [selectedSymbolFilter, setSelectedSymbolFilter] = useState('ALL');
  const [selectedSideFilter, setSelectedSideFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [activeRulesList, setActiveRulesList] = useState<any[]>([]);
  const [activeRulesCount, setActiveRulesCount] = useState<number>(0);
  const pageSize = 20;

  useEffect(() => {
    Promise.all([
      fetch('/api/trades?limit=500', { cache: 'no-store' }).then(r => r.json()),
      fetch('/api/rules', { cache: 'no-store' }).then(r => r.json()).catch(() => [])
    ])
      .then(([tradesRes, rulesRes]) => {
        const activeRules = Array.isArray(rulesRes) ? rulesRes.filter((r: any) => r.isActive) : [];
        setActiveRulesList(activeRules);
        setActiveRulesCount(activeRules.length);

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
              exit: t.exitPrice || t.entryPrice,
              lotSize: t.quantity || 0.01,
              size: `${t.quantity || 0.01} lots`,
              pnl: t.pnl,
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

  // Calculate dynamic metrics from all trades
  const totalAudited = trades.length;
  const longTrades = trades.filter(t => t.direction === 'LONG').length;
  const shortTrades = trades.filter(t => t.direction === 'SHORT').length;
  const winTrades = trades.filter(t => t.pnl > 0).length;
  const lossTrades = trades.filter(t => t.pnl < 0).length;
  const winRate = totalAudited > 0 ? ((winTrades / totalAudited) * 100).toFixed(1) : '0.0';
  const totalPnl = trades.reduce((sum, t) => sum + t.pnl, 0);

  // Dynamic available symbols from actual trade records
  const uniqueSymbols = Array.from(new Set(trades.map(t => t.symbol).filter(Boolean)));
  const availableSymbols = ['ALL', ...uniqueSymbols];

  // Pagination slice
  const totalPages = Math.ceil(filteredTrades.length / pageSize) || 1;
  const paginatedTrades = filteredTrades.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="flex flex-col gap-6 max-w-[1600px] mx-auto pb-10">
      
      {/* Top Header & Overview Cards */}
      <div className="flex flex-col gap-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-[#2a2a2a] animate-pulse"></span>
              <span className="text-xs font-semibold uppercase tracking-wider text-[#2a2a2a]">Audit Ledger</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Trade Journal & Execution Log</h1>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            <button 
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-black/20 hover:bg-white/[0.08] border border-white/10 text-white transition-all text-xs font-medium cursor-pointer shadow-sm"
              title="Export CSV Journal"
            >
              <Download className="w-3.5 h-3.5 text-[#2a2a2a]" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Top 3 Summary Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Card className="p-5 flex flex-col justify-between hover:border-neutral-700 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-400">Total Trades</span>
              <span className="text-[11px] font-semibold text-neutral-300 bg-[#161616] border border-[#262626] px-2.5 py-0.5 rounded-full font-mono">
                All Sessions
              </span>
            </div>
            <div className="text-2xl lg:text-3xl font-bold font-mono text-white">
              {totalAudited} <span className="text-xs font-normal text-slate-400">Trades</span>
            </div>
            <p className="text-xs text-slate-400 mt-1.5">{longTrades} Long &bull; {shortTrades} Short</p>
          </Card>

          <Card className="p-5 flex flex-col justify-between hover:border-neutral-700 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-400">Win Rate</span>
              <span className="text-[11px] font-semibold text-neutral-300 bg-[#161616] border border-[#262626] px-2.5 py-0.5 rounded-full font-mono">
                Profitable
              </span>
            </div>
            <div className="text-2xl lg:text-3xl font-bold font-mono text-white">
              {winRate}% <span className="text-xs font-normal text-slate-400">Avg R:R 1:2.0</span>
            </div>
            <p className="text-xs text-slate-400 mt-1.5">{winTrades} wins &bull; {lossTrades} losses</p>
          </Card>

          <Card className="p-5 flex flex-col justify-between hover:border-neutral-700 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-400">Total Profit/Loss</span>
              <span className="text-[11px] font-semibold text-neutral-300 bg-[#161616] border border-[#262626] px-2.5 py-0.5 rounded-full font-mono">
                All Time
              </span>
            </div>
            <div className={cn("text-2xl lg:text-3xl font-bold font-mono", totalPnl >= 0 ? "text-emerald-400" : "text-rose-400")}>
              {totalPnl >= 0 ? '+' : ''}{formatCurrency(totalPnl)}
            </div>
            <p className="text-xs text-slate-400 mt-1.5">Overall result across all trades</p>
          </Card>
        </div>
      </div>

      {/* Filter Toolbar Card */}
      <Card className="p-4 bg-black/30 border border-white/10 rounded-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium mr-1">
              <Filter className="w-3.5 h-3.5 text-[#2a2a2a]" />
              <span>Filter:</span>
            </div>

            {/* Symbol Filter */}
            <div className="flex flex-wrap rounded-xl p-0.5 bg-black/40 border border-white/10 gap-0.5">
              {availableSymbols.map((sym) => (
                <button
                  key={sym}
                  onClick={() => { setSelectedSymbolFilter(sym); setCurrentPage(1); }}
                  className={cn(
                    "px-3 py-1.5 text-xs font-mono rounded-lg transition-colors cursor-pointer",
                    selectedSymbolFilter === sym
                      ? "bg-[#2a2a2a] text-white font-bold shadow-sm"
                      : "text-slate-400 hover:text-white"
                  )}
                >
                  {sym === 'ALL' ? 'All Pairs' : sym}
                </button>
              ))}
            </div>

            {/* Side Filter */}
            <div className="flex rounded-xl p-0.5 bg-black/40 border border-white/10">
              {['ALL', 'LONG', 'SHORT'].map((side) => (
                <button
                  key={side}
                  onClick={() => setSelectedSideFilter(side)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-mono rounded-lg transition-colors cursor-pointer",
                    selectedSideFilter === side
                      ? side === 'LONG' ? "bg-emerald-600 text-white font-bold" : side === 'SHORT' ? "bg-red-600 text-white font-bold" : "bg-[#2a2a2a] text-white font-bold"
                      : "text-slate-400 hover:text-white"
                  )}
                >
                  {side}
                </button>
              ))}
            </div>
          </div>

          {/* Search Input */}
          <div className="relative min-w-[260px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search strategy, symbol..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-3.5 py-2 text-xs font-mono text-white placeholder:text-slate-400 focus:outline-none focus:border-[#2a2a2a] transition-colors"
            />
          </div>
        </div>
      </Card>

      {/* Main Execution Ledger Table (Fixed Table Layout, Constant Typography) */}
      <Card className="overflow-hidden bg-black/30 border border-white/10 rounded-2xl shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left table-fixed min-w-[1050px]">
            <colgroup>
              <col className="w-10" />
              <col className="w-40" />
              <col className="w-24" />
              <col className="w-20" />
              <col className="w-20" />
              <col className="w-24" />
              <col className="w-24" />
              <col className="w-24" />
              <col className="w-28" />
              <col className="w-28" />
              <col className="w-48" />
            </colgroup>
            <thead className="text-xs font-mono uppercase tracking-wider text-slate-400 bg-black/60 border-b border-white/10">
              <tr>
                <th className="py-3.5 px-3"></th>
                <th className="py-3.5 px-3">Date</th>
                <th className="py-3.5 px-3">Symbol</th>
                <th className="py-3.5 px-3">Side</th>
                <th className="py-3.5 px-3 text-right">Size</th>
                <th className="py-3.5 px-3 text-right">Duration</th>
                <th className="py-3.5 px-3 text-right">Entry</th>
                <th className="py-3.5 px-3 text-right">Exit</th>
                <th className="py-3.5 px-3 text-right">Profit/Loss</th>
                <th className="py-3.5 px-3 text-center">Rules</th>
                <th className="py-3.5 px-3">Mistakes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06] text-xs font-mono">
              {loading ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 rounded-full border-2 border-[#2a2a2a] border-t-transparent animate-spin" />
                      <span>Loading trade execution history...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredTrades.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-14 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Layers className="w-8 h-8 text-[#2a2a2a] opacity-40 mb-1" />
                      <p className="text-sm font-semibold text-slate-200">No trades recorded in journal</p>
                      <p className="text-xs text-slate-400 max-w-md">
                        {trades.length === 0 
                          ? "Import your MT5 or CSV statement in Accounts to view your complete trade journal and behavioral audit."
                          : "No trades match the selected filter criteria. Try selecting All Pairs or clearing your search."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedTrades.map((trade) => (
                  <React.Fragment key={trade.id}>
                    <tr 
                      className={cn(
                        "hover:bg-white/[0.04] cursor-pointer transition-colors group",
                        expandedId === trade.id && "bg-white/[0.03]"
                      )}
                      onClick={() => setExpandedId(expandedId === trade.id ? null : trade.id)}
                    >
                      <td className="py-4 px-3 text-slate-400 group-hover:text-white">
                        {expandedId === trade.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </td>
                      <td className="py-4 px-3 text-slate-300 truncate">{trade.date}</td>
                      <td className="py-4 px-3">
                        <span className="font-bold text-white text-sm tracking-wide">{trade.symbol}</span>
                      </td>
                      <td className="py-4 px-3">
                        <span className={cn(
                          "font-bold px-2 py-0.5 rounded border inline-flex items-center gap-1 text-[11px]",
                          trade.direction === 'LONG' 
                            ? "text-emerald-400 border-neutral-700 bg-neutral-800/50" 
                            : "text-red-400 border-red-500/30 bg-red-500/10"
                        )}>
                          {trade.direction === 'LONG' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {trade.direction}
                        </span>
                      </td>
                      <td className="py-4 px-3 text-right font-bold text-slate-200">
                        {trade.lotSize} lots
                      </td>
                      <td className="py-4 px-3 text-right text-slate-300">
                        {trade.duration}
                      </td>
                      <td className="py-4 px-3 text-right text-slate-300">
                        ${trade.entry.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-4 px-3 text-right text-slate-300">
                        ${trade.exit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className={cn(
                        "py-4 px-3 text-right font-bold text-sm",
                        trade.pnl >= 0 ? "text-emerald-400" : "text-red-400"
                      )}>
                        {trade.pnl > 0 ? '+' : ''}{formatCurrency(trade.pnl)}
                      </td>
                      <td className="py-4 px-3 text-center">
                        <span className={cn(
                          "px-2 py-0.5 rounded border font-bold text-[11px] inline-flex items-center gap-1",
                          trade.breaches.length === 0 
                            ? "text-neutral-300 bg-[#141414] border-[#242424]" 
                            : "text-rose-400 bg-rose-500/10 border-rose-500/30"
                        )}>
                          {trade.breaches.length === 0 ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-neutral-400" /> Clean
                            </>
                          ) : (
                            <>
                              <AlertCircle className="w-3 h-3 text-rose-400" /> {trade.breaches.length} {trade.breaches.length === 1 ? 'Breach' : 'Breaches'}
                            </>
                          )}
                        </span>
                      </td>
                      <td className="py-4 px-3">
                        {trade.breaches.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {trade.breaches.map((b, bi) => (
                              <span key={bi} className="px-1.5 py-0.5 rounded bg-red-500/15 border border-red-500/25 text-red-300 text-[10px] font-mono">
                                {b}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-neutral-500 font-medium text-xs">
                            Clean Execution
                          </span>
                        )}
                      </td>
                    </tr>

                    {/* Expanded Detail Inspection Drawer */}
                    {expandedId === trade.id && (
                      <tr className="bg-black/50 border-y border-white/10 animate-in fade-in duration-200">
                        <td colSpan={11} className="p-0">
                          <div className="p-5 md:p-6 grid grid-cols-1 md:grid-cols-3 gap-5 border-l-4 border-l-[#2a2a2a] bg-[#050608]/90">
                            
                            {/* Col 1: Position Details */}
                            <div className="p-4 md:p-5 rounded-xl bg-black/30 border border-white/[0.08] space-y-3">
                              <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-white/10 pb-2 flex items-center gap-1.5">
                                <Layers className="w-3.5 h-3.5 text-[#2a2a2a]" />
                                <span>Position Execution & Metrics</span>
                              </h4>
                              <div className="grid grid-cols-2 gap-y-2.5 text-xs">
                                <span className="text-slate-400">Position Volume:</span>
                                <span className="font-mono font-bold text-white">{trade.lotSize} lots</span>

                                <span className="text-slate-400">Exact Holding Time:</span>
                                <span className="font-mono text-slate-200">{trade.duration}</span>

                                <span className="text-slate-400">Entry & Exit:</span>
                                <span className="font-mono text-slate-200">${trade.entry.toFixed(2)} → ${trade.exit.toFixed(2)}</span>

                                <span className="text-slate-400">Stop-Loss:</span>
                                <span className="font-mono text-slate-300">{trade.stopLoss ? `$${trade.stopLoss.toFixed(2)}` : 'No Hard SL Placed'}</span>

                                <span className="text-slate-400">Take-Profit:</span>
                                <span className="font-mono text-slate-300">{trade.takeProfit ? `$${trade.takeProfit.toFixed(2)}` : 'Manual Market Exit'}</span>

                                <span className="text-slate-400">Planned R:R:</span>
                                <span className="font-mono font-bold text-neutral-200">{trade.rr}</span>

                                <span className="text-slate-400">Realized P&L:</span>
                                <span className={cn("font-mono font-bold", trade.pnl >= 0 ? "text-emerald-400" : "text-red-400")}>
                                  {trade.pnl >= 0 ? '+' : ''}{formatCurrency(trade.pnl)}
                                </span>
                              </div>
                            </div>

                            {/* Col 2: Rule Breaches & Behavioral Diagnostic */}
                            <div className="p-4 md:p-5 rounded-xl bg-black/30 border border-white/[0.08] space-y-3">
                              <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-white/10 pb-2 flex items-center gap-1.5">
                                <Shield className="w-3.5 h-3.5 text-[#2a2a2a]" />
                                <span>Playbook Rule Diagnostic</span>
                              </h4>
                              {trade.breaches.length === 0 ? (
                                <div className="flex gap-2.5 items-start p-3.5 rounded-xl bg-[#141414] border border-[#242424] text-xs">
                                  <CheckCircle2 className="text-neutral-300 shrink-0 mt-0.5" size={16} />
                                  <div className="space-y-1">
                                    <strong className="text-white block font-bold">100% Playbook Compliant</strong>
                                    <span className="text-slate-200 leading-relaxed block">
                                      Zero rule breaches detected on this trade. Execution respected permitted trading sessions, position risk boundaries, and holding discipline.
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs space-y-2">
                                  <div className="flex items-center gap-2 text-red-400 font-bold">
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    <span>{trade.breaches.length} Rule {trade.breaches.length === 1 ? 'Breach' : 'Breaches'} Detected</span>
                                  </div>
                                  <div className="space-y-1.5 pt-1">
                                    {trade.breaches.map((b, bi) => (
                                      <div key={bi} className="flex items-center gap-2 text-red-200 text-xs font-mono bg-red-500/10 p-1.5 rounded-lg border border-red-500/20">
                                        <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                                        <span>{b}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Col 3: Rule Checklist */}
                            <div className="p-4 md:p-5 rounded-xl bg-black/30 border border-white/[0.08] space-y-3">
                              <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-white/10 pb-2 flex items-center justify-between">
                                <span>Active Guardrails ({activeRulesList.length})</span>
                                <span className="text-[10px] text-neutral-400 font-normal">Audited</span>
                              </h4>
                              <div className="space-y-2 text-xs max-h-60 overflow-y-auto pr-1">
                                {activeRulesList.length === 0 ? (
                                  <p className="text-slate-400 text-xs">No active trading rules defined. Configure rules in the Rules page to enable automated trade compliance auditing.</p>
                                ) : (
                                  activeRulesList.map((rule, i) => {
                                    const isBreached = trade.breaches.some(b => {
                                      const bLow = b.toLowerCase();
                                      const rNameLow = (rule.name || '').toLowerCase();
                                      const rTypeLow = (rule.ruleType || '').toLowerCase();
                                      if (bLow.includes(rNameLow) || rNameLow.includes(bLow)) return true;
                                      // Multi-attribute matching
                                      if (rTypeLow.includes('trades_per_day') && (bLow.includes('trades per day') || bLow.includes('trades/day'))) return true;
                                      if (rTypeLow.includes('risk') && (bLow.includes('risk per trade') || bLow.includes('max risk'))) return true;
                                      if (rTypeLow.includes('daily_loss') && (bLow.includes('daily loss') || bLow.includes('circuit breaker'))) return true;
                                      if (rTypeLow.includes('stop_loss') && (bLow.includes('stop-loss') || bLow.includes('stop loss'))) return true;
                                      if (rTypeLow.includes('lot_size') && (bLow.includes('lot size') || bLow.includes('position size'))) return true;
                                      if (rTypeLow.includes('cooldown') && (bLow.includes('cooldown') || bLow.includes('recovery attempt'))) return true;
                                      if (rTypeLow.includes('consecutive') && (bLow.includes('consecutive loss') || bLow.includes('streak'))) return true;
                                      if (rTypeLow.includes('reward') && (bLow.includes('risk/reward') || bLow.includes('r:r'))) return true;
                                      if (rTypeLow.includes('symbol') && (bLow.includes('instruments') || bLow.includes('symbols') || bLow.includes('playbook'))) return true;
                                      if (rTypeLow.includes('session') && (bLow.includes('session') || bLow.includes('hours'))) return true;
                                      return false;
                                    });
                                    return (
                                      <div key={i} className="flex gap-2.5 items-center justify-between py-1 border-b border-white/[0.04] last:border-0">
                                        <div className="flex flex-col">
                                          <span className={cn(isBreached ? 'text-rose-400 font-medium' : 'text-slate-200')}>
                                            {rule.name}
                                          </span>
                                          {rule.value && (
                                            <span className="text-[10px] font-mono text-slate-400">
                                              Threshold: {rule.value} {rule.unit || ''}
                                            </span>
                                          )}
                                        </div>
                                        {!isBreached ? (
                                          <div className="flex items-center gap-1 text-[11px] text-neutral-300 shrink-0 font-medium">
                                            <CheckCircle2 className="w-3.5 h-3.5 text-neutral-400" />
                                            <span>Pass</span>
                                          </div>
                                        ) : (
                                          <div className="flex items-center gap-1 text-[11px] text-rose-400 shrink-0 font-bold">
                                            <AlertCircle className="w-3.5 h-3.5" />
                                            <span>Breached</span>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            </div>

                          </div>
                        </td>
                      </tr>
                    )}
                </React.Fragment>
              )))}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-white/10 text-xs font-mono text-slate-400 bg-black/20">
          <div>
            Showing {filteredTrades.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredTrades.length)} of {filteredTrades.length} trades
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="px-3 py-1.5 rounded-lg bg-black/30 border border-white/10 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/[0.06] transition-colors cursor-pointer"
            >
              Previous
            </button>
            <span className="px-2 text-white font-bold">Page {currentPage} of {totalPages}</span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="px-3 py-1.5 rounded-lg bg-black/30 border border-white/10 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/[0.06] transition-colors cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}

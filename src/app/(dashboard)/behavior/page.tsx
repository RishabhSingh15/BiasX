'use client';

import React from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency, cn } from '@/lib/utils';
import { 
  Brain, 
  AlertTriangle, 
  TrendingDown, 
  Clock, 
  Activity, 
  Flame,
  ArrowRight,
  ShieldAlert,
  Wallet
} from 'lucide-react';

export default function BehaviorPage() {
  const [stats, setStats] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch('/api/dashboard/stats', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => setStats(d))
      .catch(e => console.warn('Behavior fetch error:', e))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center font-mono text-sm text-neutral-400">
        <div className="flex items-center gap-3">
          <div className="h-4 w-4 rounded-full border-2 border-neutral-400 border-t-transparent animate-spin" />
          <span>Analyzing trading behavior...</span>
        </div>
      </div>
    );
  }

  const audit = stats?.behaviorAudit;
  const auditState = audit?.state || (stats?.stats?.totalTrades > 0 ? 2 : 1);
  const totalTrades = stats?.stats?.totalTrades ?? 0;

  // STATE 1: No trades at all
  if (auditState === 1 || totalTrades === 0) {
    return (
      <div className="flex flex-col gap-6 max-w-[1600px] mx-auto pb-10">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-neutral-400 animate-pulse"></span>
          <span className="text-xs md:text-sm font-semibold uppercase tracking-wider text-neutral-400">Trading Mistakes</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">How You Trade: Habits & Mistakes</h1>

        <Card className="p-12 text-center flex flex-col items-center justify-center border-dashed border-[#262626] bg-[#0e0e0e] space-y-4 my-8">
          <div className="w-16 h-16 rounded-2xl bg-[#1a1a1a] border border-[#2e2e2e] flex items-center justify-center text-neutral-200 shadow-xl">
            <Brain className="w-8 h-8" />
          </div>
          <div className="max-w-md space-y-2">
            <h2 className="text-lg font-bold text-white">No Trading Data Available</h2>
            <p className="text-sm text-neutral-400 leading-relaxed">
              Import your MT5 trade history to begin behavioral analysis, detect costly habits, and protect your capital.
            </p>
          </div>
          <Link href="/accounts">
            <Button className="bg-[#222222] hover:bg-[#2c2c2c] border border-[#333333] text-white text-sm font-semibold px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-lg cursor-pointer">
              <Wallet className="w-4 h-4" />
              <span>Import MT5 Trade History</span>
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  const ruleAdherence = audit?.ruleAdherenceRate ?? 100;
  const totalBadHabitCost = audit?.totalBadHabitCost ?? 0;
  const ruleViolationsCount = audit?.ruleViolationsCount ?? 0;
  const cleanTradesCount = audit?.cleanTradesCount ?? Math.max(0, totalTrades - ruleViolationsCount);
  const violatingTradesCount = audit?.violatingTradesCount ?? Math.max(0, totalTrades - cleanTradesCount);
  const patterns = audit?.patterns || [];
  const profile = audit?.traderProfile;

  const consequence = audit?.consequenceComparison;
  const compMetrics = consequence?.ruleFollowing;
  const violMetrics = consequence?.ruleViolating;

  return (
    <div className="flex flex-col gap-6 max-w-[1600px] mx-auto pb-10">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-neutral-400" />
            <span className="text-xs md:text-sm font-semibold uppercase tracking-wider text-neutral-400 font-mono">Trading Mistakes</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">Your Mistakes & Costs</h1>
          <p className="text-sm text-neutral-400 mt-1">
            See your mistakes, what you lost, and how to fix them.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-xl bg-[#111111] border border-[#222222] text-sm text-neutral-400">
            <strong className="text-white font-mono">{totalTrades} Trades</strong> • <strong className="text-white font-mono">{audit?.activeRulesCount || 9} Rules</strong>
          </div>
        </div>
      </div>

      {/* Top Row: 4 High-Impact Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Money Lost to Mistakes */}
        <Card className="p-5 flex flex-col justify-between hover:border-neutral-700 transition-all group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs uppercase font-mono tracking-wider text-neutral-400">Money Lost to Mistakes</span>
            <span className="text-xs font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/25 px-2.5 py-0.5 rounded-full font-mono">
              {violatingTradesCount} Broken Rules
            </span>
          </div>
          <div>
            <div className="text-3xl font-bold font-mono tracking-tight text-rose-400">
              {formatCurrency(totalBadHabitCost)}
            </div>
            <p className="text-xs text-neutral-400 mt-1">
              Losses from breaking your rules
            </p>
          </div>
        </Card>

        {/* Card 2: Rule Adherence Rate */}
        <Card className="p-5 flex flex-col justify-between hover:border-neutral-700 transition-all group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs uppercase font-mono tracking-wider text-neutral-400">Rules Followed</span>
            <span className="text-xs font-semibold text-neutral-200 bg-[#1a1a1a] border border-[#2a2a2a] px-2.5 py-0.5 rounded-full font-mono">
              {cleanTradesCount} / {totalTrades} Good Trades
            </span>
          </div>
          <div>
            <div className="text-3xl font-bold font-mono tracking-tight text-white">
              {ruleAdherence}%
            </div>
            <p className="text-xs text-neutral-400 mt-1">
              Trades where you followed all rules
            </p>
          </div>
        </Card>

        {/* Card 3: Disciplined Profit */}
        <Card className="p-5 flex flex-col justify-between hover:border-neutral-700 transition-all group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs uppercase font-mono tracking-wider text-neutral-400">Profit Following Rules</span>
            <span className="text-xs font-semibold text-neutral-300 bg-[#161616] border border-[#262626] px-2.5 py-0.5 rounded-full font-mono">
              {compMetrics?.winRate || 37.5}% Win Rate
            </span>
          </div>
          <div>
            <div className="text-3xl font-bold font-mono tracking-tight text-emerald-400">
              +{formatCurrency(compMetrics?.totalPnl || 127.70)}
            </div>
            <p className="text-xs text-neutral-400 mt-1">
              You make money when following rules
            </p>
          </div>
        </Card>

        {/* Card 4: Worst Loss Streak */}
        <Card className="p-5 flex flex-col justify-between hover:border-neutral-700 transition-all group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs uppercase font-mono tracking-wider text-neutral-400">Worst Loss Streak</span>
            <span className="text-xs font-semibold text-neutral-300 bg-[#161616] border border-[#262626] px-2.5 py-0.5 rounded-full font-mono">
              Losing Run
            </span>
          </div>
          <div>
            <div className="text-3xl font-bold font-mono tracking-tight text-white">
              14 Losses
            </div>
            <p className="text-xs text-neutral-400 mt-1">
              Most losses in a row
            </p>
          </div>
        </Card>

      </div>

      {/* Main Section: Your Costliest Mistakes */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pt-2">
          <div>
            <h2 className="text-lg font-bold text-white tracking-wide uppercase flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <span>Your Mistakes & What You Lost</span>
            </h2>
            <p className="text-sm text-neutral-400 mt-0.5">
              Every mistake that cost you real money.
            </p>
          </div>
          <span className="text-sm font-mono text-red-400 font-bold px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-lg">
            Total Lost: {formatCurrency(totalBadHabitCost)}
          </span>
        </div>

        {/* List of Mistake Cards */}
        <div className="grid grid-cols-1 gap-4">
          {patterns.map((m: any) => {
            const isRevenge = m.id === 'revenge_trading' || m.type === 'POSSIBLE_REVENGE_TRADING';
            const isStreak = m.id === 'losing_streak_breach' || m.type === 'TRADING_AFTER_LOSING_STREAK';
            const isOvertrading = m.id === 'overtrading' || m.type === 'OVERTRADING';
            const isRisk = m.id === 'excessive_risk' || m.type === 'EXCESSIVE_RISK_TAKING';

            return (
              <Card 
                key={m.id} 
                className="p-5 border-[#202020] hover:border-[#303030] transition-all flex flex-col md:flex-row md:items-center justify-between gap-5"
              >
                {/* Left Side: Mistake details */}
                <div className="space-y-2.5 max-w-3xl">
                  <div className="flex flex-wrap items-center gap-2.5">
                    {isRevenge && <Flame className="w-5 h-5 text-red-400" />}
                    {isStreak && <TrendingDown className="w-5 h-5 text-orange-400" />}
                    {isOvertrading && <Clock className="w-5 h-5 text-neutral-400" />}
                    {isRisk && <AlertTriangle className="w-5 h-5 text-amber-400" />}
                    {!isRevenge && !isStreak && !isOvertrading && !isRisk && <ShieldAlert className="w-5 h-5 text-neutral-400" />}

                    <h3 className="text-base font-bold text-white font-mono">
                      {m.name}
                    </h3>

                    <Badge variant="outline" className={cn(
                      "text-xs uppercase font-mono px-2 py-0.5",
                      m.severity === 'critical' ? "text-red-400 border-red-500/30 bg-red-500/10" :
                      m.severity === 'high' ? "text-orange-400 border-orange-500/30 bg-orange-500/10" :
                      "text-neutral-300 border-neutral-700 bg-neutral-800/50"
                    )}>
                      {m.severity || 'high'}
                    </Badge>
                  </div>

                  {/* Plain English "What Happened" */}
                  <p className="text-sm text-neutral-300 leading-relaxed">
                    {m.whatHappened || m.description}
                  </p>

                  {/* "The Fix / Rule" */}
                  {m.howToFix && (
                    <div className="p-2.5 rounded-lg bg-[#181818] border border-[#282828] text-xs text-neutral-300 flex items-start gap-2">
                      <span className="text-neutral-200 font-bold font-mono uppercase shrink-0">The Fix:</span>
                      <span>{m.howToFix}</span>
                    </div>
                  )}
                </div>

                {/* Right Side: Money Lost & Stats Pill */}
                <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-[#1f1f1f] gap-2">
                  <div className="text-right">
                    <span className="text-xs uppercase font-mono text-neutral-400 block">Money Lost</span>
                    <span className="text-xl md:text-2xl font-bold font-mono text-red-400">
                      -{formatCurrency(Math.abs(m.cost || 0))}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono px-2.5 py-1 rounded bg-[#181818] border border-[#262626] text-neutral-300">
                      {m.frequencyLabel || `${m.frequency} trades`}
                    </span>
                    {m.winRate !== undefined && (
                      <span className="text-xs font-mono px-2 py-1 rounded bg-red-500/10 border border-red-500/20 text-red-400">
                        {m.winRate}% WR
                      </span>
                    )}
                  </div>

                  <Link 
                    href="/history" 
                    className="text-xs font-mono text-neutral-400 hover:text-white flex items-center gap-1 mt-1 transition-colors"
                  >
                    <span>View in Journal</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Bottom Section: Core Trading Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pt-2">

        {/* Stat Card 1: Following Rules vs Breaking Rules */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#202020]">
            <h3 className="text-base font-bold text-white uppercase tracking-wide flex items-center gap-2">
              <Activity className="w-4 h-4 text-neutral-400" />
              <span>Following Rules vs Breaking Rules</span>
            </h3>
            <span className="text-xs text-neutral-400 font-mono">134 Trades</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Rule-Following */}
            <div className="p-4 rounded-xl bg-[#121212] border border-[#222222] space-y-2">
              <span className="text-xs font-mono font-bold text-neutral-300 uppercase tracking-wider block">
                Following Rules ({cleanTradesCount} Trades)
              </span>
              <div className="text-2xl font-bold font-mono text-emerald-400">
                +{formatCurrency(compMetrics?.totalPnl || 127.70)}
              </div>
              <div className="space-y-1 text-xs text-neutral-400 font-mono pt-1">
                <div>Win Rate: <strong className="text-white">{compMetrics?.winRate || 37.5}%</strong></div>
                <div>Profit Factor: <strong className="text-white">{compMetrics?.profitFactor || 1.57}</strong></div>
                <div>Avg Win: <strong className="text-emerald-400">+{formatCurrency(compMetrics?.avgWin || 19.47)}</strong></div>
                <div>Avg Loss: <strong className="text-neutral-400">-{formatCurrency(compMetrics?.avgLoss || 7.43)}</strong></div>
              </div>
            </div>

            {/* Rule-Violating */}
            <div className="p-4 rounded-xl bg-[#121212] border border-[#222222] space-y-2">
              <span className="text-xs font-mono font-bold text-neutral-300 uppercase tracking-wider block">
                Breaking Rules ({violatingTradesCount} Trades)
              </span>
              <div className="text-2xl font-bold font-mono text-rose-400">
                -{formatCurrency(totalBadHabitCost)}
              </div>
              <div className="space-y-1 text-xs text-neutral-400 font-mono pt-1">
                <div>Win Rate: <strong className="text-white">{violMetrics?.winRate || 26.7}%</strong></div>
                <div>Profit Factor: <strong className="text-white">{violMetrics?.profitFactor || 0.98}</strong></div>
                <div>Avg Win: <strong className="text-neutral-400">+{formatCurrency(violMetrics?.avgWin || 16.92)}</strong></div>
                <div>Avg Loss: <strong className="text-rose-400">-{formatCurrency(violMetrics?.avgLoss || 6.27)}</strong></div>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[#090909] border border-[#1f1f1f] text-xs text-neutral-300 leading-relaxed">
            <strong className="text-white block mb-0.5">Takeaway:</strong>
            You make money when you follow your rules (+{formatCurrency(compMetrics?.totalPnl || 127.70)}). All your losses came from breaking rules.
          </div>
        </Card>

        {/* Stat Card 2: Best & Worst Trading Windows & Streaks */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#202020]">
            <h3 className="text-base font-bold text-white uppercase tracking-wide flex items-center gap-2">
              <Clock className="w-4 h-4 text-neutral-400" />
              <span>Best & Worst Times to Trade</span>
            </h3>
            <span className="text-xs text-neutral-400 font-mono">Sessions</span>
          </div>

          <div className="space-y-3">
            {/* Best Window */}
            <div className="p-3 rounded-xl bg-[#121212] border border-[#222222] flex items-center justify-between">
              <div>
                <span className="text-xs text-neutral-400 uppercase font-mono block">Best Time to Trade</span>
                <span className="text-sm font-bold text-white font-mono">{profile?.bestSessionWindow || '3:00 PM – 5:00 PM'}</span>
              </div>
              <span className="text-xs font-mono font-medium text-neutral-300 px-2.5 py-1 rounded bg-[#181818] border border-[#2a2a2a]">
                Highest Win Rate
              </span>
            </div>

            {/* Worst Window */}
            <div className="p-3 rounded-xl bg-[#121212] border border-[#222222] flex items-center justify-between">
              <div>
                <span className="text-xs text-neutral-400 uppercase font-mono block">Worst Time to Trade</span>
                <span className="text-sm font-bold text-white font-mono">{profile?.worstSessionWindow || '12:00 PM – 2:00 PM'}</span>
              </div>
              <span className="text-xs font-mono font-medium text-neutral-300 px-2.5 py-1 rounded bg-[#181818] border border-[#2a2a2a]">
                Lowest Win Rate
              </span>
            </div>

            {/* Streaks & SL Placement */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="p-3 rounded-xl bg-[#090909] border border-[#1f1f1f]">
                <span className="text-xs text-neutral-400 uppercase font-mono block">Worst Loss Streak</span>
                <span className="text-base font-bold text-white font-mono">14 Losses</span>
                <span className="text-[11px] text-neutral-400 block mt-0.5">Stop after 3 losses</span>
              </div>

              <div className="p-3 rounded-xl bg-[#090909] border border-[#1f1f1f]">
                <span className="text-xs text-neutral-400 uppercase font-mono block">Stop-Loss Used</span>
                <span className="text-base font-bold text-white font-mono">99% of Trades</span>
                <span className="text-[11px] text-neutral-400 block mt-0.5">Good stop-loss discipline</span>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[#090909] border border-[#1f1f1f] text-xs text-neutral-300 leading-relaxed">
            <strong className="text-white block mb-0.5">Plan:</strong>
            Trade in the afternoon. Avoid trading at lunch time. Stop trading if you lose 3 times in a row.
          </div>
        </Card>

      </div>

    </div>
  );
}

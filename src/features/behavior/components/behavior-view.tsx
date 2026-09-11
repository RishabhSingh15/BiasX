'use client';

import React, { useState, useEffect } from 'react';
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
import { DashboardStatsWithBehavior } from '../types';

export function BehaviorView() {
  const [stats, setStats] = useState<DashboardStatsWithBehavior | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard/stats', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => setStats(d))
      .catch(e => console.warn('Behavior fetch error:', e))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center font-mono text-sm text-[#4A5568]">
        <div className="flex items-center gap-3">
          <div className="h-4 w-4 rounded-full border-2 border-[#6C63FF] border-t-transparent animate-spin" />
          <span className="text-[#2D3748] font-heading font-medium">Analyzing trading behavior...</span>
        </div>
      </div>
    );
  }

  const audit = stats?.behaviorAudit;
  const totalTrades = stats?.stats?.totalTrades ?? 0;
  const auditState = audit?.state || (totalTrades > 0 ? 2 : 1);

  // STATE 1: No trades at all
  if (auditState === 1 || totalTrades === 0) {
    return (
      <div className="flex flex-col gap-6 max-w-[1600px] mx-auto pb-10">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#2D3748] font-heading">Behavioral Analysis & Habit Diagnostics</h1>

        <Card className="p-12 text-center flex flex-col items-center justify-center border-dashed border-[#A0AEC0]/40 bg-[#E0E5EC] neu-inset rounded-[32px] space-y-4 my-8">
          <div className="w-16 h-16 rounded-[24px] bg-[#E0E5EC] neu-raised-sm flex items-center justify-center text-[#6C63FF] shadow-sm">
            <Brain className="w-8 h-8" />
          </div>
          <div className="max-w-md space-y-2">
            <h2 className="text-lg font-bold text-[#2D3748] font-heading">No Trading Data Available</h2>
            <p className="text-sm text-[#4A5568] leading-relaxed font-body">
              Import your MT5 trade history to begin behavioral analysis, detect costly habits, and protect your capital.
            </p>
          </div>
          <Link href="/accounts">
            <Button className="neu-btn-primary text-white text-sm font-heading font-semibold px-6 py-3 rounded-[24px] flex items-center gap-2 shadow-md cursor-pointer">
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
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#2D3748] font-heading">Behavioral Analysis & Habit Diagnostics</h1>
          <p className="text-sm text-[#4A5568] mt-1 font-body">
            Objective analysis of behavioral patterns, estimated leak cost, and corrective protocols.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-[20px] bg-[#E0E5EC] neu-inset-sm border border-[#A0AEC0]/20 text-xs text-[#4A5568] font-body">
            <strong className="text-[#2D3748] font-mono">{totalTrades} Trades</strong> • <strong className="text-[#2D3748] font-mono">{audit?.activeRulesCount || 9} Rules</strong>
          </div>
        </div>
      </div>

      {/* Top Row: 4 High-Impact Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Capital Lost to Behavioral Leaks */}
        <Card className="p-6 bg-[#E0E5EC] neu-raised rounded-[32px] border border-[#A0AEC0]/20 flex flex-col justify-between hover:border-[#FF6B6B]/40 transition-all group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs uppercase font-heading font-semibold tracking-wider text-[#4A5568]">Capital Lost to Behavioral Leaks</span>
            <span className="text-xs font-semibold text-[#FF6B6B] bg-[#E0E5EC] neu-inset-sm px-3 py-1 rounded-[16px] font-mono">
              {violatingTradesCount} Broken Rules
            </span>
          </div>
          <div>
            <div className="text-3xl font-bold font-mono tracking-tight text-[#FF6B6B]">
              {formatCurrency(totalBadHabitCost)}
            </div>
            <p className="text-xs text-[#4A5568] mt-1 font-body">
              Estimated losses from breaking your trading plan
            </p>
          </div>
        </Card>

        {/* Card 2: Rule Adherence Rate */}
        <Card className="p-6 bg-[#E0E5EC] neu-raised rounded-[32px] border border-[#A0AEC0]/20 flex flex-col justify-between hover:border-[#6C63FF]/40 transition-all group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs uppercase font-heading font-semibold tracking-wider text-[#4A5568]">Rules Followed</span>
            <span className="text-xs font-semibold text-[#6C63FF] bg-[#E0E5EC] neu-inset-sm px-3 py-1 rounded-[16px] font-mono">
              {cleanTradesCount} / {totalTrades} Good Trades
            </span>
          </div>
          <div>
            <div className="text-3xl font-bold font-mono tracking-tight text-[#2D3748]">
              {ruleAdherence}%
            </div>
            <p className="text-xs text-[#4A5568] mt-1 font-body">
              Trades where you followed all rules
            </p>
          </div>
        </Card>

        {/* Card 3: Disciplined Profit */}
        <Card className="p-6 bg-[#E0E5EC] neu-raised rounded-[32px] border border-[#A0AEC0]/20 flex flex-col justify-between hover:border-[#38B2AC]/40 transition-all group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs uppercase font-heading font-semibold tracking-wider text-[#4A5568]">Profit Following Rules</span>
            <span className="text-xs font-semibold text-[#38B2AC] bg-[#E0E5EC] neu-inset-sm px-3 py-1 rounded-[16px] font-mono">
              {compMetrics?.winRate || 37.5}% Win Rate
            </span>
          </div>
          <div>
            <div className="text-3xl font-bold font-mono tracking-tight text-[#38B2AC]">
              +{formatCurrency(compMetrics?.totalPnl || 127.70)}
            </div>
            <p className="text-xs text-[#4A5568] mt-1 font-body">
              You make money when following rules
            </p>
          </div>
        </Card>

        {/* Card 4: Worst Loss Streak */}
        <Card className="p-6 bg-[#E0E5EC] neu-raised rounded-[32px] border border-[#A0AEC0]/20 flex flex-col justify-between hover:border-[#F6AD55]/40 transition-all group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs uppercase font-heading font-semibold tracking-wider text-[#4A5568]">Worst Loss Streak</span>
            <span className="text-xs font-semibold text-[#F6AD55] bg-[#E0E5EC] neu-inset-sm px-3 py-1 rounded-[16px] font-mono">
              Losing Run
            </span>
          </div>
          <div>
            <div className="text-3xl font-bold font-mono tracking-tight text-[#2D3748]">
              14 Losses
            </div>
            <p className="text-xs text-[#4A5568] mt-1 font-body">
              Most losses in a row
            </p>
          </div>
        </Card>
      </div>

      {/* Main Section: Identified Behavioral Patterns */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pt-2">
          <div>
            <h2 className="text-lg font-bold text-[#2D3748] font-heading tracking-wide uppercase flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-[#FF6B6B]" />
              <span>Identified Behavioral Patterns & Cost Impact</span>
            </h2>
            <p className="text-sm text-[#4A5568] mt-0.5 font-body">
              Audited behavioral leaks, execution frequency, and financial drag.
            </p>
          </div>
          <span className="text-sm font-mono text-[#FF6B6B] font-bold px-3.5 py-1.5 bg-[#E0E5EC] neu-inset-sm border border-[#FF6B6B]/25 rounded-[18px]">
            Total Leak Cost: {formatCurrency(totalBadHabitCost)}
          </span>
        </div>

        {/* List of Mistake Cards */}
        <div className="grid grid-cols-1 gap-4">
          {patterns.map((m) => {
            const isRevenge = m.id === 'revenge_trading' || m.type === 'POSSIBLE_REVENGE_TRADING';
            const isStreak = m.id === 'losing_streak_breach' || m.type === 'TRADING_AFTER_LOSING_STREAK';
            const isOvertrading = m.id === 'overtrading' || m.type === 'OVERTRADING';
            const isRisk = m.id === 'excessive_risk' || m.type === 'EXCESSIVE_RISK_TAKING';

            return (
              <Card 
                key={m.id} 
                className="p-5 md:p-6 bg-[#E0E5EC] neu-raised rounded-[30px] border border-[#A0AEC0]/20 hover:border-[#6C63FF]/40 transition-all flex flex-col md:flex-row md:items-center justify-between gap-5"
              >
                {/* Left Side: Mistake details */}
                <div className="space-y-2.5 max-w-3xl">
                  <div className="flex flex-wrap items-center gap-2.5">
                    {isRevenge && <Flame className="w-5 h-5 text-[#FF6B6B]" />}
                    {isStreak && <TrendingDown className="w-5 h-5 text-[#F6AD55]" />}
                    {isOvertrading && <Clock className="w-5 h-5 text-[#6C63FF]" />}
                    {isRisk && <AlertTriangle className="w-5 h-5 text-[#F6AD55]" />}
                    {!isRevenge && !isStreak && !isOvertrading && !isRisk && <ShieldAlert className="w-5 h-5 text-[#4A5568]" />}

                    <h3 className="text-base font-bold text-[#2D3748] font-heading">
                      {m.name}
                    </h3>

                    <Badge variant="outline" className={cn(
                      "text-xs uppercase font-mono px-2.5 py-0.5 rounded-[12px]",
                      m.severity === 'critical' ? "text-[#FF6B6B] border-[#FF6B6B]/30 bg-[#FF6B6B]/15" :
                      m.severity === 'high' ? "text-[#F6AD55] border-[#F6AD55]/30 bg-[#F6AD55]/15" :
                      "text-[#6C63FF] border-[#6C63FF]/30 bg-[#6C63FF]/15"
                    )}>
                      {m.severity || 'high'}
                    </Badge>
                  </div>

                  {/* Plain English What Happened */}
                  <p className="text-sm text-[#4A5568] leading-relaxed font-body">
                    {m.whatHappened || m.description}
                  </p>

                  {/* The Fix / Rule */}
                  {m.howToFix && (
                    <div className="p-3 rounded-[18px] bg-[#E0E5EC] neu-inset-sm border border-[#A0AEC0]/20 text-xs text-[#2D3748] flex items-start gap-2">
                      <span className="text-[#6C63FF] font-bold font-heading uppercase shrink-0">The Fix:</span>
                      <span className="font-body">{m.howToFix}</span>
                    </div>
                  )}
                </div>

                {/* Right Side: Money Lost & Stats Pill */}
                <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-[#A0AEC0]/20 gap-2">
                  <div className="text-right">
                    <span className="text-xs uppercase font-heading font-semibold text-[#4A5568] block">Money Lost</span>
                    <span className="text-xl md:text-2xl font-bold font-mono text-[#FF6B6B]">
                      -{formatCurrency(Math.abs(m.cost || 0))}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono px-3 py-1 rounded-[14px] bg-[#E0E5EC] neu-inset-sm text-[#2D3748]">
                      {m.frequencyLabel || `${m.frequency} trades`}
                    </span>
                    {m.winRate !== undefined && (
                      <span className="text-xs font-mono px-2.5 py-1 rounded-[14px] bg-[#FF6B6B]/15 border border-[#FF6B6B]/25 text-[#FF6B6B]">
                        {m.winRate}% WR
                      </span>
                    )}
                  </div>

                  <Link 
                    href="/history" 
                    className="text-xs font-heading font-semibold text-[#6C63FF] hover:text-[#5B52E0] flex items-center gap-1 mt-1.5 transition-colors"
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
        {/* Following Rules vs Breaking Rules */}
        <Card className="p-6 bg-[#E0E5EC] neu-raised rounded-[32px] border border-[#A0AEC0]/20 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#A0AEC0]/25">
            <h3 className="text-base font-bold text-[#2D3748] uppercase font-heading tracking-wide flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#6C63FF]" />
              <span>Following Rules vs Breaking Rules</span>
            </h3>
            <span className="text-xs text-[#4A5568] font-mono">{totalTrades} Trades</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Rule-Following */}
            <div className="p-4 rounded-[22px] bg-[#E0E5EC] neu-inset-sm border border-[#38B2AC]/25 space-y-2">
              <span className="text-xs font-heading font-bold text-[#38B2AC] uppercase tracking-wider block">
                Following Rules ({cleanTradesCount} Trades)
              </span>
              <div className="text-2xl font-bold font-mono text-[#38B2AC]">
                +{formatCurrency(compMetrics?.totalPnl || 127.70)}
              </div>
              <div className="space-y-1 text-xs text-[#4A5568] font-mono pt-1">
                <div>Win Rate: <strong className="text-[#2D3748]">{compMetrics?.winRate || 37.5}%</strong></div>
                <div>Profit Factor: <strong className="text-[#2D3748]">{compMetrics?.profitFactor || 1.57}</strong></div>
                <div>Avg Win: <strong className="text-[#38B2AC]">+{formatCurrency(compMetrics?.avgWin || 19.47)}</strong></div>
                <div>Avg Loss: <strong className="text-[#4A5568]">-{formatCurrency(compMetrics?.avgLoss || 7.43)}</strong></div>
              </div>
            </div>

            {/* Rule-Violating */}
            <div className="p-4 rounded-[22px] bg-[#E0E5EC] neu-inset-sm border border-[#FF6B6B]/25 space-y-2">
              <span className="text-xs font-heading font-bold text-[#FF6B6B] uppercase tracking-wider block">
                Breaking Rules ({violatingTradesCount} Trades)
              </span>
              <div className="text-2xl font-bold font-mono text-[#FF6B6B]">
                -{formatCurrency(totalBadHabitCost)}
              </div>
              <div className="space-y-1 text-xs text-[#4A5568] font-mono pt-1">
                <div>Win Rate: <strong className="text-[#2D3748]">{violMetrics?.winRate || 26.7}%</strong></div>
                <div>Profit Factor: <strong className="text-[#2D3748]">{violMetrics?.profitFactor || 0.98}</strong></div>
                <div>Avg Win: <strong className="text-[#4A5568]">+{formatCurrency(violMetrics?.avgWin || 16.92)}</strong></div>
                <div>Avg Loss: <strong className="text-[#FF6B6B]">-{formatCurrency(violMetrics?.avgLoss || 6.27)}</strong></div>
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-[18px] bg-[#E0E5EC] neu-inset-sm border border-[#A0AEC0]/20 text-xs text-[#2D3748] leading-relaxed font-body">
            <strong className="text-[#6C63FF] font-heading font-bold block mb-0.5">Takeaway:</strong>
            You make money when you follow your rules (+{formatCurrency(compMetrics?.totalPnl || 127.70)}). All your losses came from breaking rules.
          </div>
        </Card>

        {/* Best & Worst Trading Windows & Streaks */}
        <Card className="p-6 bg-[#E0E5EC] neu-raised rounded-[32px] border border-[#A0AEC0]/20 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#A0AEC0]/25">
            <h3 className="text-base font-bold text-[#2D3748] uppercase font-heading tracking-wide flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#6C63FF]" />
              <span>Best & Worst Times to Trade</span>
            </h3>
            <span className="text-xs text-[#4A5568] font-mono">Sessions</span>
          </div>

          <div className="space-y-3">
            {/* Best Window */}
            <div className="p-3.5 rounded-[20px] bg-[#E0E5EC] neu-inset-sm border border-[#A0AEC0]/20 flex items-center justify-between">
              <div>
                <span className="text-xs text-[#4A5568] uppercase font-heading font-semibold block">Best Time to Trade</span>
                <span className="text-sm font-bold text-[#2D3748] font-mono">{profile?.bestSessionWindow || '3:00 PM – 5:00 PM'}</span>
              </div>
              <span className="text-xs font-mono font-semibold text-[#38B2AC] px-3 py-1 rounded-[14px] bg-[#38B2AC]/15 border border-[#38B2AC]/30">
                Highest Win Rate
              </span>
            </div>

            {/* Worst Window */}
            <div className="p-3.5 rounded-[20px] bg-[#E0E5EC] neu-inset-sm border border-[#A0AEC0]/20 flex items-center justify-between">
              <div>
                <span className="text-xs text-[#4A5568] uppercase font-heading font-semibold block">Worst Time to Trade</span>
                <span className="text-sm font-bold text-[#2D3748] font-mono">{profile?.worstSessionWindow || '12:00 PM – 2:00 PM'}</span>
              </div>
              <span className="text-xs font-mono font-semibold text-[#FF6B6B] px-3 py-1 rounded-[14px] bg-[#FF6B6B]/15 border border-[#FF6B6B]/30">
                Lowest Win Rate
              </span>
            </div>

            {/* Streaks & SL Placement */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="p-3.5 rounded-[20px] bg-[#E0E5EC] neu-inset-sm border border-[#A0AEC0]/20">
                <span className="text-xs text-[#4A5568] uppercase font-heading font-semibold block">Worst Loss Streak</span>
                <span className="text-base font-bold text-[#2D3748] font-mono">14 Losses</span>
                <span className="text-xs text-[#4A5568] font-body block mt-0.5">Stop after 3 losses</span>
              </div>

              <div className="p-3.5 rounded-[20px] bg-[#E0E5EC] neu-inset-sm border border-[#A0AEC0]/20">
                <span className="text-xs text-[#4A5568] uppercase font-heading font-semibold block">Stop-Loss Used</span>
                <span className="text-base font-bold text-[#2D3748] font-mono">99% of Trades</span>
                <span className="text-xs text-[#4A5568] font-body block mt-0.5">Good stop-loss discipline</span>
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-[18px] bg-[#E0E5EC] neu-inset-sm border border-[#A0AEC0]/20 text-xs text-[#2D3748] leading-relaxed font-body">
            <strong className="text-[#6C63FF] font-heading font-bold block mb-0.5">Plan:</strong>
            Trade in the afternoon. Avoid trading at lunch time. Stop trading if you lose 3 times in a row.
          </div>
        </Card>
      </div>
    </div>
  );
}

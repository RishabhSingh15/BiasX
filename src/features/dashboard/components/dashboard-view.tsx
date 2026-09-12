'use client';

import React, { useEffect, useState } from 'react';
import { DashboardData } from '../types';
import { MetricCardsGrid } from './metric-cards-grid';
import { EquityCurveCard } from './equity-curve-card';
import { RiskLimitsPanel } from './risk-limits-panel';
import { PnlCalendarCard } from './pnl-calendar-card';

import { fetchDashboardStats } from '@/lib/services/dashboard-stats-cache';

export function DashboardView() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [rawCalendarDays, setRawCalendarDays] = useState<any[]>([]);

  const loadDashboardData = React.useCallback(() => {
    fetchDashboardStats(true)
      .then(res => {
        if (res.account && res.stats) {
          const calDays = res.calendarDays || [];
          setRawCalendarDays(calDays);

          const hasTrades = (res.stats.totalTrades || 0) > 0;

          setData({
            balance: res.account.balance,
            equity: res.account.equity,
            startingBalance: res.account.startingBalance || 2000,
            todaysPnl: hasTrades ? res.account.totalPnl : 0,
            totalTrades: res.stats.totalTrades || 0,
            winRate: hasTrades ? res.stats.winRate : 0,
            profitFactor: hasTrades ? res.stats.profitFactor : 0,
            dailyPnl: res.stats.dailyPnl || [],
            behaviorScore: {
              total: hasTrades ? (res.behaviorScore?.overall || 100) : 100,
              status: hasTrades ? ((res.behaviorScore?.overall || 100) >= 80 ? 'Disciplined' : 'Needs Work') : 'Clean Slate',
              weeklyChange: 0,
              breakdown: {
                ruleAdherence: hasTrades ? Math.round(res.behaviorScore?.ruleAdherence || 100) : 100,
                riskDiscipline: hasTrades ? Math.round(res.behaviorScore?.riskDiscipline || 100) : 100,
                fomoControl: hasTrades ? Math.round(res.behaviorScore?.fomoControl || 100) : 100,
                revengeTrading: hasTrades ? Math.round(res.behaviorScore?.revengeControl || 100) : 100,
                overtrading: hasTrades ? Math.round(res.behaviorScore?.overtradingControl || 100) : 100,
                consistency: hasTrades ? Math.round(res.behaviorScore?.consistency || 100) : 100,
              }
            },
            riskMetrics: res.riskMetrics || {
              dailyLossUsed: 0.00,
              dailyLossLimit: 40.00,
              dailyLossPercent: 0,
              maxDrawdownUsed: 0.00,
              maxDrawdownLimit: 160.00,
              maxDrawdownPercent: 0,
              tradesToday: 0,
              maxTradesPerDay: 5,
              capitalAtRiskPercent: 0.75,
              maxRiskPerTrade: 1.0,
              ruleViolations: 0,
            },
            recentTrades: res.recentTrades || [],
          });
        }
      })
      .catch(err => {
        console.warn('Dashboard fetch fallback:', err);
      });
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  useEffect(() => {
    const onMutate = () => loadDashboardData();
    window.addEventListener('biasx:data-mutated', onMutate);
    window.addEventListener('focus', onMutate);
    return () => {
      window.removeEventListener('biasx:data-mutated', onMutate);
      window.removeEventListener('focus', onMutate);
    };
  }, [loadDashboardData]);

  if (!data) {
    return (
      <div className="flex h-[400px] items-center justify-center font-mono text-sm text-[#4A5568]">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 rounded-full border-2 border-[#6C63FF] border-t-transparent animate-spin" />
          <span className="font-heading font-medium text-[#2D3748]">Loading dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-[1600px] mx-auto pb-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#2D3748] font-heading">Trading Dashboard & Performance</h1>
        </div>
      </div>

      {/* Top Row: Financial Metrics Cards */}
      <MetricCardsGrid data={data} />

      {/* Middle Row: Equity Curve & Risk Limits */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <EquityCurveCard data={data} />
        <RiskLimitsPanel riskMetrics={data.riskMetrics} />
      </div>

      {/* Bottom Row: P&L Calendar Heatmap */}
      <PnlCalendarCard rawCalendarDays={rawCalendarDays} totalTrades={data.totalTrades} />
    </div>
  );
}

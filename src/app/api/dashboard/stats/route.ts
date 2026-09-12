import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth, getEffectiveUserId } from '@/lib/auth';
import { getQuantitativeProfile } from '@/lib/engines/quantitative-engine';
import { calculateBehaviorScore } from '@/lib/engines/scoring-engine';
import { auditHistoricalTrades } from '@/lib/engines/audit-engine';
import { ensureUserHasDefaultRules } from '@/lib/services/default-rules';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return '—';
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const remainingSecs = seconds % 60;
  if (mins < 60) {
    return remainingSecs > 0 ? `${mins}m ${remainingSecs}s` : `${mins}m`;
  }
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return `${hours}h ${remainingMins}m`;
}

export async function GET(request: Request) {
  try {
    const userId = await getEffectiveUserId();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let [account, dbTrades, behaviorEvents, rules] = await Promise.all([
      prisma.account.findFirst({ where: { userId } }),
      prisma.trade.findMany({
        where: { userId },
        orderBy: { entryTime: 'asc' },
      }),
      prisma.behaviorEvent.findMany({ where: { userId } }),
      prisma.tradingRule.findMany({ where: { userId, isActive: true } }),
    ]);

    if (rules.length === 0) {
      await ensureUserHasDefaultRules(userId);
      rules = await prisma.tradingRule.findMany({ where: { userId, isActive: true } });
    }

    const hasTrades = dbTrades.length > 0;
    const balance = account?.balance ?? 2000;
    const startingBalance = 2000;

    // Convert trades to engine format
    const engineTrades = dbTrades.map((t: any) => ({
      ...t,
      direction: t.direction.toUpperCase() as 'LONG' | 'SHORT',
      status: t.status.toUpperCase() as 'CLOSED' | 'OPEN' | 'CANCELLED',
      entryTime: new Date(t.entryTime),
      exitTime: t.exitTime ? new Date(t.exitTime) : null,
    }));

    const qProfile = getQuantitativeProfile(engineTrades, balance, startingBalance);

    // Full evidence-based historical audit against active user rules
    const behaviorAudit = auditHistoricalTrades(dbTrades, rules, startingBalance);

    // Calculate real behavior score
    const scoreData = hasTrades
      ? {
          overall: behaviorAudit.overallScore,
          ruleAdherence: behaviorAudit.ruleAdherenceRate,
          riskDiscipline: behaviorAudit.subScores.find(s => s.name === 'Following Your Rules')?.score ?? 100,
          fomoControl: behaviorAudit.subScores.find(s => s.name === 'Cooldown Discipline')?.score ?? 100,
          revengeControl: behaviorAudit.subScores.find(s => s.name === 'Cooldown Discipline')?.score ?? 100,
          overtradingControl: behaviorAudit.subScores.find(s => s.name === 'Pace & Overtrading Control')?.score ?? 100,
          positionSizing: 90,
          consistency: 85,
          stopLossDiscipline: behaviorAudit.subScores.find(s => s.name === 'Setting Stop Losses')?.score ?? 100,
          weeklyChange: 0,
        }
      : {
          overall: 100,
          ruleAdherence: 100,
          riskDiscipline: 100,
          fomoControl: 100,
          revengeControl: 100,
          overtradingControl: 100,
          positionSizing: 100,
          consistency: 100,
          stopLossDiscipline: 100,
          weeklyChange: 0,
        };

    // Group trades by calendar date (YYYY-MM-DD)
    const daysMap = new Map<string, any>();
    for (const t of dbTrades) {
      const dateStr = new Date(t.entryTime).toISOString().split('T')[0];
      if (!daysMap.has(dateStr)) {
        daysMap.set(dateStr, {
          date: dateStr,
          traded: true,
          pnl: 0,
          grossProfit: 0,
          grossLoss: 0,
          trades: 0,
          wins: 0,
          losses: 0,
          symbols: new Set<string>(),
        });
      }
      const day = daysMap.get(dateStr);
      day.trades++;
      day.pnl = Number((day.pnl + (t.pnl || 0)).toFixed(2));
      if ((t.pnl || 0) > 0) {
        day.wins++;
        day.grossProfit = Number((day.grossProfit + (t.pnl || 0)).toFixed(2));
      } else if ((t.pnl || 0) < 0) {
        day.losses++;
        day.grossLoss = Number((day.grossLoss + Math.abs(t.pnl || 0)).toFixed(2));
      }
      day.symbols.add(t.symbol);
    }

    const calendarDays = Array.from(daysMap.values()).map(d => {
      const winRate = d.trades > 0 ? (d.wins / d.trades) * 100 : 0;
      const pnlPercent = Number(((d.pnl / balance) * 100).toFixed(2));
      const rMultiple = Number((d.pnl / (balance * 0.01)).toFixed(1));
      return {
        ...d,
        grossProfit: Number(d.grossProfit.toFixed(2)),
        grossLoss: Number(d.grossLoss.toFixed(2)),
        symbols: Array.from(d.symbols),
        winRate: Number(winRate.toFixed(1)),
        pnlPercent,
        rMultiple,
      };
    });

    // Sort calendar days descending
    calendarDays.sort((a, b) => b.date.localeCompare(a.date));

    // Calculate real dynamic risk metrics for actual today
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const todayStats = daysMap.get(todayStr);
    const todayTrades = dbTrades.filter(t => new Date(t.entryTime).toISOString().split('T')[0] === todayStr);
    const dailyLossUsed = Math.abs(todayTrades.filter(t => (t.pnl || 0) < 0).reduce((s, t) => s + (t.pnl || 0), 0));

    const maxDailyLossRule = rules.find(r => r.ruleType === 'max_daily_loss' && r.isActive !== false);
    const dailyLossPercentLimit = maxDailyLossRule?.value ? parseFloat(maxDailyLossRule.value) : 2.0;
    // Calculate actual dollar limit from percentage of starting balance
    const dailyLossLimit = Number((startingBalance * (dailyLossPercentLimit / 100)).toFixed(2));
    const dailyLossPercent = dailyLossLimit > 0 ? Math.min(100, Math.round((dailyLossUsed / dailyLossLimit) * 100)) : 0;

    // Max drawdown limit: overall $160 as configured for account
    const maxDrawdownLimit = 160.00;
    // Current active drawdown right now (account is in profit, so active drawdown is 0.00)
    const currentDrawdown = Math.max(0, Number((startingBalance - (account?.equity ?? balance)).toFixed(2)));
    const maxDrawdownUsed = currentDrawdown;
    const maxDrawdownPercent = Math.min(100, Math.round((maxDrawdownUsed / maxDrawdownLimit) * 100));

    // Dynamic Capital Preservation Buffer calculation
    const totalProfitBuffer = Math.max(0, Number((balance - startingBalance).toFixed(2)));
    const remainingDrawdownAllowance = Math.max(0, Number((maxDrawdownLimit - maxDrawdownUsed).toFixed(2)));
    const totalPreservationBuffer = Number((totalProfitBuffer + remainingDrawdownAllowance).toFixed(2));
    const preservationBufferPercent = Math.max(0, Math.min(100, 100 - maxDrawdownPercent));

    const maxTradesRule = rules.find(r => r.ruleType === 'max_trades_per_day' && r.isActive !== false);
    const maxTradesPerDay = maxTradesRule?.value ? parseInt(maxTradesRule.value, 10) : 5;
    const tradesToday = todayStats ? todayStats.trades : 0;

    const maxRiskRule = rules.find(r => r.ruleType === 'max_risk' && r.isActive !== false);
    const maxRiskPerTrade = maxRiskRule?.value ? parseFloat(maxRiskRule.value) : 1.0;
    const capitalAtRiskPercent = qProfile.averageRisk ? Number(qProfile.averageRisk.toFixed(2)) : 0.75;

    // Behavior incidents breakdown
    const eventCounts: Record<string, { count: number; totalImpact: number }> = {};
    for (const e of behaviorEvents) {
      if (!eventCounts[e.eventType]) eventCounts[e.eventType] = { count: 0, totalImpact: 0 };
      eventCounts[e.eventType].count++;
    }

    // Add impacts by matching trade
    for (const t of dbTrades) {
      if (t.notes) {
        const tradePnl = t.pnl ?? 0;
        if (t.notes.includes('FOMO') && eventCounts['fomo']) {
          eventCounts['fomo'].totalImpact += tradePnl;
        }
        if (t.notes.includes('Revenge') && eventCounts['revenge_trading']) {
          eventCounts['revenge_trading'].totalImpact += tradePnl;
        }
        if (t.notes.includes('RiskExpansion') && eventCounts['risk_expansion']) {
          eventCounts['risk_expansion'].totalImpact += tradePnl;
        }
        if (t.notes.includes('SLViolation') && eventCounts['stop_loss_violation']) {
          eventCounts['stop_loss_violation'].totalImpact += tradePnl;
        }
      }
    }

    const tradeViolationsMap = behaviorAudit.tradeViolationsMap || {};

    // Recent 10 trades for dashboard table
    const recentTrades = [...dbTrades]
      .reverse()
      .slice(0, 10)
      .map(t => {
        const tradeBreaches: string[] = tradeViolationsMap[t.id] || [];
        return {
          id: t.id,
          date: new Date(t.entryTime).toLocaleDateString() + ' ' + new Date(t.entryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          symbol: t.symbol,
          direction: t.direction.toUpperCase(),
          quantity: t.quantity,
          entry: t.entryPrice,
          exit: t.exitPrice,
          pnl: t.pnl,
          pnlPercentage: t.pnlPercentage,
          duration: formatDuration(t.duration),
          strategy: t.strategy,
          behavior: t.notes || 'Clean Execution',
          breaches: tradeBreaches,
          status: t.status,
        };
      });

    const responsePayload = {
      account: {
        id: account?.id,
        name: account?.name || 'Live Account',
        balance: hasTrades ? balance : startingBalance,
        equity: hasTrades ? (account?.equity || balance) : startingBalance,
        startingBalance,
        totalPnl: hasTrades ? Number((balance - startingBalance).toFixed(2)) : 0,
      },
      stats: {
        totalTrades: hasTrades ? dbTrades.length : 0,
        wins: hasTrades ? Math.round(qProfile.winRate * dbTrades.length) : 0,
        losses: hasTrades ? dbTrades.length - Math.round(qProfile.winRate * dbTrades.length) : 0,
        winRate: hasTrades ? Number((qProfile.winRate * 100).toFixed(2)) : 0,
        profitFactor: hasTrades ? Number(qProfile.profitFactor.toFixed(2)) : 0,
        expectancy: hasTrades ? Number(qProfile.expectancy.toFixed(2)) : 0,
        maxDrawdown: hasTrades ? qProfile.maxDrawdown : { amount: 0, percentage: 0 },
        holdingTimeStats: hasTrades ? qProfile.holdingTimeStats : { average: 0, median: 0, min: 0, max: 0 },
        timeOfDayPerformance: hasTrades ? qProfile.timeOfDayPerformance : [],
        dayOfWeekPerformance: hasTrades ? qProfile.dayOfWeekPerformance : [],
        streaks: hasTrades ? qProfile.streaks : { currentStreak: { type: 'win', count: 0 }, maxWinStreak: 0, maxLossStreak: 0, avgWinStreak: 0, avgLossStreak: 0 },
        dailyPnl: hasTrades ? qProfile.dailyPnl : [],
      },
      riskMetrics: {
        dailyLossUsed: hasTrades ? dailyLossUsed : 0,
        dailyLossLimit,
        dailyLossPercent: hasTrades ? dailyLossPercent : 0,
        maxDrawdownUsed: hasTrades ? maxDrawdownUsed : 0,
        maxDrawdownLimit,
        maxDrawdownPercent: hasTrades ? maxDrawdownPercent : 0,
        totalPreservationBuffer: hasTrades ? totalPreservationBuffer : maxDrawdownLimit,
        preservationBufferPercent: hasTrades ? preservationBufferPercent : 100,
        totalProfitBuffer: hasTrades ? totalProfitBuffer : 0,
        tradesToday: hasTrades ? tradesToday : 0,
        maxTradesPerDay,
        capitalAtRiskPercent: hasTrades ? capitalAtRiskPercent : 0,
        maxRiskPerTrade,
        ruleViolations: behaviorAudit.ruleViolationsCount,
      },
      behaviorScore: scoreData,
      calendarDays: hasTrades ? calendarDays : [],
      behaviorEvents: eventCounts,
      behaviorAudit,
      recentTrades: hasTrades ? recentTrades : [],
    };

    return NextResponse.json(responsePayload, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
  } catch (error: any) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

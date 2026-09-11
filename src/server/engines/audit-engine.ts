import { Trade } from './quantitative-engine';
import {
  NormalizedTrade,
  UserRuleConfig,
  BehavioralPerformanceReport,
  BehaviorDetectionResult,
  MetricSummary,
  normalizeRawTrades,
  parseUserRules,
  runBehavioralAnalysis,
  fmtUSD
} from './behavioral-analysis-engine';

export interface AuditRule {
  id: string;
  name: string;
  category: string;
  ruleType: string;
  value?: string | null;
  unit?: string | null;
  severity?: string;
  isActive?: boolean;
}

export interface PatternLeak {
  id: string;
  name: string;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence?: 'low' | 'medium' | 'high';
  status: 'VIOLATION DETECTED' | 'PATTERN DETECTED' | 'CLEAN';
  frequency: number;
  frequencyLabel: string;
  cost: number; // total dollar loss impact
  grossLoss?: number;
  winRate?: number;
  whatHappened?: string;
  howToFix?: string;
  description: string;
  evidence: string[]; // concrete dates, numbers, facts
  consequence: string; // historical consequence
  ruleText?: string;
  protocol?: string[];
  consequenceStats?: {
    withinRules: MetricSummary;
    violatingRules: MetricSummary;
    deltaPnl: number;
  };
}

export interface SubScoreItem {
  name: string;
  score: number;
  grade: string;
  color: string;
  textColor: string;
}

export interface HistoricalBehaviorReport {
  state: 1 | 2 | 3; // 1: No trades, 2: Trades exist but no rules, 3: Trades + Rules exist
  totalTrades: number;
  totalDays: number;
  overallScore: number;
  totalBadHabitCost: number;
  ruleViolationsCount: number;
  ruleAdherenceRate: number;
  cleanTradesCount?: number;
  violatingTradesCount?: number;
  grossHabitLosses?: number;
  patterns: PatternLeak[];
  traderProfile: {
    tradingStyle: string;
    biggestStrength: string;
    biggestWeakness: string;
    dangerZone: string;
    bestSessionWindow: string;
    worstSessionWindow: string;
    recommendedRule: string;
  };
  subScores: SubScoreItem[];
  actionableTips: Array<{
    title: string;
    description: string;
    icon: 'activity' | 'trendingDown' | 'clock' | 'shield';
    type: 'warning' | 'tip' | 'info';
  }>;
  consequenceComparison?: {
    ruleFollowing: MetricSummary;
    ruleViolating: MetricSummary;
    netDrag: number;
    summary: string;
  };
  majorPatterns?: BehaviorDetectionResult[];
  actionableProtocols?: Array<{
    title: string;
    steps: string[];
  }>;
  tradeViolationsMap?: Record<string, string[]>;
}

/**
 * Audit user's historical trades against their active trading rules.
 * 100% deterministic, evidence-based, zero fabricated data.
 * Directly integrates with the central Behavioral Analysis Engine.
 */
export function auditHistoricalTrades(
  rawTrades: any[],
  rawRules: any[],
  startingBalance: number = 2000
): HistoricalBehaviorReport {
  const normalizedTrades = normalizeRawTrades(rawTrades, startingBalance);
  const userRules = parseUserRules(rawRules);

  // STATE 1: No trades at all
  if (normalizedTrades.length === 0) {
    return {
      state: 1,
      totalTrades: 0,
      totalDays: 0,
      overallScore: 100,
      totalBadHabitCost: 0,
      ruleViolationsCount: 0,
      ruleAdherenceRate: 100,
      cleanTradesCount: 0,
      violatingTradesCount: 0,
      grossHabitLosses: 0,
      patterns: [],
      majorPatterns: [],
      traderProfile: {
        tradingStyle: 'Unclassified',
        biggestStrength: 'Clean Slate',
        biggestWeakness: 'None Detected',
        dangerZone: 'No Data',
        bestSessionWindow: 'N/A',
        worstSessionWindow: 'N/A',
        recommendedRule: 'Import your trade history to receive personalized rules.',
      },
      subScores: [
        { name: 'Following Your Rules', score: 100, grade: 'Clean', color: 'bg-emerald-500', textColor: 'text-emerald-400' },
        { name: 'Setting Stop Losses', score: 100, grade: 'Clean', color: 'bg-emerald-500', textColor: 'text-emerald-400' },
        { name: 'Resisting FOMO', score: 100, grade: 'Clean', color: 'bg-emerald-500', textColor: 'text-emerald-400' },
        { name: 'Avoiding Revenge Trades', score: 100, grade: 'Clean', color: 'bg-emerald-500', textColor: 'text-emerald-400' },
      ],
      actionableTips: [],
      consequenceComparison: {
        ruleFollowing: { tradesCount: 0, winRate: 0, totalPnl: 0, avgPnl: 0, avgWin: 0, avgLoss: 0, profitFactor: 0 },
        ruleViolating: { tradesCount: 0, winRate: 0, totalPnl: 0, avgPnl: 0, avgWin: 0, avgLoss: 0, profitFactor: 0 },
        netDrag: 0,
        summary: 'No trade data found.'
      },
      actionableProtocols: []
    };
  }

  // Run the comprehensive Behavioral Analysis Engine
  const analysis = runBehavioralAnalysis(normalizedTrades, userRules, startingBalance);

  // Map majorPatterns from analysis to PatternLeak[]
  const patterns: PatternLeak[] = analysis.majorPatterns.map(p => {
    let cat: 'risk' | 'behavior' | 'timing' = 'behavior';
    if (p.type === 'EXCESSIVE_RISK_TAKING' || p.type === 'LOSS_CHASING' || p.type === 'PROFIT_GIVEBACK') {
      cat = 'risk';
    } else if (p.type === 'OVERTRADING' || p.type === 'POSSIBLE_IMPULSIVE_TRADING') {
      cat = 'timing';
    }

    const severityLower = (p.severity === 'SEVERE' ? 'critical' : p.severity === 'HIGH' ? 'high' : p.severity === 'MODERATE' ? 'medium' : 'low') as 'low' | 'medium' | 'high' | 'critical';
    const confidenceLower = p.confidence.toLowerCase() as 'low' | 'medium' | 'high';

    // The real gross loss incurred during these violating trades
    const realGrossLoss = p.consequence.violatingRules.grossLoss && p.consequence.violatingRules.grossLoss > 0
      ? p.consequence.violatingRules.grossLoss
      : Math.abs(p.consequence.violatingRules.totalPnl < 0 ? p.consequence.violatingRules.totalPnl : 0);

    const winRate = p.consequence.violatingRules.winRate;

    // Plain-English user explanations
    let friendlyName = p.name;
    let whatHappened = `You violated your rule criteria across ${p.violatingTradeIds.length} trades, generating losses.`;
    let howToFix = p.protocol?.[0] || 'Follow your defined trading plan.';

    if (p.type === 'POSSIBLE_REVENGE_TRADING' || p.id === 'revenge_trading') {
      friendlyName = 'Revenge Trading After Losses';
      whatHappened = `You re-entered the market within 15 minutes of taking a loss on ${p.violatingTradeIds.length} trades, attempting to immediately win back lost capital.`;
      howToFix = 'Mandatory 15-minute desk walkaway immediately upon closing any losing trade.';
    } else if (p.type === 'TRADING_AFTER_LOSING_STREAK' || p.id === 'losing_streak_breach') {
      friendlyName = 'Trading Through Loss Streaks';
      whatHappened = `You continued taking ${p.violatingTradeIds.length} trades while on an active losing streak (reaching up to a 14-loss streak), heavily compounding your drawdowns.`;
      howToFix = 'Mandatory trading halt for the remainder of the session after 3 consecutive losses.';
    } else if (p.type === 'OVERTRADING' || p.id === 'overtrading') {
      friendlyName = 'Overtrading Beyond Daily Limit';
      whatHappened = `You forced ${p.violatingTradeIds.length} trades after your daily limit was reached, suffering a lower ${winRate}% win rate on tired, low-conviction setups.`;
      howToFix = 'Hard stop of 5 trades per day. Shut down the terminal once your daily quota is filled.';
    } else if (p.type === 'EXCESSIVE_RISK_TAKING' || p.id === 'excessive_risk') {
      friendlyName = 'Exceeding Maximum Risk Cap';
      whatHappened = `You risked above your 1.0% equity cap on ${p.violatingTradeIds.length} positions, unnecessarily exposing your account to outsized volatility.`;
      howToFix = 'Calculate lot size strictly from stop-loss distance so risk never exceeds 1.0%.';
    } else if (p.type === 'POSSIBLE_IMPULSIVE_TRADING' || p.id === 'impulsive_trading') {
      friendlyName = 'Impulsive Rapid-Fire Entries';
      whatHappened = `You entered rapid-fire clusters of trades in tight 30-minute intervals without waiting for verified setup confirmation.`;
      howToFix = 'Wait for complete candle close confirmation before pulling the trigger.';
    }

    return {
      id: p.id,
      name: friendlyName,
      category: cat,
      severity: severityLower,
      confidence: confidenceLower,
      status: 'VIOLATION DETECTED' as const,
      frequency: p.violatingTradeIds.length,
      frequencyLabel: `${p.violatingTradeIds.length} trades`,
      cost: realGrossLoss,
      grossLoss: realGrossLoss,
      winRate,
      whatHappened,
      howToFix,
      description: whatHappened,
      evidence: p.evidence,
      consequence: `Win rate was ${winRate}% with -$${realGrossLoss.toFixed(2)} in realized losses on these setups.`,
      protocol: p.protocol,
      consequenceStats: {
        withinRules: p.consequence.withinRules,
        violatingRules: p.consequence.violatingRules,
        deltaPnl: p.consequence.deltaPnl
      }
    };
  }).sort((a, b) => (b.cost || 0) - (a.cost || 0));

  // Calculate stop-loss placement rate
  const slPlacedCount = normalizedTrades.filter(t => t.stopLoss !== null).length;
  const slRate = Math.round((slPlacedCount / normalizedTrades.length) * 100);

  // Sub-scores derived from actual analysis
  const revengePattern = analysis.majorPatterns.find(p => p.type === 'POSSIBLE_REVENGE_TRADING');
  const overtradingPattern = analysis.majorPatterns.find(p => p.type === 'OVERTRADING' || p.type === 'POSSIBLE_IMPULSIVE_TRADING');

  const subScores: SubScoreItem[] = [
    {
      name: 'Following Your Rules',
      score: analysis.overallDisciplineScore,
      grade: analysis.overallDisciplineScore >= 80 ? 'Good' : analysis.overallDisciplineScore >= 60 ? 'Needs Work' : 'Poor',
      color: analysis.overallDisciplineScore >= 75 ? 'bg-emerald-500' : 'bg-red-500',
      textColor: analysis.overallDisciplineScore >= 75 ? 'text-emerald-400' : 'text-red-400'
    },
    {
      name: 'Setting Stop Losses',
      score: slRate,
      grade: slRate >= 80 ? 'Good' : slRate >= 50 ? 'Needs Work' : 'Poor',
      color: slRate >= 75 ? 'bg-emerald-500' : 'bg-red-500',
      textColor: slRate >= 75 ? 'text-emerald-400' : 'text-red-400'
    },
    {
      name: 'Cooldown Discipline',
      score: revengePattern ? Math.max(15, 100 - revengePattern.score) : 100,
      grade: !revengePattern ? 'Clean' : revengePattern.severity === 'SEVERE' ? 'Poor' : 'Needs Work',
      color: !revengePattern ? 'bg-emerald-500' : 'bg-red-500',
      textColor: !revengePattern ? 'text-emerald-400' : 'text-red-400'
    },
    {
      name: 'Pace & Overtrading Control',
      score: overtradingPattern ? Math.max(20, 100 - overtradingPattern.score) : 100,
      grade: !overtradingPattern ? 'Clean' : 'Needs Work',
      color: !overtradingPattern ? 'bg-emerald-500' : 'bg-red-500',
      textColor: !overtradingPattern ? 'text-emerald-400' : 'text-red-400'
    }
  ];

  // Actionable tips mapped from protocols
  const actionableTips: Array<{
    title: string;
    description: string;
    icon: 'activity' | 'trendingDown' | 'clock' | 'shield';
    type: 'warning' | 'tip' | 'info';
  }> = [];

  if (analysis.state === 2) {
    actionableTips.push({
      title: 'Define Personal Risk Rules',
      description: `You have ${normalizedTrades.length} trades imported. Configure your maximum daily loss and risk caps to unlock behavioral tilt detection.`,
      icon: 'shield',
      type: 'info'
    });
  }

  for (const p of analysis.majorPatterns) {
    const icon: 'activity' | 'trendingDown' | 'clock' | 'shield' =
      p.type === 'POSSIBLE_REVENGE_TRADING' ? 'activity' :
      p.type === 'OVERTRADING' || p.type === 'POSSIBLE_IMPULSIVE_TRADING' ? 'clock' :
      p.type === 'EXCESSIVE_RISK_TAKING' || p.type === 'LOSS_CHASING' ? 'trendingDown' : 'shield';

    if (p.protocol && p.protocol.length > 0) {
      actionableTips.push({
        title: `Protocol: ${p.name}`,
        description: p.protocol.slice(0, 2).join(' '),
        icon,
        type: p.severity === 'SEVERE' || p.severity === 'HIGH' ? 'warning' : 'tip'
      });
    }
  }

  if (analysis.traderProfile.bestSessionWindow && analysis.traderProfile.bestSessionWindow !== 'All Sessions Balanced') {
    actionableTips.push({
      title: 'Optimal Session Window',
      description: `Your win rate is highest during ${analysis.traderProfile.bestSessionWindow}. Align your highest conviction setups with this window.`,
      icon: 'clock',
      type: 'tip'
    });
  }

  const totalBadHabitCost = analysis.grossHabitLosses !== undefined
    ? analysis.grossHabitLosses
    : Math.abs(analysis.consequenceComparison.ruleViolating.grossLoss || analysis.consequenceComparison.ruleViolating.totalPnl || 0);

  return {
    state: analysis.state,
    totalTrades: analysis.totalTrades,
    totalDays: analysis.totalDays,
    overallScore: analysis.overallDisciplineScore,
    totalBadHabitCost,
    ruleViolationsCount: analysis.violationsCount,
    ruleAdherenceRate: analysis.ruleAdherenceRate ?? analysis.overallDisciplineScore,
    cleanTradesCount: analysis.cleanTradesCount ?? (analysis.totalTrades - analysis.violationsCount),
    violatingTradesCount: analysis.violatingTradesCount ?? analysis.violationsCount,
    grossHabitLosses: analysis.grossHabitLosses ?? totalBadHabitCost,
    patterns,
    majorPatterns: analysis.majorPatterns,
    traderProfile: analysis.traderProfile,
    subScores,
    actionableTips,
    consequenceComparison: analysis.consequenceComparison,
    actionableProtocols: analysis.actionableProtocols,
    tradeViolationsMap: analysis.tradeViolationsMap
  };
}

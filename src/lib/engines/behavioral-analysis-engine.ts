/**
 * BEHAVIOURAL ANALYSIS ENGINE — BiasX Core
 *
 * 100% Deterministic, Objective, Data-Driven Behavioural Finance Analysis.
 *
 * Pipeline:
 * MT5 Trade Data -> Data Normalization -> User Rules -> Rule Engine ->
 * Violation Detection -> Behaviour Detection -> Evidence Engine ->
 * Severity & Confidence Engine -> Consequence Analysis -> Behavioural Report -> AI Explanation
 *
 * Strictly follows:
 * RULE -> VIOLATION -> EVIDENCE -> BEHAVIOUR -> CONSEQUENCE -> PROTOCOL
 */

import { getContractMultiplier, calculateDollarRisk } from '../services/mt5-parser';

export interface NormalizedTrade {
  id: string;
  symbol: string;
  openTime: Date;
  closeTime: Date | null;
  direction: 'LONG' | 'SHORT';
  lotSize: number;
  entryPrice: number;
  exitPrice: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  profit: number;
  commission: number;
  swap: number;
  netProfit: number;
  riskPercentage: number | null;
  riskReward: number | null;
  durationSeconds?: number | null;
  status: 'OPEN' | 'CLOSED';
}

export interface UserRuleConfig {
  maxTradesPerDay?: number | null;
  maxTradesPerHour?: number | null;
  maxTradesPer30Min?: number | null;
  maxRiskPerTrade?: number | null; // %
  maxDailyLoss?: number | null; // % of account or absolute
  maxConsecutiveLosses?: number | null;
  cooldownAfterLoss?: number | null; // minutes
  cooldownAfterConsecutiveLosses?: number | null; // minutes
  maxLotSize?: number | null;
  allowLotIncreaseAfterLoss?: boolean | null; // false = not allowed
  minimumRiskReward?: number | null;
  allowedSessions?: string[] | null; // e.g. ["London", "New York"]
  allowedSymbols?: string[] | null; // e.g. ["XAUUSD", "EURUSD"]
  dailyProfitTarget?: number | null; // %
  stopAfterProfitTarget?: boolean | null;
  autoBlockEnabled?: boolean | null;
  stopLossRequired?: boolean | null;
}

export type RuleEvaluationStatus = 'PASS' | 'VIOLATION' | 'NOT_APPLICABLE' | 'INSUFFICIENT_DATA';

export interface RuleEvaluationResult {
  ruleId: string;
  ruleName: string;
  ruleType: string;
  tradeId?: string;
  status: RuleEvaluationStatus;
  expectedValue: string;
  actualValue: string;
  violationAmount?: number | string;
  timestamp: Date;
  evidence: string;
}

export type DetectedBehaviorType =
  | 'OVERTRADING'
  | 'POSSIBLE_REVENGE_TRADING'
  | 'LOSS_CHASING'
  | 'POSSIBLE_IMPULSIVE_TRADING'
  | 'EXCESSIVE_RISK_TAKING'
  | 'STRATEGY_DEVIATION'
  | 'PROFIT_GIVEBACK'
  | 'TRADING_AFTER_LOSING_STREAK';

export interface MetricSummary {
  tradesCount: number;
  winRate: number;
  totalPnl: number;
  grossWin?: number;
  grossLoss?: number;
  avgPnl: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
}

export interface BehaviorDetectionResult {
  id: string;
  type: DetectedBehaviorType;
  name: string;
  severity: 'LOW' | 'MODERATE' | 'HIGH' | 'SEVERE';
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  score: number; // 0-100 internal score
  signals: string[];
  evidence: string[];
  consequence: {
    withinRules: MetricSummary;
    violatingRules: MetricSummary;
    deltaPnl: number;
    summary: string;
  };
  protocol: string[];
  violatingTradeIds: string[];
}

export interface BehavioralPerformanceReport {
  state: 1 | 2 | 3;
  totalTrades: number;
  totalDays: number;
  overallDisciplineScore: number; // 0 - 100%
  cleanTradesCount: number; // Exactly how many trades had 0 breaches
  violatingTradesCount: number; // Exactly how many trades had >=1 breach
  ruleAdherenceRate: number; // True % of clean trades (e.g. 35.8%)
  grossHabitLosses: number; // Actual gross losses suffered on violating trades ($388.77)
  activeRulesCount: number;
  violationsCount: number;
  majorPatterns: BehaviorDetectionResult[];
  consequenceComparison: {
    ruleFollowing: MetricSummary;
    ruleViolating: MetricSummary;
    netDrag: number;
    summary: string;
  };
  traderProfile: {
    tradingStyle: string;
    biggestStrength: string;
    biggestWeakness: string;
    dangerZone: string;
    bestSessionWindow: string;
    worstSessionWindow: string;
    recommendedRule: string;
  };
  actionableProtocols: Array<{
    title: string;
    steps: string[];
  }>;
  tradeViolationsMap?: Record<string, string[]>;
}

export interface PreTradeAnalysisResult {
  status: 'SAFE' | 'CAUTION' | 'HIGH RISK' | 'BLOCK';
  ruleResults: RuleEvaluationResult[];
  behaviorDetected: string | null;
  why: string[];
  historicalConsequence: {
    totalSimilar: number;
    winRate: number;
    avgPnl: number;
    summary: string;
  } | null;
  protocol: string[];
  canProceed: boolean;
  recommendation: 'proceed' | 'modify' | 'cancel';
  verdict: string;
  explanation: string;
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

export function fmtUSD(val: number): string {
  const abs = Math.abs(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return val >= 0 ? `$${abs}` : `-$${abs}`;
}

export function normalizeRawTrades(rawTrades: any[], accountBalance: number = 2000): NormalizedTrade[] {
  if (!rawTrades || !Array.isArray(rawTrades)) return [];

  return rawTrades.map((t: any) => {
    const openTime = new Date(t.entryTime || t.open_time || t.openTime || Date.now());
    const closeTime = t.exitTime || t.close_time || t.closeTime ? new Date(t.exitTime || t.close_time || t.closeTime) : null;
    const profit = Number(t.pnl ?? t.profit ?? t.netProfit ?? 0);
    const comm = Number(t.fees ?? t.commission ?? 0);
    const swap = Number(t.swap ?? 0);
    const netProfit = profit - comm + swap;

    const entryPrice = Number(t.entryPrice ?? t.entry_price ?? 0);
    const exitPrice = t.exitPrice ?? t.exit_price ? Number(t.exitPrice ?? t.exit_price) : null;
    const stopLoss = t.stopLoss !== null && t.stopLoss !== undefined && !isNaN(Number(t.stopLoss)) ? Number(t.stopLoss) : (t.stop_loss ? Number(t.stop_loss) : null);
    const takeProfit = t.takeProfit !== null && t.takeProfit !== undefined && !isNaN(Number(t.takeProfit)) ? Number(t.takeProfit) : (t.take_profit ? Number(t.take_profit) : null);
    const lotSize = Number(t.quantity ?? t.lot_size ?? t.lotSize ?? t.positionSize ?? 0.01);
    const symbol = (t.symbol || 'UNKNOWN').toUpperCase().replace('/', '').trim();

    let rr = t.riskReward !== null && t.riskReward !== undefined ? Number(t.riskReward) : null;
    if (rr === null && stopLoss !== null && takeProfit !== null && entryPrice > 0) {
      const riskDist = Math.abs(entryPrice - stopLoss);
      const rewardDist = Math.abs(takeProfit - entryPrice);
      if (riskDist > 0) {
        rr = Number((rewardDist / riskDist).toFixed(2));
      }
    }

    let riskPct = t.riskPercentage !== null && t.riskPercentage !== undefined ? Number(t.riskPercentage) : null;
    if (riskPct === null && stopLoss !== null && entryPrice > 0) {
      const dollarRisk = calculateDollarRisk(symbol, entryPrice, stopLoss, lotSize);
      if (accountBalance > 0) {
        riskPct = Number(((dollarRisk / accountBalance) * 100).toFixed(2));
      }
    } else if (riskPct === null && profit < 0 && accountBalance > 0) {
      riskPct = Number(((Math.abs(netProfit) / accountBalance) * 100).toFixed(2));
    }

    let dur = t.duration ? Number(t.duration) : null;
    if (dur === null && closeTime) {
      dur = Math.max(0, Math.round((closeTime.getTime() - openTime.getTime()) / 1000));
    }

    return {
      id: String(t.id || 'trade-' + Math.random().toString(36).slice(2)),
      symbol,
      openTime,
      closeTime,
      direction: (String(t.direction || 'LONG').toUpperCase() === 'SHORT' ? 'SHORT' : 'LONG') as 'LONG' | 'SHORT',
      lotSize,
      entryPrice,
      exitPrice,
      stopLoss,
      takeProfit,
      profit,
      commission: comm,
      swap,
      netProfit,
      riskPercentage: riskPct,
      riskReward: rr,
      durationSeconds: dur,
      status: (String(t.status || 'CLOSED').toUpperCase() === 'OPEN' ? 'OPEN' : 'CLOSED') as 'OPEN' | 'CLOSED'
    };
  }).sort((a, b) => a.openTime.getTime() - b.openTime.getTime());
}

/**
 * Convert DB TradingRule array into clean UserRuleConfig
 */
export function parseUserRules(dbRules: any[]): UserRuleConfig {
  const config: UserRuleConfig = {};
  if (!dbRules || !Array.isArray(dbRules)) return config;

  for (const r of dbRules) {
    if (r.isActive === false) continue;
    const type = r.ruleType || '';
    const val = r.value;

    switch (type) {
      case 'max_trades_per_day':
        if (val) config.maxTradesPerDay = parseInt(val, 10);
        break;
      case 'max_trades_per_hour':
        if (val) config.maxTradesPerHour = parseInt(val, 10);
        break;
      case 'max_trades_per_30min':
        if (val) config.maxTradesPer30Min = parseInt(val, 10);
        break;
      case 'max_risk':
      case 'max_risk_per_trade':
        if (val) config.maxRiskPerTrade = parseFloat(val);
        break;
      case 'max_daily_loss':
        if (val) config.maxDailyLoss = parseFloat(val);
        break;
      case 'max_consecutive_losses':
        if (val) config.maxConsecutiveLosses = parseInt(val, 10);
        break;
      case 'no_revenge_trading':
      case 'cooldown_after_loss':
        if (val) config.cooldownAfterLoss = parseInt(val, 10);
        else config.cooldownAfterLoss = 15;
        break;
      case 'cooldown_after_consecutive_losses':
        if (val) config.cooldownAfterConsecutiveLosses = parseInt(val, 10);
        break;
      case 'max_lot_size':
      case 'max_position_size':
        if (val) config.maxLotSize = parseFloat(val);
        break;
      case 'no_lot_increase_after_loss':
      case 'allow_lot_increase_after_loss':
        config.allowLotIncreaseAfterLoss = false;
        break;
      case 'min_risk_reward':
      case 'minimum_risk_reward':
        if (val) config.minimumRiskReward = parseFloat(val);
        break;
      case 'allowed_sessions':
        if (val) {
          try {
            config.allowedSessions = typeof val === 'string' && val.startsWith('[') ? JSON.parse(val) : val.split(',').map((s: string) => s.trim());
          } catch {
            config.allowedSessions = [val];
          }
        }
        break;
      case 'allowed_symbols':
        if (val) {
          try {
            config.allowedSymbols = typeof val === 'string' && val.startsWith('[') ? JSON.parse(val) : val.split(',').map((s: string) => s.trim().toUpperCase());
          } catch {
            config.allowedSymbols = [val.toUpperCase()];
          }
        }
        break;
      case 'daily_profit_target':
        if (val) {
          config.dailyProfitTarget = parseFloat(val);
          config.stopAfterProfitTarget = true;
        }
        break;
      case 'stop_loss_required':
      case 'mandatory_stop_loss':
        config.stopLossRequired = (val === 'true' || val === true || val === '1' || val === 'enforced');
        break;
    }
  }

  return config;
}

// ─── SESSION DETECTOR ─────────────────────────────────────────────────────────

export function getTradeSession(utcHour: number): string {
  // Standard UTC market sessions:
  // Tokyo/Asian: 00:00 - 09:00 UTC
  // London: 08:00 - 16:30 UTC
  // New York: 13:00 - 21:00 UTC
  const sessions: string[] = [];
  if (utcHour >= 0 && utcHour < 9) sessions.push('Asian');
  if (utcHour >= 8 && utcHour < 17) sessions.push('London');
  if (utcHour >= 13 && utcHour < 21) sessions.push('New York');
  return sessions.length > 0 ? sessions.join(' / ') : 'Off-Hours';
}

export function isSessionAllowed(utcHour: number, allowedSessions: string[]): boolean {
  if (!allowedSessions || allowedSessions.length === 0) return true;
  const currentSession = getTradeSession(utcHour).toLowerCase();
  return allowedSessions.some(s => currentSession.includes(s.toLowerCase().trim()));
}

// ─── METRICS CALCULATION ──────────────────────────────────────────────────────

export function computeTradeMetrics(trades: NormalizedTrade[]): MetricSummary {
  if (trades.length === 0) {
    return {
      tradesCount: 0,
      winRate: 0,
      totalPnl: 0,
      avgPnl: 0,
      avgWin: 0,
      avgLoss: 0,
      profitFactor: 0
    };
  }

  const wins = trades.filter(t => t.netProfit > 0);
  const losses = trades.filter(t => t.netProfit < 0);
  const totalPnl = trades.reduce((sum, t) => sum + t.netProfit, 0);
  const grossWin = wins.reduce((sum, t) => sum + t.netProfit, 0);
  const grossLoss = Math.abs(losses.reduce((sum, t) => sum + t.netProfit, 0));

  return {
    tradesCount: trades.length,
    winRate: Number(((wins.length / trades.length) * 100).toFixed(1)),
    totalPnl: Number(totalPnl.toFixed(2)),
    grossWin: Number(grossWin.toFixed(2)),
    grossLoss: Number(grossLoss.toFixed(2)),
    avgPnl: Number((totalPnl / trades.length).toFixed(2)),
    avgWin: wins.length > 0 ? Number((grossWin / wins.length).toFixed(2)) : 0,
    avgLoss: losses.length > 0 ? Number((grossLoss / losses.length).toFixed(2)) : 0,
    profitFactor: grossLoss > 0 ? Number((grossWin / grossLoss).toFixed(2)) : (grossWin > 0 ? 99.9 : 0)
  };
}

// ─── BEHAVIOURAL ANALYSIS ENGINE (HISTORICAL) ─────────────────────────────────

export function runBehavioralAnalysis(
  trades: NormalizedTrade[],
  rules: UserRuleConfig,
  accountBalance: number = 2000
): BehavioralPerformanceReport {
  if (trades.length === 0) {
    return {
      state: 1,
      totalTrades: 0,
      totalDays: 0,
      overallDisciplineScore: 100,
      cleanTradesCount: 0,
      violatingTradesCount: 0,
      ruleAdherenceRate: 100,
      grossHabitLosses: 0,
      activeRulesCount: Object.values(rules).filter(v => v !== null && v !== undefined && v !== false).length,
      violationsCount: 0,
      majorPatterns: [],
      consequenceComparison: {
        ruleFollowing: computeTradeMetrics([]),
        ruleViolating: computeTradeMetrics([]),
        netDrag: 0,
        summary: 'No trade history found. Import your MT5 statement to begin.'
      },
      traderProfile: {
        tradingStyle: 'Unclassified',
        biggestStrength: 'Clean Slate',
        biggestWeakness: 'None Detected',
        dangerZone: 'No Data',
        bestSessionWindow: 'N/A',
        worstSessionWindow: 'N/A',
        recommendedRule: 'Import your trade history to receive data-driven rules.'
      },
      actionableProtocols: []
    };
  }

  const activeRulesList = Object.entries(rules).filter(([_, v]) => v !== null && v !== undefined && v !== false);
  const hasRules = activeRulesList.length > 0;

  // Group trades by calendar day (YYYY-MM-DD)
  const dayMap = new Map<string, NormalizedTrade[]>();
  for (const t of trades) {
    const dStr = t.openTime.toISOString().split('T')[0];
    if (!dayMap.has(dStr)) dayMap.set(dStr, []);
    dayMap.get(dStr)!.push(t);
  }
  const totalDays = dayMap.size;

  // If no rules exist -> State 2
  if (!hasRules) {
    const metrics = computeTradeMetrics(trades);
    return {
      state: 2,
      totalTrades: trades.length,
      totalDays,
      overallDisciplineScore: 100,
      cleanTradesCount: trades.length,
      violatingTradesCount: 0,
      ruleAdherenceRate: 100,
      grossHabitLosses: 0,
      activeRulesCount: 0,
      violationsCount: 0,
      majorPatterns: [],
      consequenceComparison: {
        ruleFollowing: metrics,
        ruleViolating: computeTradeMetrics([]),
        netDrag: 0,
        summary: 'All trades logged. Define personal rules in the Rules section to unlock behavioral leak detection.'
      },
      traderProfile: generateTraderProfile(trades),
      actionableProtocols: [
        {
          title: 'Define Personal Risk Rules',
          steps: [
            'Set maximum daily trades (e.g. 5 trades/day) to prevent overtrading.',
            'Define a mandatory cooldown after loss (e.g. 15-30 minutes) to stop revenge entries.',
            'Establish hard risk limits per trade (e.g. 1.0% cap).'
          ]
        }
      ]
    };
  }

  // ─── STATE 3: FULL EVIDENCE-BASED AUDIT AGAINST ALL 14 RULES ─────────────────

  const allViolations: RuleEvaluationResult[] = [];
  const violatingTradeIdSet = new Set<string>();

  // Tracking for multi-signal behaviors
  const dailyLimitViolations: Array<{ date: string; count: number; excessTrades: NormalizedTrade[] }> = [];
  const hourlyConcentrations: Array<{ hourStr: string; count: number; trades: NormalizedTrade[] }> = [];
  const rolling30MinViolations: Array<{ startTime: Date; count: number; trades: NormalizedTrade[] }> = [];
  const riskViolations: Array<{ trade: NormalizedTrade; actualRisk: number; maxRisk: number }> = [];
  const dailyLossBreaches: Array<{ date: string; cumulativeLoss: number; tradesAfterBreach: NormalizedTrade[] }> = [];
  const consecutiveLossBreaches: Array<{ streak: number; tradeAfterStreak: NormalizedTrade }> = [];
  const cooldownViolations: Array<{ trade: NormalizedTrade; prevLoss: NormalizedTrade; actualGapMin: number; requiredMin: number }> = [];
  const streakCooldownViolations: Array<{ trade: NormalizedTrade; streak: number; actualGapMin: number; requiredMin: number }> = [];
  const lotSizeViolations: Array<{ trade: NormalizedTrade; actualLot: number; maxLot: number }> = [];
  const lotIncreaseAfterLossViolations: Array<{ trade: NormalizedTrade; prevLoss: NormalizedTrade; prevLot: number; nextLot: number }> = [];
  const rrViolations: Array<{ trade: NormalizedTrade; actualRR: number; minRR: number }> = [];
  const sessionViolations: Array<{ trade: NormalizedTrade; session: string; allowed: string[] }> = [];
  const symbolViolations: Array<{ trade: NormalizedTrade; symbol: string; allowed: string[] }> = [];
  const profitGivebackEvents: Array<{ date: string; peakPnl: number; finalPnl: number; giveback: number; givebackTrades: NormalizedTrade[] }> = [];

  // --- 1. Evaluate Daily Rules (Rule 1: maxTradesPerDay, Rule 5: maxDailyLoss, Rule 14: dailyProfitTarget) ---
  for (const [dStr, dTrades] of dayMap.entries()) {
    // Rule 1: maxTradesPerDay
    if (rules.maxTradesPerDay && dTrades.length > rules.maxTradesPerDay) {
      const excess = dTrades.slice(rules.maxTradesPerDay);
      dailyLimitViolations.push({ date: dStr, count: dTrades.length, excessTrades: excess });
      excess.forEach(t => {
        violatingTradeIdSet.add(t.id);
        allViolations.push({
          ruleId: 'rule-max-trades-per-day',
          ruleName: 'Max Trades Per Day Limit',
          ruleType: 'max_trades_per_day',
          tradeId: t.id,
          status: 'VIOLATION',
          expectedValue: `${rules.maxTradesPerDay} trades`,
          actualValue: `${dTrades.length} trades`,
          violationAmount: dTrades.length - (rules.maxTradesPerDay || 0),
          timestamp: t.openTime,
          evidence: `Trade executed on ${dStr} as trade #${dTrades.indexOf(t) + 1} exceeding daily cap of ${rules.maxTradesPerDay}.`
        });
      });
    }

    // Rule 5: maxDailyLoss & Rule 14: dailyProfitTarget with Giveback check
    let runningDailyPnl = 0;
    let peakDailyPnl = 0;
    let breachedDailyLoss = false;
    let hitProfitTarget = false;
    const tradesAfterLossBreach: NormalizedTrade[] = [];
    const tradesAfterTarget: NormalizedTrade[] = [];

    const maxLossDollars = rules.maxDailyLoss 
      ? (rules.maxDailyLoss < 10 ? (rules.maxDailyLoss / 100) * accountBalance : rules.maxDailyLoss) 
      : null;
    const profitTargetDollars = rules.dailyProfitTarget 
      ? (rules.dailyProfitTarget < 10 ? (rules.dailyProfitTarget / 100) * accountBalance : rules.dailyProfitTarget) 
      : null;

    for (const t of dTrades) {
      if (breachedDailyLoss) {
        tradesAfterLossBreach.push(t);
        violatingTradeIdSet.add(t.id);
        allViolations.push({
          ruleId: 'rule-max-daily-loss',
          ruleName: 'Max Daily Loss Circuit Breaker',
          ruleType: 'max_daily_loss',
          tradeId: t.id,
          status: 'VIOLATION',
          expectedValue: `Halt trading at -${fmtUSD(maxLossDollars || 0)}`,
          actualValue: `Day loss exceeded`,
          timestamp: t.openTime,
          evidence: `Continued trading on ${dStr} after cumulative loss breached daily risk threshold.`
        });
      }

      if (hitProfitTarget && rules.stopAfterProfitTarget) {
        tradesAfterTarget.push(t);
        violatingTradeIdSet.add(t.id);
        allViolations.push({
          ruleId: 'rule-daily-profit-target',
          ruleName: 'Daily Profit Target & Capital Lock',
          ruleType: 'daily_profit_target',
          tradeId: t.id,
          status: 'VIOLATION',
          expectedValue: `Lock profits at +${fmtUSD(profitTargetDollars || 0)}`,
          actualValue: `Continued execution`,
          timestamp: t.openTime,
          evidence: `Executed additional trade on ${dStr} after reaching profit target.`
        });
      }

      runningDailyPnl += t.netProfit;
      if (runningDailyPnl > peakDailyPnl) {
        peakDailyPnl = runningDailyPnl;
      }

      if (maxLossDollars && runningDailyPnl <= -maxLossDollars) {
        breachedDailyLoss = true;
      }

      if (profitTargetDollars && runningDailyPnl >= profitTargetDollars) {
        hitProfitTarget = true;
      }
    }

    if (tradesAfterLossBreach.length > 0) {
      dailyLossBreaches.push({ date: dStr, cumulativeLoss: runningDailyPnl, tradesAfterBreach: tradesAfterLossBreach });
    }

    if (hitProfitTarget && peakDailyPnl > runningDailyPnl && (peakDailyPnl - runningDailyPnl) >= (profitTargetDollars || 50) * 0.4) {
      profitGivebackEvents.push({
        date: dStr,
        peakPnl: peakDailyPnl,
        finalPnl: runningDailyPnl,
        giveback: peakDailyPnl - runningDailyPnl,
        givebackTrades: tradesAfterTarget
      });
    }
  }

  // --- 2. Evaluate Hourly (Rule 2: maxTradesPerHour) & Rolling 30-min (Rule 3: maxTradesPer30Min) ---
  const hourlyMap = new Map<string, NormalizedTrade[]>();
  for (const t of trades) {
    const hKey = `${t.openTime.toISOString().split('T')[0]} H${t.openTime.getUTCHours()}`;
    if (!hourlyMap.has(hKey)) hourlyMap.set(hKey, []);
    hourlyMap.get(hKey)!.push(t);
  }

  if (rules.maxTradesPerHour) {
    for (const [hKey, hTrades] of hourlyMap.entries()) {
      if (hTrades.length > rules.maxTradesPerHour) {
        hourlyConcentrations.push({ hourStr: hKey, count: hTrades.length, trades: hTrades });
        hTrades.slice(rules.maxTradesPerHour).forEach(t => {
          violatingTradeIdSet.add(t.id);
          allViolations.push({
            ruleId: 'rule-max-trades-per-hour',
            ruleName: 'Max Trades Per Hour Frequency',
            ruleType: 'max_trades_per_hour',
            tradeId: t.id,
            status: 'VIOLATION',
            expectedValue: `${rules.maxTradesPerHour} trades/hr`,
            actualValue: `${hTrades.length} trades in hour`,
            violationAmount: hTrades.length - (rules.maxTradesPerHour || 0),
            timestamp: t.openTime,
            evidence: `${hTrades.length} trades concentrated in 1-hour window (${hKey}). Limit is ${rules.maxTradesPerHour}.`
          });
        });
      }
    }
  }

  // Rolling 30-minute window (Rule 3)
  if (rules.maxTradesPer30Min) {
    const thirtyMinMs = 30 * 60 * 1000;
    for (let i = 0; i < trades.length; i++) {
      const windowStart = trades[i].openTime.getTime();
      const windowTrades: NormalizedTrade[] = [];
      for (let j = i; j < trades.length; j++) {
        if (trades[j].openTime.getTime() - windowStart <= thirtyMinMs) {
          windowTrades.push(trades[j]);
        } else {
          break;
        }
      }
      if (windowTrades.length > rules.maxTradesPer30Min) {
        const alreadyFlagged = rolling30MinViolations.some(v => Math.abs(v.startTime.getTime() - windowStart) < 15 * 60 * 1000);
        if (!alreadyFlagged) {
          rolling30MinViolations.push({ startTime: trades[i].openTime, count: windowTrades.length, trades: windowTrades });
          windowTrades.slice(rules.maxTradesPer30Min).forEach(t => {
            violatingTradeIdSet.add(t.id);
            allViolations.push({
              ruleId: 'rule-max-trades-per-30min',
              ruleName: 'Max Trades in 30 Minutes',
              ruleType: 'max_trades_per_30min',
              tradeId: t.id,
              status: 'VIOLATION',
              expectedValue: `${rules.maxTradesPer30Min} trades/30m`,
              actualValue: `${windowTrades.length} trades in 30m`,
              violationAmount: windowTrades.length - (rules.maxTradesPer30Min || 0),
              timestamp: t.openTime,
              evidence: `${windowTrades.length} rapid entries within 30 minutes starting at ${trades[i].openTime.toLocaleTimeString()}.`
            });
          });
        }
      }
    }
  }

  // --- 3. Evaluate Trade-to-Trade Sequences (Cooldowns, Sizing After Loss, Losing Streaks) ---
  let consecutiveLosses = 0;

  for (let i = 0; i < trades.length; i++) {
    const t = trades[i];

    // Check Rule 4: maxRiskPerTrade
    if (rules.maxRiskPerTrade) {
      if (t.riskPercentage !== null && t.riskPercentage > rules.maxRiskPerTrade) {
        riskViolations.push({ trade: t, actualRisk: t.riskPercentage, maxRisk: rules.maxRiskPerTrade });
        violatingTradeIdSet.add(t.id);
        allViolations.push({
          ruleId: 'rule-max-risk-per-trade',
          ruleName: 'Max Risk Per Trade Cap',
          ruleType: 'max_risk',
          tradeId: t.id,
          status: 'VIOLATION',
          expectedValue: `≤ ${rules.maxRiskPerTrade}%`,
          actualValue: `${t.riskPercentage.toFixed(2)}%`,
          violationAmount: Number((t.riskPercentage - rules.maxRiskPerTrade).toFixed(2)),
          timestamp: t.openTime,
          evidence: `Trade risked ${t.riskPercentage.toFixed(2)}% of capital against your ${rules.maxRiskPerTrade}% ceiling.`
        });
      }
    }

    // Check Mandatory Hard Stop-Loss
    if (rules.stopLossRequired && !t.stopLoss) {
      violatingTradeIdSet.add(t.id);
      allViolations.push({
        ruleId: 'rule-stop-loss-required',
        ruleName: 'Mandatory Hard Stop-Loss',
        ruleType: 'stop_loss_required',
        tradeId: t.id,
        status: 'VIOLATION',
        expectedValue: 'Stop Loss Placed',
        actualValue: 'No Stop Loss',
        timestamp: t.openTime,
        evidence: 'Trade executed without a registered stop-loss order.'
      });
    }

    // Check Rule 9: maxLotSize
    if (rules.maxLotSize && t.lotSize > rules.maxLotSize) {
      lotSizeViolations.push({ trade: t, actualLot: t.lotSize, maxLot: rules.maxLotSize });
      violatingTradeIdSet.add(t.id);
      allViolations.push({
        ruleId: 'rule-max-lot-size',
        ruleName: 'Maximum Position Lot Size',
        ruleType: 'max_lot_size',
        tradeId: t.id,
        status: 'VIOLATION',
        expectedValue: `≤ ${rules.maxLotSize} lots`,
        actualValue: `${t.lotSize} lots`,
        violationAmount: Number((t.lotSize - rules.maxLotSize).toFixed(2)),
        timestamp: t.openTime,
        evidence: `Position size of ${t.lotSize} lots exceeded maximum allowable lot size of ${rules.maxLotSize}.`
      });
    }

    // Check Rule 11: minimumRiskReward
    if (rules.minimumRiskReward) {
      if (t.riskReward !== null) {
        if (t.riskReward < rules.minimumRiskReward) {
          rrViolations.push({ trade: t, actualRR: t.riskReward, minRR: rules.minimumRiskReward });
          violatingTradeIdSet.add(t.id);
          allViolations.push({
            ruleId: 'rule-minimum-risk-reward',
            ruleName: 'Minimum Risk/Reward Benchmark',
            ruleType: 'min_risk_reward',
            tradeId: t.id,
            status: 'VIOLATION',
            expectedValue: `≥ 1:${rules.minimumRiskReward.toFixed(2)}`,
            actualValue: `1:${t.riskReward.toFixed(2)}`,
            timestamp: t.openTime,
            evidence: `Planned R:R of 1:${t.riskReward.toFixed(2)} was below your mandatory 1:${rules.minimumRiskReward.toFixed(2)} threshold.`
          });
        }
      }
    }

    // Check Rule 12: allowedSessions
    if (rules.allowedSessions && rules.allowedSessions.length > 0) {
      const utcHour = t.openTime.getUTCHours();
      if (!isSessionAllowed(utcHour, rules.allowedSessions)) {
        const detectedSession = getTradeSession(utcHour);
        sessionViolations.push({ trade: t, session: detectedSession, allowed: rules.allowedSessions });
        violatingTradeIdSet.add(t.id);
        allViolations.push({
          ruleId: 'rule-allowed-sessions',
          ruleName: 'Permitted Trading Sessions',
          ruleType: 'allowed_sessions',
          tradeId: t.id,
          status: 'VIOLATION',
          expectedValue: rules.allowedSessions.join(', '),
          actualValue: detectedSession,
          timestamp: t.openTime,
          evidence: `Trade opened outside permitted sessions (${detectedSession} at ${utcHour}:00 UTC).`
        });
      }
    }

    // Check Rule 13: allowedSymbols
    if (rules.allowedSymbols && rules.allowedSymbols.length > 0) {
      const isAllowed = rules.allowedSymbols.some(s => s.toUpperCase().replace('/', '') === t.symbol.toUpperCase());
      if (!isAllowed) {
        symbolViolations.push({ trade: t, symbol: t.symbol, allowed: rules.allowedSymbols });
        violatingTradeIdSet.add(t.id);
        allViolations.push({
          ruleId: 'rule-allowed-symbols',
          ruleName: 'Approved Playbook Instruments',
          ruleType: 'allowed_symbols',
          tradeId: t.id,
          status: 'VIOLATION',
          expectedValue: rules.allowedSymbols.join(', '),
          actualValue: t.symbol,
          timestamp: t.openTime,
          evidence: `Executed on ${t.symbol}, which is not on your approved playbook instrument list.`
        });
      }
    }

    // Sequence checks relative to previous trade (i > 0)
    if (i > 0) {
      const prev = trades[i - 1];

      // If previous trade was a loss:
      if (prev.netProfit < 0) {
        const prevClose = prev.closeTime || prev.openTime;
        const gapMin = (t.openTime.getTime() - prevClose.getTime()) / (60 * 1000);

        // Rule 7: cooldownAfterLoss
        if (rules.cooldownAfterLoss && gapMin >= 0 && gapMin < rules.cooldownAfterLoss) {
          cooldownViolations.push({ trade: t, prevLoss: prev, actualGapMin: Math.round(gapMin), requiredMin: rules.cooldownAfterLoss });
          violatingTradeIdSet.add(t.id);
          allViolations.push({
            ruleId: 'rule-cooldown-after-loss',
            ruleName: 'Mandatory Post-Loss Cooldown',
            ruleType: 'cooldown_after_loss',
            tradeId: t.id,
            status: 'VIOLATION',
            expectedValue: `≥ ${rules.cooldownAfterLoss} min cooldown`,
            actualValue: `${Math.round(gapMin)} min`,
            violationAmount: rules.cooldownAfterLoss - Math.round(gapMin),
            timestamp: t.openTime,
            evidence: `Entered ${Math.round(gapMin)} minutes after a loss (required cooldown: ${rules.cooldownAfterLoss} min).`
          });
        }

        // Rule 10: allowLotIncreaseAfterLoss (false = prohibited)
        if (rules.allowLotIncreaseAfterLoss === false && t.lotSize > prev.lotSize * 1.05) {
          lotIncreaseAfterLossViolations.push({ trade: t, prevLoss: prev, prevLot: prev.lotSize, nextLot: t.lotSize });
          violatingTradeIdSet.add(t.id);
          allViolations.push({
            ruleId: 'rule-no-lot-increase-after-loss',
            ruleName: 'No Lot Sizing Escalation After Loss',
            ruleType: 'no_lot_increase_after_loss',
            tradeId: t.id,
            status: 'VIOLATION',
            expectedValue: `≤ ${prev.lotSize} lots`,
            actualValue: `${t.lotSize} lots`,
            violationAmount: Number((t.lotSize - prev.lotSize).toFixed(2)),
            timestamp: t.openTime,
            evidence: `Increased lot size to ${t.lotSize} immediately following a loss of ${fmtUSD(prev.netProfit)} (prev lot: ${prev.lotSize}).`
          });
        }
      }

      // Rule 6: maxConsecutiveLosses & Rule 8: cooldownAfterConsecutiveLosses
      if (rules.maxConsecutiveLosses && consecutiveLosses >= rules.maxConsecutiveLosses) {
        consecutiveLossBreaches.push({ streak: consecutiveLosses, tradeAfterStreak: t });
        violatingTradeIdSet.add(t.id);
        allViolations.push({
          ruleId: 'rule-max-consecutive-losses',
          ruleName: 'Max Consecutive Loss Limit',
          ruleType: 'max_consecutive_losses',
          tradeId: t.id,
          status: 'VIOLATION',
          expectedValue: `Halt at ${rules.maxConsecutiveLosses} consecutive losses`,
          actualValue: `${consecutiveLosses} loss streak`,
          timestamp: t.openTime,
          evidence: `Executed trade while on a ${consecutiveLosses}-loss losing streak.`
        });

        if (rules.cooldownAfterConsecutiveLosses) {
          const prevClose = prev.closeTime || prev.openTime;
          const streakGapMin = (t.openTime.getTime() - prevClose.getTime()) / (60 * 1000);
          if (streakGapMin < rules.cooldownAfterConsecutiveLosses) {
            streakCooldownViolations.push({
              trade: t,
              streak: consecutiveLosses,
              actualGapMin: Math.round(streakGapMin),
              requiredMin: rules.cooldownAfterConsecutiveLosses
            });
            allViolations.push({
              ruleId: 'rule-streak-cooldown',
              ruleName: 'Losing Streak Cooldown',
              ruleType: 'cooldown_after_consecutive_losses',
              tradeId: t.id,
              status: 'VIOLATION',
              expectedValue: `≥ ${rules.cooldownAfterConsecutiveLosses} min`,
              actualValue: `${Math.round(streakGapMin)} min`,
              timestamp: t.openTime,
              evidence: `Entered ${Math.round(streakGapMin)} min after a ${consecutiveLosses}-loss streak (required: ${rules.cooldownAfterConsecutiveLosses} min).`
            });
          }
        }
      }
    }

    // Update consecutive losses
    if (t.netProfit < 0) {
      consecutiveLosses++;
    } else if (t.netProfit > 0) {
      consecutiveLosses = 0;
    }
  }

  // ─── 4. MULTI-SIGNAL BEHAVIOUR DETECTION (NO DOUBLE-COUNTING) ─────────────────

  const majorPatterns: BehaviorDetectionResult[] = [];

  const buildConsequence = (patternTrades: NormalizedTrade[], patternLabel: string) => {
    const patternIds = new Set(patternTrades.map(t => t.id));
    const compliant = trades.filter(t => !patternIds.has(t.id));
    const compMetrics = computeTradeMetrics(compliant);
    const violMetrics = computeTradeMetrics(patternTrades);
    const delta = Number((violMetrics.avgPnl - compMetrics.avgPnl).toFixed(2));

    const summary = violMetrics.tradesCount > 0
      ? `Rule-following trades produced an average P&L of ${fmtUSD(compMetrics.avgPnl)} (${compMetrics.winRate}% win rate), while trades flagged for ${patternLabel} averaged ${fmtUSD(violMetrics.avgPnl)} (${violMetrics.winRate}% win rate).`
      : 'No historical drag recorded.';

    return {
      withinRules: compMetrics,
      violatingRules: violMetrics,
      deltaPnl: delta,
      summary
    };
  };

  // BEHAVIOUR A: OVERTRADING
  let overtradingScore = 0;
  const overtradingSignals: string[] = [];
  const overtradingTradesSet = new Set<NormalizedTrade>();

  if (dailyLimitViolations.length > 0) {
    overtradingScore += 30;
    overtradingSignals.push(`Daily trade cap exceeded on ${dailyLimitViolations.length} days`);
    dailyLimitViolations.flatMap(d => d.excessTrades).forEach(t => overtradingTradesSet.add(t));
  }
  if (hourlyConcentrations.length > 0) {
    overtradingScore += 20;
    overtradingSignals.push(`Hourly trade density exceeded limit in ${hourlyConcentrations.length} separate hours`);
    hourlyConcentrations.flatMap(h => h.trades).forEach(t => overtradingTradesSet.add(t));
  }
  if (rolling30MinViolations.length > 0) {
    overtradingScore += 20;
    overtradingSignals.push(`${rolling30MinViolations.length} rapid entry clusters in 30-minute rolling windows`);
    rolling30MinViolations.flatMap(r => r.trades).forEach(t => overtradingTradesSet.add(t));
  }
  if (profitGivebackEvents.length > 0) {
    overtradingScore += 20;
    overtradingSignals.push(`Continued trading after reaching daily profit target on ${profitGivebackEvents.length} days`);
    profitGivebackEvents.flatMap(p => p.givebackTrades).forEach(t => overtradingTradesSet.add(t));
  }
  if (dailyLimitViolations.length >= 3 || hourlyConcentrations.length >= 3) {
    overtradingScore += 10;
    overtradingSignals.push('Persistent multi-session recurrence');
  }

  if (overtradingScore >= 25 && overtradingTradesSet.size > 0) {
    const pTrades = Array.from(overtradingTradesSet);
    const consequence = buildConsequence(pTrades, 'Overtrading');
    const severity: 'LOW' | 'MODERATE' | 'HIGH' | 'SEVERE' = 
      overtradingScore >= 75 ? 'SEVERE' : overtradingScore >= 50 ? 'HIGH' : overtradingScore >= 25 ? 'MODERATE' : 'LOW';
    const confidence: 'LOW' | 'MEDIUM' | 'HIGH' = 
      overtradingSignals.length >= 3 ? 'HIGH' : overtradingSignals.length === 2 ? 'MEDIUM' : 'LOW';

    majorPatterns.push({
      id: 'overtrading',
      type: 'OVERTRADING',
      name: 'Overtrading & High Frequency Execution',
      severity,
      confidence,
      score: Math.min(100, overtradingScore),
      signals: overtradingSignals,
      evidence: [
        `${dailyLimitViolations.length} days exceeded your daily cap (total ${dailyLimitViolations.reduce((s, d) => s + d.excessTrades.length, 0)} excess trades)`,
        `${rolling30MinViolations.length} rapid-entry spikes detected inside 30-minute windows`,
        `Net P&L during overtrading states: ${fmtUSD(consequence.violatingRules.totalPnl)} (Win rate: ${consequence.violatingRules.winRate}%)`
      ],
      consequence,
      protocol: [
        'Enforce a hard maximum of trades per day in your platform terminal.',
        'Step away from screens completely once your daily trade quota is filled.',
        'Implement an automated 15-minute cool-off timer between consecutive fills.',
        'Never trade past your daily profit target to preserve gains.',
        'Review your journal each evening to verify zero trade volume limit breaches.'
      ],
      violatingTradeIds: pTrades.map(t => t.id)
    });
  }

  // BEHAVIOUR B: POSSIBLE REVENGE TRADING
  const revengeTradesSet = new Set<NormalizedTrade>();
  const revengeSignals: string[] = [];
  let revengeScore = 0;

  if (cooldownViolations.length > 0) {
    cooldownViolations.forEach(c => revengeTradesSet.add(c.trade));
    revengeSignals.push(`${cooldownViolations.length} trades opened within cooldown period immediately after losses`);
    revengeScore += 35;
  }
  if (lotIncreaseAfterLossViolations.length > 0) {
    lotIncreaseAfterLossViolations.forEach(l => revengeTradesSet.add(l.trade));
    revengeSignals.push(`${lotIncreaseAfterLossViolations.length} trades expanded position lot size directly after taking a loss`);
    revengeScore += 35;
  }
  if (streakCooldownViolations.length > 0 || consecutiveLossBreaches.length > 0) {
    streakCooldownViolations.forEach(s => revengeTradesSet.add(s.trade));
    revengeSignals.push('Executed orders without cool-off while in a losing streak');
    revengeScore += 30;
  }

  const isCorrelatedRevenge = 
    (cooldownViolations.length > 0 && lotIncreaseAfterLossViolations.length > 0) ||
    (cooldownViolations.length > 0 && consecutiveLossBreaches.length > 0) ||
    (lotIncreaseAfterLossViolations.length >= 2);

  if (isCorrelatedRevenge && revengeTradesSet.size > 0) {
    const pTrades = Array.from(revengeTradesSet);
    const consequence = buildConsequence(pTrades, 'Possible Revenge Trading');
    const severity = revengeScore >= 70 ? 'SEVERE' : revengeScore >= 45 ? 'HIGH' : 'MODERATE';
    const confidence = (cooldownViolations.length >= 3 && lotIncreaseAfterLossViolations.length >= 2) ? 'HIGH' : 'MEDIUM';

    majorPatterns.push({
      id: 'revenge_trading',
      type: 'POSSIBLE_REVENGE_TRADING',
      name: 'Possible Revenge Trading Pattern',
      severity,
      confidence,
      score: Math.min(100, revengeScore),
      signals: revengeSignals,
      evidence: [
        `${cooldownViolations.length} trades occurred within your mandatory post-loss cooldown window`,
        `${lotIncreaseAfterLossViolations.length} of those trades entered with increased lot size`,
        `Shortest recovery attempt interval: ${Math.min(...cooldownViolations.map(c => c.actualGapMin), 15)} minutes after loss`,
        `Outcome: Net P&L on post-loss impulse entries: ${fmtUSD(consequence.violatingRules.totalPnl)} (${consequence.violatingRules.winRate}% win rate)`
      ],
      consequence,
      protocol: [
        'Enforce mandatory 30-minute physical screen detachment following any stop-out.',
        'Never increase position size following a losing trade to recover capital.',
        'Reset lot size to base minimum whenever a loss is logged.',
        'Log the exact setup rationale before clicking entry on any immediate re-test.',
        'If 2 consecutive losses occur, stop trading for the remainder of the session.'
      ],
      violatingTradeIds: pTrades.map(t => t.id)
    });
  }

  // BEHAVIOUR C: LOSS CHASING
  if (!isCorrelatedRevenge && (lotIncreaseAfterLossViolations.length > 0 || dailyLossBreaches.length > 0)) {
    const lossChasingTrades = [
      ...lotIncreaseAfterLossViolations.map(l => l.trade),
      ...dailyLossBreaches.flatMap(d => d.tradesAfterBreach)
    ];
    const uniqueLossChasing = Array.from(new Set(lossChasingTrades));

    if (uniqueLossChasing.length > 0) {
      const consequence = buildConsequence(uniqueLossChasing, 'Loss Chasing');
      majorPatterns.push({
        id: 'loss_chasing',
        type: 'LOSS_CHASING',
        name: 'Loss Chasing & Position Escalation',
        severity: dailyLossBreaches.length > 0 ? 'HIGH' : 'MODERATE',
        confidence: uniqueLossChasing.length >= 3 ? 'HIGH' : 'MEDIUM',
        score: 60,
        signals: [
          lotIncreaseAfterLossViolations.length > 0 ? `Position size escalated following losses on ${lotIncreaseAfterLossViolations.length} occasions` : '',
          dailyLossBreaches.length > 0 ? `Continued trading after daily loss limit was reached on ${dailyLossBreaches.length} days` : ''
        ].filter(Boolean),
        evidence: [
          `Increased lot size after losses on ${lotIncreaseAfterLossViolations.length} trades`,
          `${dailyLossBreaches.length} occurrences of trading through daily loss circuit breakers`,
          `Average P&L during loss chasing sequences: ${fmtUSD(consequence.violatingRules.avgPnl)}`
        ],
        consequence,
        protocol: [
          'Fix your position sizing formula: lots must remain constant regardless of recent outcome.',
          'Shut down trading software immediately when daily loss limit is touched.',
          'Do not attempt same-day breakeven recovery.'
        ],
        violatingTradeIds: uniqueLossChasing.map(t => t.id)
      });
    }
  }

  // BEHAVIOUR D: POSSIBLE IMPULSIVE TRADING
  if (rolling30MinViolations.length > 0 && !majorPatterns.some(p => p.type === 'POSSIBLE_REVENGE_TRADING')) {
    const impulsiveTrades = Array.from(new Set(rolling30MinViolations.flatMap(r => r.trades)));
    const consequence = buildConsequence(impulsiveTrades, 'Possible Impulsive Trading');

    majorPatterns.push({
      id: 'impulsive_trading',
      type: 'POSSIBLE_IMPULSIVE_TRADING',
      name: 'Possible Impulsive Trading Cluster',
      severity: rolling30MinViolations.length >= 3 ? 'HIGH' : 'MODERATE',
      confidence: rolling30MinViolations.length >= 2 ? 'HIGH' : 'MEDIUM',
      score: 55,
      signals: [
        `${rolling30MinViolations.length} clusters with rapid-fire executions inside 30 minutes`,
        'High execution frequency outside defined setup intervals'
      ],
      evidence: [
        `${impulsiveTrades.length} trades taken inside tight rolling 30-minute windows`,
        `Average return during rapid entry clusters: ${fmtUSD(consequence.violatingRules.avgPnl)}`
      ],
      consequence,
      protocol: [
        'Wait for complete bar close confirmation before entering any market order.',
        'Use limit orders at structural levels rather than market orders during fast momentum.',
        'Set a mandatory 15-minute pause between order executions.'
      ],
      violatingTradeIds: impulsiveTrades.map(t => t.id)
    });
  }

  // BEHAVIOUR E: EXCESSIVE RISK TAKING
  if (riskViolations.length > 0 || lotSizeViolations.length > 0) {
    const excessiveRiskTrades = Array.from(new Set([
      ...riskViolations.map(r => r.trade),
      ...lotSizeViolations.map(l => l.trade)
    ]));
    const consequence = buildConsequence(excessiveRiskTrades, 'Excessive Risk Taking');

    majorPatterns.push({
      id: 'excessive_risk',
      type: 'EXCESSIVE_RISK_TAKING',
      name: 'Excessive Risk & Oversizing Violations',
      severity: 'HIGH',
      confidence: excessiveRiskTrades.length >= 3 ? 'HIGH' : 'MEDIUM',
      score: 70,
      signals: [
        riskViolations.length > 0 ? `${riskViolations.length} trades breached maximum risk per trade (${rules.maxRiskPerTrade}%)` : '',
        lotSizeViolations.length > 0 ? `${lotSizeViolations.length} trades exceeded maximum allowable lot size (${rules.maxLotSize})` : ''
      ].filter(Boolean),
      evidence: [
        `${excessiveRiskTrades.length} total orders executed with oversized risk parameters`,
        riskViolations.length > 0 ? `Average risk on breach trades: ${(riskViolations.reduce((s, r) => s + r.actualRisk, 0) / riskViolations.length).toFixed(2)}%` : '',
        `Net P&L drag from oversized positions: ${fmtUSD(consequence.violatingRules.totalPnl)}`
      ].filter(Boolean),
      consequence,
      protocol: [
        'Calculate exact position size from stop-loss distance prior to order placement.',
        'Cap single-trade risk at 1.0% maximum of current equity.',
        'Never round up lot sizes on high-volatility instruments.'
      ],
      violatingTradeIds: excessiveRiskTrades.map(t => t.id)
    });
  }

  // BEHAVIOUR F: STRATEGY DEVIATION
  if (symbolViolations.length > 0 || sessionViolations.length > 0 || rrViolations.length > 0) {
    const deviationTrades = Array.from(new Set([
      ...symbolViolations.map(s => s.trade),
      ...sessionViolations.map(s => s.trade),
      ...rrViolations.map(r => r.trade)
    ]));
    const consequence = buildConsequence(deviationTrades, 'Strategy Deviation');

    const devSignals: string[] = [];
    if (symbolViolations.length > 0) devSignals.push(`${symbolViolations.length} trades on unapproved instruments (${Array.from(new Set(symbolViolations.map(s => s.symbol))).join(', ')})`);
    if (sessionViolations.length > 0) devSignals.push(`${sessionViolations.length} trades executed outside permitted sessions`);
    if (rrViolations.length > 0) devSignals.push(`${rrViolations.length} setups taken below mandatory minimum R:R`);

    majorPatterns.push({
      id: 'strategy_deviation',
      type: 'STRATEGY_DEVIATION',
      name: 'Strategy & Playbook Deviation',
      severity: deviationTrades.length >= 5 ? 'HIGH' : 'MODERATE',
      confidence: deviationTrades.length >= 3 ? 'HIGH' : 'MEDIUM',
      score: 50,
      signals: devSignals,
      evidence: [
        `${deviationTrades.length} trades breached predefined strategy bounds`,
        `Win rate on off-playbook trades: ${consequence.violatingRules.winRate}% vs ${consequence.withinRules.winRate}% on playbook trades`,
        `Average P&L on deviant trades: ${fmtUSD(consequence.violatingRules.avgPnl)}`
      ],
      consequence,
      protocol: [
        'Restrict order execution strictly to approved instrument watchlists.',
        'Trade exclusively within peak liquidity session windows.',
        'Require a minimum 1:2.0 planned risk/reward before pulling the trigger.'
      ],
      violatingTradeIds: deviationTrades.map(t => t.id)
    });
  }

  // BEHAVIOUR G: PROFIT GIVEBACK
  if (profitGivebackEvents.length > 0) {
    const givebackTrades = Array.from(new Set(profitGivebackEvents.flatMap(p => p.givebackTrades)));
    const totalGivenBack = profitGivebackEvents.reduce((s, p) => s + p.giveback, 0);

    majorPatterns.push({
      id: 'profit_giveback',
      type: 'PROFIT_GIVEBACK',
      name: 'Daily Profit Giveback Behavior',
      severity: totalGivenBack > 200 ? 'HIGH' : 'MODERATE',
      confidence: profitGivebackEvents.length >= 2 ? 'HIGH' : 'MEDIUM',
      score: 65,
      signals: [
        `Reached daily profit target but surrendered gains on ${profitGivebackEvents.length} days`,
        `Total profit given back: ${fmtUSD(totalGivenBack)}`
      ],
      evidence: [
        `Gave back substantial gains on ${profitGivebackEvents.length} separate trading sessions`,
        `Largest single-day giveback: ${fmtUSD(Math.max(...profitGivebackEvents.map(p => p.giveback)))} on ${profitGivebackEvents[0].date}`,
        `Total eroded profit: ${fmtUSD(totalGivenBack)}`
      ],
      consequence: buildConsequence(givebackTrades, 'Profit Giveback'),
      protocol: [
        'Lock terminal immediately upon achieving your daily profit target.',
        'Adopt a trailing profit lock: never allow a +2% day to close at breakeven or loss.',
        'Recognize when market conditions change after morning liquidity moves.'
      ],
      violatingTradeIds: givebackTrades.map(t => t.id)
    });
  }

  // BEHAVIOUR H: TRADING AFTER LOSING STREAK
  if (consecutiveLossBreaches.length > 0) {
    const streakTrades = consecutiveLossBreaches.map(c => c.tradeAfterStreak);
    const consequence = buildConsequence(streakTrades, 'Trading After Losing Streak');

    majorPatterns.push({
      id: 'losing_streak_breach',
      type: 'TRADING_AFTER_LOSING_STREAK',
      name: 'Trading Through Loss Streak Limits',
      severity: 'HIGH',
      confidence: streakTrades.length >= 2 ? 'HIGH' : 'MEDIUM',
      score: 60,
      signals: [
        `${streakTrades.length} trades executed while on a losing streak of ${rules.maxConsecutiveLosses} or more losses`
      ],
      evidence: [
        `Continued execution through maximum loss streak threshold on ${streakTrades.length} occasions`,
        `Win rate on trades taken during extended loss streaks: ${consequence.violatingRules.winRate}%`,
        `Average P&L on these streak continuation trades: ${fmtUSD(consequence.violatingRules.avgPnl)}`
      ],
      consequence,
      protocol: [
        'Walk away from the desk after hitting your maximum consecutive loss limit.',
        'Mandatory trading halt for the remainder of the session after 3 consecutive losses.',
        'Review chart recordings before taking another live trade.'
      ],
      violatingTradeIds: streakTrades.map(t => t.id)
    });
  }

  // ─── 5. OVERALL DISCIPLINE SCORE & CONSEQUENCE SUMMARY ─────────────────────────

  const violatingTrades = trades.filter(t => violatingTradeIdSet.has(t.id));
  const compliantTrades = trades.filter(t => !violatingTradeIdSet.has(t.id));

  const compMetrics = computeTradeMetrics(compliantTrades);
  const violMetrics = computeTradeMetrics(violatingTrades);

  const netDrag = Number((compMetrics.totalPnl - trades.reduce((s, t) => s + t.netProfit, 0)).toFixed(2));
  const disciplineScore = Math.max(0, Math.min(100, Math.round(((trades.length - violatingTrades.length) / trades.length) * 100)));
  const cleanTradesCount = compliantTrades.length;
  const violatingTradesCount = violatingTrades.length;
  const ruleAdherenceRate = trades.length > 0 ? Number(((cleanTradesCount / trades.length) * 100).toFixed(1)) : 100;
  const grossHabitLosses = Number((violMetrics.grossLoss || 0).toFixed(2));

  const overallSummary = violatingTrades.length > 0
    ? `Rule-following trades produced an average P&L of ${fmtUSD(compMetrics.avgPnl)} with a ${compMetrics.winRate}% win rate. In contrast, trades taken during rule breaches produced ${fmtUSD(violMetrics.avgPnl)} with a ${violMetrics.winRate}% win rate, creating a cumulative drag of ${fmtUSD(netDrag)} on your account.`
    : 'All historical trades adhered to your defined trading rules. Flawless discipline observed.';

  return {
    state: 3,
    totalTrades: trades.length,
    totalDays,
    overallDisciplineScore: disciplineScore,
    cleanTradesCount,
    violatingTradesCount,
    ruleAdherenceRate,
    grossHabitLosses,
    activeRulesCount: activeRulesList.length,
    violationsCount: allViolations.filter(v => v.status === 'VIOLATION').length,
    majorPatterns,
    consequenceComparison: {
      ruleFollowing: compMetrics,
      ruleViolating: violMetrics,
      netDrag,
      summary: overallSummary
    },
    traderProfile: generateTraderProfile(trades),
    actionableProtocols: majorPatterns.map(p => ({
      title: `Protocol: ${p.name}`,
      steps: p.protocol
    })),
    tradeViolationsMap: (() => {
      const map: Record<string, string[]> = {};
      for (const v of allViolations) {
        if (v.status === 'VIOLATION' && v.tradeId) {
          if (!map[v.tradeId]) map[v.tradeId] = [];
          if (!map[v.tradeId].includes(v.ruleName)) {
            map[v.tradeId].push(v.ruleName);
          }
        }
      }
      return map;
    })()
  };
}

// ─── TRADER PROFILE GENERATOR ─────────────────────────────────────────────────

export function generateTraderProfile(trades: NormalizedTrade[]) {
  const holdingTimes = trades.filter(t => t.durationSeconds && t.durationSeconds > 0).map(t => t.durationSeconds as number);
  const avgHoldSec = holdingTimes.length > 0 ? holdingTimes.reduce((a, b) => a + b, 0) / holdingTimes.length : 1800;
  const avgHoldMin = Math.round(avgHoldSec / 60);

  // Dominant symbol
  const symCounts = new Map<string, number>();
  trades.forEach(t => symCounts.set(t.symbol, (symCounts.get(t.symbol) || 0) + 1));
  let dominantSym = 'Instruments';
  let maxCount = 0;
  for (const [sym, count] of symCounts.entries()) {
    if (count > maxCount) {
      maxCount = count;
      dominantSym = sym;
    }
  }

  let style = 'Day Trading';
  if (avgHoldMin <= 15) style = 'Ultra-Short Scalping';
  else if (avgHoldMin <= 60) style = 'Intraday Scalping';
  else if (avgHoldMin <= 240) style = 'Day Trading';
  else if (avgHoldMin <= 1440) style = 'Intraday / Swing';
  else style = 'Multi-Day Swing';

  // Hourly Performance
  const hourMap = new Map<number, { trades: number; wins: number; pnl: number }>();
  for (const t of trades) {
    const h = t.openTime.getHours();
    if (!hourMap.has(h)) hourMap.set(h, { trades: 0, wins: 0, pnl: 0 });
    const stat = hourMap.get(h)!;
    stat.trades++;
    if (t.netProfit > 0) stat.wins++;
    stat.pnl += t.netProfit;
  }

  let bestHour = -1;
  let bestPnl = -Infinity;
  let worstHour = -1;
  let worstPnl = Infinity;

  for (const [h, stat] of hourMap.entries()) {
    if (stat.trades >= 2) {
      if (stat.pnl > bestPnl) {
        bestPnl = stat.pnl;
        bestHour = h;
      }
      if (stat.pnl < worstPnl) {
        worstPnl = stat.pnl;
        worstHour = h;
      }
    }
  }

  const formatHourWindow = (h: number) => {
    if (h < 0) return 'No distinct session';
    const startStr = `${h % 12 === 0 ? 12 : h % 12}:00 ${h >= 12 ? 'PM' : 'AM'}`;
    const nextH = (h + 2) % 24;
    const endStr = `${nextH % 12 === 0 ? 12 : nextH % 12}:00 ${nextH >= 12 ? 'PM' : 'AM'}`;
    return `${startStr} – ${endStr}`;
  };

  const bestWindow = bestHour >= 0
    ? `${formatHourWindow(bestHour)} (${hourMap.get(bestHour) ? Math.round((hourMap.get(bestHour)!.wins / hourMap.get(bestHour)!.trades) * 100) : 0}% Win Rate)`
    : 'All Sessions Balanced';
  const worstWindow = worstHour >= 0
    ? `${formatHourWindow(worstHour)} (${hourMap.get(worstHour) ? Math.round((hourMap.get(worstHour)!.wins / hourMap.get(worstHour)!.trades) * 100) : 0}% Win Rate)`
    : 'None Detected';

  // Losing streak
  let currentStreak = 0;
  let maxLossStreak = 0;
  for (const t of trades) {
    if (t.netProfit < 0) {
      currentStreak++;
      if (currentStreak > maxLossStreak) maxLossStreak = currentStreak;
    } else if (t.netProfit > 0) {
      currentStreak = 0;
    }
  }

  return {
    tradingStyle: `${style} (${dominantSym})`,
    biggestStrength: 'Execution Flow Active',
    biggestWeakness: maxLossStreak >= 4 ? `Tilt Clustering (Max Loss Streak: ${maxLossStreak})` : 'Discretionary Trade Frequency',
    dangerZone: maxLossStreak >= 2 ? `After ${maxLossStreak} Consecutive Losses` : 'Controlled Risk Exposure',
    bestSessionWindow: bestWindow,
    worstSessionWindow: worstWindow,
    recommendedRule: 'Enforce strict 15-minute cooldown and maximum trades per day cap.'
  };
}

// ─── PRE-TRADE REAL-TIME EVALUATION ENGINE ─────────────────────────────────────

export function evaluatePreTrade(params: {
  proposedTrade: {
    symbol: string;
    direction: 'LONG' | 'SHORT';
    orderType: string;
    entryPrice: number;
    stopLoss: number | null;
    takeProfit: number | null;
    lotSize: number;
    riskPercentage: number | null;
    riskReward: number | null;
    openTime?: Date;
  };
  todayTrades: NormalizedTrade[];
  recentTrades: NormalizedTrade[];
  rules: UserRuleConfig;
  accountBalance?: number;
}): PreTradeAnalysisResult {
  const { proposedTrade, todayTrades, recentTrades, rules } = params;
  const accBalance = params.accountBalance || 2000;
  const now = proposedTrade.openTime || new Date();

  const ruleResults: RuleEvaluationResult[] = [];
  const whyReasons: string[] = [];
  const protocols: string[] = [];

  let isBlock = false;
  let hasCriticalFailure = false;
  let hasWarningFailure = false;

  // 1. Check Rule 1: maxTradesPerDay
  if (rules.maxTradesPerDay) {
    const currentToday = todayTrades.length;
    const proposedTotal = currentToday + 1;
    if (proposedTotal > rules.maxTradesPerDay) {
      hasCriticalFailure = true;
      whyReasons.push(`You have already executed ${currentToday} trades today. Placing this trade breaches your daily limit of ${rules.maxTradesPerDay}.`);
      ruleResults.push({
        ruleId: 'pre-max-trades-day',
        ruleName: 'Daily Trade Count',
        ruleType: 'max_trades_per_day',
        status: 'VIOLATION',
        expectedValue: `≤ ${rules.maxTradesPerDay} trades`,
        actualValue: `${proposedTotal} proposed`,
        violationAmount: proposedTotal - rules.maxTradesPerDay,
        timestamp: now,
        evidence: `Allowed: ${rules.maxTradesPerDay} | Current: ${currentToday} | Proposed: ${proposedTotal}`
      });
      protocols.push('Halt trading for the remainder of the day to eliminate overtrading fatigue.');
    } else {
      ruleResults.push({
        ruleId: 'pre-max-trades-day',
        ruleName: 'Daily Trade Count',
        ruleType: 'max_trades_per_day',
        status: 'PASS',
        expectedValue: `≤ ${rules.maxTradesPerDay} trades`,
        actualValue: `${proposedTotal} of ${rules.maxTradesPerDay}`,
        timestamp: now,
        evidence: `Within daily trade limit (${proposedTotal}/${rules.maxTradesPerDay}).`
      });
    }
  }

  // 2. Check Rule 2: maxTradesPerHour
  if (rules.maxTradesPerHour) {
    const oneHourAgo = now.getTime() - 60 * 60 * 1000;
    const tradesInPastHour = recentTrades.filter(t => t.openTime.getTime() >= oneHourAgo).length;
    if (tradesInPastHour >= rules.maxTradesPerHour) {
      hasWarningFailure = true;
      whyReasons.push(`You have placed ${tradesInPastHour} trades in the last hour. Limit is ${rules.maxTradesPerHour} trades/hr.`);
      ruleResults.push({
        ruleId: 'pre-max-trades-hour',
        ruleName: 'Hourly Trade Frequency',
        ruleType: 'max_trades_per_hour',
        status: 'VIOLATION',
        expectedValue: `≤ ${rules.maxTradesPerHour}/hr`,
        actualValue: `${tradesInPastHour + 1}/hr`,
        timestamp: now,
        evidence: `${tradesInPastHour} trades executed in past 60 minutes.`
      });
      protocols.push('Wait for the current hourly candle to close before considering another entry.');
    } else {
      ruleResults.push({
        ruleId: 'pre-max-trades-hour',
        ruleName: 'Hourly Trade Frequency',
        ruleType: 'max_trades_per_hour',
        status: 'PASS',
        expectedValue: `≤ ${rules.maxTradesPerHour}/hr`,
        actualValue: `${tradesInPastHour}/hr`,
        timestamp: now,
        evidence: 'Within hourly execution frequency bounds.'
      });
    }
  }

  // 3. Check Rule 3: maxTradesPer30Min
  if (rules.maxTradesPer30Min) {
    const thirtyMinAgo = now.getTime() - 30 * 60 * 1000;
    const tradesIn30Min = recentTrades.filter(t => t.openTime.getTime() >= thirtyMinAgo).length;
    if (tradesIn30Min >= rules.maxTradesPer30Min) {
      hasWarningFailure = true;
      whyReasons.push(`${tradesIn30Min} entries inside a 30-minute window matches rapid-fire impulsive execution.`);
      ruleResults.push({
        ruleId: 'pre-max-trades-30min',
        ruleName: 'Rolling 30-Minute Frequency',
        ruleType: 'max_trades_per_30min',
        status: 'VIOLATION',
        expectedValue: `≤ ${rules.maxTradesPer30Min}/30m`,
        actualValue: `${tradesIn30Min + 1}/30m`,
        timestamp: now,
        evidence: `${tradesIn30Min} rapid entries in last 30 minutes.`
      });
    } else {
      ruleResults.push({
        ruleId: 'pre-max-trades-30min',
        ruleName: 'Rolling 30-Minute Frequency',
        ruleType: 'max_trades_per_30min',
        status: 'PASS',
        expectedValue: `≤ ${rules.maxTradesPer30Min}/30m`,
        actualValue: `${tradesIn30Min}/30m`,
        timestamp: now,
        evidence: 'No 30-minute clustering detected.'
      });
    }
  }

  // 4. Check Rule 4: maxRiskPerTrade
  if (rules.maxRiskPerTrade) {
    if (proposedTrade.riskPercentage !== null && proposedTrade.riskPercentage > rules.maxRiskPerTrade) {
      hasCriticalFailure = true;
      whyReasons.push(`Proposed risk of ${proposedTrade.riskPercentage.toFixed(2)}% exceeds your personal limit of ${rules.maxRiskPerTrade}%.`);
      ruleResults.push({
        ruleId: 'pre-max-risk',
        ruleName: 'Maximum Risk Per Trade',
        ruleType: 'max_risk',
        status: 'VIOLATION',
        expectedValue: `≤ ${rules.maxRiskPerTrade}%`,
        actualValue: `${proposedTrade.riskPercentage.toFixed(2)}%`,
        timestamp: now,
        evidence: `Risk of ${proposedTrade.riskPercentage.toFixed(2)}% exceeds ${rules.maxRiskPerTrade}% limit.`
      });
      protocols.push(`Reduce position size to keep single-trade risk below ${rules.maxRiskPerTrade}%.`);
    } else if (proposedTrade.riskPercentage === null && !proposedTrade.stopLoss) {
      hasCriticalFailure = true;
      whyReasons.push('No protective stop-loss has been registered. Risk percentage cannot be confirmed.');
      ruleResults.push({
        ruleId: 'pre-max-risk',
        ruleName: 'Maximum Risk Per Trade',
        ruleType: 'max_risk',
        status: 'INSUFFICIENT_DATA',
        expectedValue: `≤ ${rules.maxRiskPerTrade}% with hard SL`,
        actualValue: 'No SL defined',
        timestamp: now,
        evidence: 'Stop Loss missing.'
      });
      protocols.push('Place a mandatory protective stop-loss before pulling the trigger.');
    } else {
      ruleResults.push({
        ruleId: 'pre-max-risk',
        ruleName: 'Maximum Risk Per Trade',
        ruleType: 'max_risk',
        status: 'PASS',
        expectedValue: `≤ ${rules.maxRiskPerTrade}%`,
        actualValue: `${proposedTrade.riskPercentage ? proposedTrade.riskPercentage.toFixed(2) : '1.0'}%`,
        timestamp: now,
        evidence: 'Risk conforms to maximum capital preservation cap.'
      });
    }
  }

  // 5. Check Rule 5: maxDailyLoss
  if (rules.maxDailyLoss) {
    const todayPnl = todayTrades.reduce((s, t) => s + t.netProfit, 0);
    const maxLossDollars = rules.maxDailyLoss < 10 ? (rules.maxDailyLoss / 100) * accBalance : rules.maxDailyLoss;

    if (todayPnl <= -maxLossDollars) {
      hasCriticalFailure = true;
      if (rules.autoBlockEnabled) isBlock = true;
      whyReasons.push(`Cumulative daily loss has reached ${fmtUSD(todayPnl)}, breaching your daily threshold of -${fmtUSD(maxLossDollars)}.`);
      ruleResults.push({
        ruleId: 'pre-daily-loss',
        ruleName: 'Daily Loss Circuit Breaker',
        ruleType: 'max_daily_loss',
        status: 'VIOLATION',
        expectedValue: `Stop at -${fmtUSD(maxLossDollars)}`,
        actualValue: `${fmtUSD(todayPnl)} today`,
        timestamp: now,
        evidence: `Daily drawdown limit breached.`
      });
      protocols.push('Power down the terminal. Trading after daily loss cap leads to deep drawdown expansion.');
    } else {
      ruleResults.push({
        ruleId: 'pre-daily-loss',
        ruleName: 'Daily Loss Circuit Breaker',
        ruleType: 'max_daily_loss',
        status: 'PASS',
        expectedValue: `Cap: -${fmtUSD(maxLossDollars)}`,
        actualValue: `${fmtUSD(todayPnl)} today`,
        timestamp: now,
        evidence: 'Daily drawdown within authorized loss allowance.'
      });
    }
  }

  // 6. Check Sequence Rules (Last Trade Loss, Cooldown, Lot Escalation, Consecutive Losses)
  const lastTrade = recentTrades.length > 0 ? recentTrades[recentTrades.length - 1] : null;

  if (lastTrade && lastTrade.netProfit < 0) {
    const lastCloseTime = lastTrade.closeTime || lastTrade.openTime;
    const elapsedMinutes = Math.max(0, Math.round((now.getTime() - lastCloseTime.getTime()) / (60 * 1000)));

    // Rule 7: cooldownAfterLoss
    if (rules.cooldownAfterLoss && elapsedMinutes < rules.cooldownAfterLoss) {
      hasCriticalFailure = true;
      whyReasons.push(`Your last trade was a loss. You are attempting re-entry only ${elapsedMinutes} minutes later (required cooldown: ${rules.cooldownAfterLoss} min).`);
      ruleResults.push({
        ruleId: 'pre-cooldown',
        ruleName: 'Post-Loss Cooldown',
        ruleType: 'cooldown_after_loss',
        status: 'VIOLATION',
        expectedValue: `≥ ${rules.cooldownAfterLoss} min`,
        actualValue: `${elapsedMinutes} min elapsed`,
        violationAmount: rules.cooldownAfterLoss - elapsedMinutes,
        timestamp: now,
        evidence: `Required: ${rules.cooldownAfterLoss} min | Actual: ${elapsedMinutes} min`
      });
      protocols.push(`Step away from the screen for at least ${rules.cooldownAfterLoss - elapsedMinutes} more minutes before placing this trade.`);
    } else if (rules.cooldownAfterLoss) {
      ruleResults.push({
        ruleId: 'pre-cooldown',
        ruleName: 'Post-Loss Cooldown',
        ruleType: 'cooldown_after_loss',
        status: 'PASS',
        expectedValue: `≥ ${rules.cooldownAfterLoss} min`,
        actualValue: `${elapsedMinutes} min elapsed`,
        timestamp: now,
        evidence: 'Post-loss cooldown requirement satisfied.'
      });
    }

    // Rule 10: allowLotIncreaseAfterLoss
    if (rules.allowLotIncreaseAfterLoss === false && proposedTrade.lotSize > lastTrade.lotSize * 1.05) {
      hasCriticalFailure = true;
      const increasePct = Math.round(((proposedTrade.lotSize - lastTrade.lotSize) / lastTrade.lotSize) * 100);
      whyReasons.push(`Your position size has increased by ${increasePct}% (${proposedTrade.lotSize} lots vs ${lastTrade.lotSize} lots) following a loss.`);
      ruleResults.push({
        ruleId: 'pre-lot-increase',
        ruleName: 'Lot Sizing After Loss',
        ruleType: 'no_lot_increase_after_loss',
        status: 'VIOLATION',
        expectedValue: `≤ ${lastTrade.lotSize} lots`,
        actualValue: `${proposedTrade.lotSize} lots`,
        timestamp: now,
        evidence: `Previous: ${lastTrade.lotSize} | Proposed: ${proposedTrade.lotSize} (+${increasePct}%)`
      });
      protocols.push('Do not increase position size after taking a loss. Reset lot size to your base level.');
    }
  }

  // Check Rule 6: maxConsecutiveLosses
  if (rules.maxConsecutiveLosses) {
    let lossStreak = 0;
    for (let i = recentTrades.length - 1; i >= 0; i--) {
      if (recentTrades[i].netProfit < 0) lossStreak++;
      else break;
    }
    if (lossStreak >= rules.maxConsecutiveLosses) {
      hasCriticalFailure = true;
      whyReasons.push(`You are currently on a ${lossStreak}-trade losing streak. Your rule mandates taking a break after ${rules.maxConsecutiveLosses} consecutive losses.`);
      ruleResults.push({
        ruleId: 'pre-streak',
        ruleName: 'Consecutive Loss Circuit Breaker',
        ruleType: 'max_consecutive_losses',
        status: 'VIOLATION',
        expectedValue: `< ${rules.maxConsecutiveLosses} losses`,
        actualValue: `${lossStreak} loss streak`,
        timestamp: now,
        evidence: `Active losing streak: ${lossStreak}`
      });
      protocols.push('Take a mandatory 30-minute break. Review your trading journal before risking further capital.');
    } else {
      ruleResults.push({
        ruleId: 'pre-streak',
        ruleName: 'Consecutive Loss Circuit Breaker',
        ruleType: 'max_consecutive_losses',
        status: 'PASS',
        expectedValue: `< ${rules.maxConsecutiveLosses} losses`,
        actualValue: `${lossStreak} losses`,
        timestamp: now,
        evidence: 'Loss streak within acceptable limits.'
      });
    }
  }

  // 7. Check Rule 9: maxLotSize
  if (rules.maxLotSize) {
    if (proposedTrade.lotSize > rules.maxLotSize) {
      hasCriticalFailure = true;
      whyReasons.push(`Proposed lot size of ${proposedTrade.lotSize} exceeds your maximum authorized lot cap of ${rules.maxLotSize}.`);
      ruleResults.push({
        ruleId: 'pre-max-lot',
        ruleName: 'Maximum Position Lot Size',
        ruleType: 'max_lot_size',
        status: 'VIOLATION',
        expectedValue: `≤ ${rules.maxLotSize} lots`,
        actualValue: `${proposedTrade.lotSize} lots`,
        timestamp: now,
        evidence: `Proposed lot size exceeds ceiling.`
      });
      protocols.push(`Adjust lot size down to ${rules.maxLotSize} or below.`);
    } else {
      ruleResults.push({
        ruleId: 'pre-max-lot',
        ruleName: 'Maximum Position Lot Size',
        ruleType: 'max_lot_size',
        status: 'PASS',
        expectedValue: `≤ ${rules.maxLotSize} lots`,
        actualValue: `${proposedTrade.lotSize} lots`,
        timestamp: now,
        evidence: 'Position size conforms to single-order cap.'
      });
    }
  }

  // 8. Check Rule 11: minimumRiskReward
  if (rules.minimumRiskReward) {
    if (proposedTrade.riskReward !== null) {
      if (proposedTrade.riskReward < rules.minimumRiskReward) {
        hasWarningFailure = true;
        whyReasons.push(`Planned R:R of 1:${proposedTrade.riskReward.toFixed(2)} is below your minimum playbook requirement of 1:${rules.minimumRiskReward.toFixed(2)}.`);
        ruleResults.push({
          ruleId: 'pre-min-rr',
          ruleName: 'Minimum Risk/Reward Benchmark',
          ruleType: 'min_risk_reward',
          status: 'VIOLATION',
          expectedValue: `≥ 1:${rules.minimumRiskReward.toFixed(2)}`,
          actualValue: `1:${proposedTrade.riskReward.toFixed(2)}`,
          timestamp: now,
          evidence: `R:R below threshold.`
        });
        protocols.push('Adjust Take Profit target or tighten Stop Loss to achieve favorable asymmetry.');
      } else {
        ruleResults.push({
          ruleId: 'pre-min-rr',
          ruleName: 'Minimum Risk/Reward Benchmark',
          ruleType: 'min_risk_reward',
          status: 'PASS',
          expectedValue: `≥ 1:${rules.minimumRiskReward.toFixed(2)}`,
          actualValue: `1:${proposedTrade.riskReward.toFixed(2)}`,
          timestamp: now,
          evidence: 'Risk/Reward ratio is mathematically favorable.'
        });
      }
    }
  }

  // 9. Check Rule 12: allowedSessions
  if (rules.allowedSessions && rules.allowedSessions.length > 0) {
    const utcHour = now.getUTCHours();
    if (!isSessionAllowed(utcHour, rules.allowedSessions)) {
      const currentSession = getTradeSession(utcHour);
      hasWarningFailure = true;
      whyReasons.push(`Current time (${utcHour}:00 UTC - ${currentSession}) is outside your approved session windows (${rules.allowedSessions.join(', ')}).`);
      ruleResults.push({
        ruleId: 'pre-allowed-sessions',
        ruleName: 'Permitted Trading Sessions',
        ruleType: 'allowed_sessions',
        status: 'VIOLATION',
        expectedValue: rules.allowedSessions.join(', '),
        actualValue: currentSession,
        timestamp: now,
        evidence: `Session violation: ${currentSession}`
      });
      protocols.push('Wait for primary market open (London / New York) when volume and spreads are optimal.');
    } else {
      ruleResults.push({
        ruleId: 'pre-allowed-sessions',
        ruleName: 'Permitted Trading Sessions',
        ruleType: 'allowed_sessions',
        status: 'PASS',
        expectedValue: rules.allowedSessions.join(', '),
        actualValue: getTradeSession(utcHour),
        timestamp: now,
        evidence: 'Trading during approved liquid session window.'
      });
    }
  }

  // 10. Check Rule 13: allowedSymbols
  if (rules.allowedSymbols && rules.allowedSymbols.length > 0) {
    const symClean = proposedTrade.symbol.toUpperCase().replace('/', '');
    const isAllowed = rules.allowedSymbols.some(s => s.toUpperCase().replace('/', '') === symClean);
    if (!isAllowed) {
      hasWarningFailure = true;
      whyReasons.push(`${proposedTrade.symbol} is not on your approved playbook instrument list (${rules.allowedSymbols.join(', ')}).`);
      ruleResults.push({
        ruleId: 'pre-allowed-symbols',
        ruleName: 'Approved Instruments',
        ruleType: 'allowed_symbols',
        status: 'VIOLATION',
        expectedValue: rules.allowedSymbols.join(', '),
        actualValue: proposedTrade.symbol,
        timestamp: now,
        evidence: `Unapproved instrument: ${proposedTrade.symbol}`
      });
      protocols.push('Stick strictly to your core instruments where you have verified edge.');
    } else {
      ruleResults.push({
        ruleId: 'pre-allowed-symbols',
        ruleName: 'Approved Instruments',
        ruleType: 'allowed_symbols',
        status: 'PASS',
        expectedValue: rules.allowedSymbols.join(', '),
        actualValue: proposedTrade.symbol,
        timestamp: now,
        evidence: 'Symbol is on approved playbook watchlist.'
      });
    }
  }

  // ─── DETERMINE STATUS & BEHAVIOUR DETECTED ─────────────────────────────────

  let status: 'SAFE' | 'CAUTION' | 'HIGH RISK' | 'BLOCK' = 'SAFE';
  let behaviorDetected: string | null = null;
  let recommendation: 'proceed' | 'modify' | 'cancel' = 'proceed';

  if (isBlock) {
    status = 'BLOCK';
    recommendation = 'cancel';
  } else if (hasCriticalFailure) {
    status = 'HIGH RISK';
    recommendation = 'cancel';
  } else if (hasWarningFailure) {
    status = 'CAUTION';
    recommendation = 'modify';
  }

  // Label detected behaviour objectively
  if (whyReasons.some(r => r.includes('re-entry only') && r.includes('increased by'))) {
    behaviorDetected = 'Possible revenge-trading pattern detected';
  } else if (whyReasons.some(r => r.includes('breaches your daily limit') || r.includes('trades in the last hour'))) {
    behaviorDetected = 'Overtrading frequency breach detected';
  } else if (whyReasons.some(r => r.includes('exceeds your personal limit') || r.includes('maximum authorized lot'))) {
    behaviorDetected = 'Excessive risk taking detected';
  } else if (whyReasons.some(r => r.includes('losing streak'))) {
    behaviorDetected = 'Trading through losing streak limit';
  } else if (whyReasons.some(r => r.includes('outside your approved session') || r.includes('not on your approved playbook'))) {
    behaviorDetected = 'Strategy deviation detected';
  }

  // Default protocols if none
  if (protocols.length === 0) {
    protocols.push(
      'Verify that current price action aligns with your playbook setup criteria.',
      'Confirm position sizing and single-trade risk are within guidelines.',
      'Set your protective stop-loss immediately upon execution.'
    );
  }

  // Similar historical setups from recent history
  const similarTrades = recentTrades.filter(t => t.symbol === proposedTrade.symbol && t.direction === proposedTrade.direction);
  const simMetrics = computeTradeMetrics(similarTrades);
  const histConsequence = similarTrades.length > 0 ? {
    totalSimilar: similarTrades.length,
    winRate: simMetrics.winRate,
    avgPnl: simMetrics.avgPnl,
    summary: `In ${similarTrades.length} similar setups on ${proposedTrade.symbol}, your historical win rate was ${simMetrics.winRate}% with an average P&L of ${fmtUSD(simMetrics.avgPnl)}.`
  } : null;

  const verdict = status === 'SAFE'
    ? 'PLAYBOOK COMPLIANT: LOW RISK'
    : status === 'CAUTION'
    ? 'CAUTION ADVISED: PARAMETER ADJUSTMENT RECOMMENDED'
    : status === 'BLOCK'
    ? 'HARD CIRCUIT BREAKER: TRADING BLOCKED'
    : 'HIGH BEHAVIORAL RISK: INTERVENTION REQUIRED';

  const explanation = status === 'SAFE'
    ? 'All active risk controls and playbook constraints are verified. Setup satisfies capital preservation requirements.'
    : whyReasons.join(' ');

  return {
    status,
    ruleResults,
    behaviorDetected,
    why: whyReasons.length > 0 ? whyReasons : ['Parameters conform to all active trading rules.'],
    historicalConsequence: histConsequence,
    protocol: protocols,
    canProceed: status !== 'BLOCK',
    recommendation,
    verdict,
    explanation
  };
}

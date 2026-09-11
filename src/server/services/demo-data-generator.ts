export type DemoTrade = Omit<
  import('@prisma/client').Trade,
  'id' | 'accountId' | 'userId' | 'createdAt' | 'updatedAt'
>;

export function generateDemoAccount() {
  return {
    name: 'MetaTrader 5 Primary Account',
    type: 'live',
    broker: 'MetaTrader 5',
    balance: 2000,
    equity: 2000,
    currency: 'USD',
    isActive: true,
  };
}

export function generateDemoRules(): Omit<import('@prisma/client').TradingRule, 'id' | 'userId' | 'createdAt' | 'updatedAt'>[] {
  return [
    {
      category: 'risk',
      name: 'Max Risk Per Trade',
      description: 'Never risk more than 1% of account on a single trade',
      ruleType: 'max_risk',
      value: '1',
      unit: 'percentage',
      severity: 'critical',
      isActive: true,
    },
    {
      category: 'risk',
      name: 'Max Daily Loss',
      description: 'Stop trading for the day if 2% down',
      ruleType: 'max_daily_loss',
      value: '2',
      unit: 'percentage',
      severity: 'critical',
      isActive: true,
    },
    {
      category: 'entry',
      name: 'Max Trades Per Day',
      description: 'Maximum 3 trades allowed per day',
      ruleType: 'max_trades_per_day',
      value: '3',
      unit: 'count',
      severity: 'warning',
      isActive: true,
    },
    {
      category: 'entry',
      name: 'Min Risk/Reward',
      description: 'Require at least 1:2 R:R',
      ruleType: 'min_risk_reward',
      value: '2',
      unit: 'ratio',
      severity: 'warning',
      isActive: true,
    },
    {
      category: 'timing',
      name: 'Allowed Trading Hours',
      description: 'Only trade between 09:30 and 16:00',
      ruleType: 'allowed_hours',
      value: '["09:30", "16:00"]',
      unit: 'time',
      severity: 'warning',
      isActive: true,
    },
    {
      category: 'behavior',
      name: 'No Revenge Trading',
      description: 'Do not re-enter immediately after a loss',
      ruleType: 'custom_boolean',
      value: 'true',
      unit: null,
      severity: 'critical',
      isActive: true,
    },
    {
      category: 'behavior',
      name: 'No FOMO Entries',
      description: 'Do not chase extended moves',
      ruleType: 'custom_boolean',
      value: 'true',
      unit: null,
      severity: 'warning',
      isActive: true,
    },
    {
      category: 'risk',
      name: 'Immediate Stop-Loss',
      description: 'Stop-loss must be placed immediately',
      ruleType: 'custom_boolean',
      value: 'true',
      unit: null,
      severity: 'critical',
      isActive: true,
    },
    {
      category: 'risk',
      name: 'No Position Sizing Increase After Losses',
      description: 'Do not increase risk after losing trades',
      ruleType: 'custom_boolean',
      value: 'true',
      unit: null,
      severity: 'critical',
      isActive: true,
    },
    {
      category: 'entry',
      name: 'Confirmed Breakouts Only',
      description: 'Trade only confirmed breakouts',
      ruleType: 'custom_boolean',
      value: 'true',
      unit: null,
      severity: 'info',
      isActive: true,
    },
  ];
}

const SYMBOLS = [
  { symbol: 'BTC/USDT', class: 'crypto', minPrice: 90000, maxPrice: 108000 },
  { symbol: 'ETH/USDT', class: 'crypto', minPrice: 3200, maxPrice: 4200 },
  { symbol: 'AAPL', class: 'stocks', minPrice: 200, maxPrice: 240 },
  { symbol: 'TSLA', class: 'stocks', minPrice: 280, maxPrice: 360 },
  { symbol: 'SPY', class: 'stocks', minPrice: 540, maxPrice: 600 },
  { symbol: 'EUR/USD', class: 'forex', minPrice: 1.06, maxPrice: 1.12 },
];

export interface GeneratedTradeItem extends DemoTrade {
  behaviorType?: string;
}

export function generateDemoTrades(): GeneratedTradeItem[] {
  const trades: GeneratedTradeItem[] = [];
  const now = new Date('2026-09-07T12:00:00Z');
  const totalDays = 180;
  const startDate = new Date(now.getTime() - totalDays * 24 * 60 * 60 * 1000);

  // Build the 342 calibrated trade specifications
  interface TradeSpec {
    type: 'fomo' | 'revenge' | 'risk_expansion' | 'early_exit' | 'stop_loss_violation' | 'normal';
    tags: string[];
    isWin: boolean;
    riskPct: number;
    pnl: number;
    strategy: string;
    dayOffset: number; // roughly which day in the 180-day span
    isClusterRevenge?: boolean;
  }

  const specs: TradeSpec[] = [];

  // 1. FOMO: 28 trades (7 wins, 21 losses, net -$845.00)
  for (let i = 0; i < 28; i++) {
    const isWin = i < 7;
    specs.push({
      type: 'fomo',
      tags: ['FOMO'],
      isWin,
      riskPct: 0.95,
      pnl: isWin ? 35.00 : -51.90476,
      strategy: 'Momentum Breakout',
      dayOffset: Math.floor((i / 28) * 175) + 2,
    });
  }

  // 2. Revenge: 19 trades (4 wins, 15 losses, net -$1,230.50)
  for (let i = 0; i < 19; i++) {
    const isWin = i < 4;
    specs.push({
      type: 'revenge',
      tags: ['Revenge'],
      isWin,
      riskPct: 1.25,
      pnl: isWin ? 45.00 : -94.03333,
      strategy: 'Discretionary',
      dayOffset: Math.floor((i / 19) * 170) + 5,
      isClusterRevenge: true,
    });
  }

  // 3. Risk Expansion: 15 trades (5 wins, 10 losses, net -$1,420.00)
  for (let i = 0; i < 15; i++) {
    const isWin = i < 5;
    specs.push({
      type: 'risk_expansion',
      tags: ['RiskExpansion'],
      isWin,
      riskPct: 2.1,
      pnl: isWin ? 80.00 : -182.00,
      strategy: 'Trend Following',
      dayOffset: Math.floor((i / 15) * 172) + 3,
    });
  }

  // 4. Early Exit: 8 trades (8 wins, net +$380.00)
  for (let i = 0; i < 8; i++) {
    specs.push({
      type: 'early_exit',
      tags: ['EarlyExit'],
      isWin: true,
      riskPct: 0.8,
      pnl: 47.50,
      strategy: 'Momentum Breakout',
      dayOffset: Math.floor((i / 8) * 165) + 6,
    });
  }

  // 5. SL Violation: 22 trades (0 wins, 22 losses, net -$2,650.00)
  for (let i = 0; i < 22; i++) {
    specs.push({
      type: 'stop_loss_violation',
      tags: ['SLViolation'],
      isWin: false,
      riskPct: 1.0,
      pnl: -120.45455,
      strategy: 'Mean Reversion',
      dayOffset: Math.floor((i / 22) * 174) + 1,
    });
  }

  // 6. Normal Disciplined: 250 trades (141 wins, 109 losses, net +$4,185.50)
  for (let i = 0; i < 250; i++) {
    const isWin = i < 141;
    specs.push({
      type: 'normal',
      tags: [],
      isWin,
      riskPct: 0.75 + (i % 5) * 0.05,
      pnl: isWin ? 68.00 : -49.56422,
      strategy: i % 3 === 0 ? 'Momentum Breakout' : i % 3 === 1 ? 'Trend Following' : 'Mean Reversion',
      dayOffset: Math.floor((i / 250) * 178) + 1,
    });
  }

  // Sort specs by dayOffset to create chronological timeline
  specs.sort((a, b) => a.dayOffset - b.dayOffset);

  // Generate trade details along the timeline
  let runningDate = new Date(startDate);

  for (let i = 0; i < specs.length; i++) {
    const spec = specs[i];
    const symIdx = (i * 7) % SYMBOLS.length;
    const symbolInfo = SYMBOLS[symIdx];
    const priceSpread = symbolInfo.maxPrice - symbolInfo.minPrice;
    const basePrice = symbolInfo.minPrice + ((i * 13) % 100) / 100 * priceSpread;
    const direction = (i % 2 === 0) ? 'long' : 'short';

    // Calculate timestamp
    const tradeDate = new Date(startDate.getTime() + spec.dayOffset * 24 * 60 * 60 * 1000);
    // Skip weekends: if Saturday -> Friday, if Sunday -> Monday
    if (tradeDate.getDay() === 0) tradeDate.setDate(tradeDate.getDate() + 1);
    if (tradeDate.getDay() === 6) tradeDate.setDate(tradeDate.getDate() - 1);

    // Trading hours between 09:30 and 15:45
    const hour = 9 + ((i * 2) % 6);
    const minute = 30 + ((i * 7) % 25);
    tradeDate.setHours(hour, minute, (i * 11) % 60);

    // Duration: 15 mins to 2 hours
    const duration = 900 + ((i * 137) % 6300); // 15m to ~2h
    const exitTime = new Date(tradeDate.getTime() + duration * 1000);

    const positionSize = (10420 * spec.riskPct * (spec.type === 'risk_expansion' ? 2 : 1)) / (spec.riskPct / 100);
    const qty = Number((positionSize / basePrice).toFixed(symbolInfo.class === 'crypto' ? 4 : 2));

    const rr = spec.type === 'early_exit' ? 1.1 : 2.0;
    const stopLoss = direction === 'long'
      ? Number((basePrice * (1 - spec.riskPct / 100)).toFixed(2))
      : Number((basePrice * (1 + spec.riskPct / 100)).toFixed(2));
    const takeProfit = direction === 'long'
      ? Number((basePrice * (1 + (spec.riskPct * rr) / 100)).toFixed(2))
      : Number((basePrice * (1 - (spec.riskPct * rr) / 100)).toFixed(2));

    const pnl = Number(spec.pnl.toFixed(2));
    const pnlPercentage = Number(((pnl / positionSize) * 100).toFixed(2));
    const fees = Number((0.50 + ((i * 3) % 35) / 10).toFixed(2));

    const exitPrice = direction === 'long'
      ? Number((basePrice + (pnl / (qty || 1))).toFixed(2))
      : Number((basePrice - (pnl / (qty || 1))).toFixed(2));

    trades.push({
      symbol: symbolInfo.symbol,
      assetClass: symbolInfo.class,
      direction,
      entryPrice: Number(basePrice.toFixed(2)),
      exitPrice: Number(exitPrice.toFixed(2)),
      quantity: qty,
      positionSize: Number(positionSize.toFixed(2)),
      stopLoss,
      takeProfit,
      entryTime: tradeDate,
      exitTime,
      pnl,
      pnlPercentage,
      fees,
      duration,
      strategy: spec.strategy,
      timeframe: '15m',
      riskPercentage: spec.riskPct,
      riskReward: rr,
      orderType: 'market',
      status: 'closed',
      notes: spec.tags.join(','),
      tags: JSON.stringify(spec.tags),
      isDemo: true,
      behaviorType: spec.type !== 'normal' ? spec.type : undefined,
    });
  }

  // Sort strictly by entryTime
  trades.sort((a, b) => a.entryTime.getTime() - b.entryTime.getTime());

  // Fine-tune the last trade's PnL slightly to ensure exact -$1,580.00 sum
  const currentSum = trades.reduce((acc, t) => acc + (t.pnl ?? 0), 0);
  const diff = Number((-1580.00 - currentSum).toFixed(2));
  const lastTrade = trades[trades.length - 1];
  if (diff !== 0 && lastTrade && lastTrade.pnl !== null && lastTrade.pnl !== undefined) {
    lastTrade.pnl = Number((lastTrade.pnl + diff).toFixed(2));
  }

  return trades;
}

export function generateDemoBehaviorEvents(
  savedTrades: Array<{ id: string; entryTime: Date; symbol: string; notes?: string | null; pnl: number | null; riskPercentage: number | null }>,
  userId: string
) {
  const events = [];

  for (const trade of savedTrades) {
    const notes = trade.notes || '';

    if (notes.includes('FOMO')) {
      events.push({
        userId,
        tradeId: trade.id,
        eventType: 'fomo',
        confidence: 0.88,
        severity: 'medium',
        signals: JSON.stringify([
          'Entered on extended 15m candle (+2.4% run)',
          'Position size 35% above trader 30-day average',
          'Setup chased without pullback to support'
        ]),
        evidence: JSON.stringify({ symbol: trade.symbol, pnl: trade.pnl }),
        consequences: JSON.stringify({ historicalWinRate: '25.0%', avgLoss: '-$51.90' }),
        detectedAt: trade.entryTime,
      });
    } else if (notes.includes('Revenge')) {
      events.push({
        userId,
        tradeId: trade.id,
        eventType: 'revenge_trading',
        confidence: 0.94,
        severity: 'critical',
        signals: JSON.stringify([
          'Entered within 11 minutes of previous stop-out',
          'Increased lot size by 50% to recover loss',
          'Violated emotional cooldown rule'
        ]),
        evidence: JSON.stringify({ symbol: trade.symbol, pnl: trade.pnl }),
        consequences: JSON.stringify({ historicalWinRate: '21.0%', avgLoss: '-$94.00' }),
        detectedAt: trade.entryTime,
      });
    } else if (notes.includes('RiskExpansion')) {
      events.push({
        userId,
        tradeId: trade.id,
        eventType: 'risk_expansion',
        confidence: 0.90,
        severity: 'high',
        signals: JSON.stringify([
          `Risk level ${trade.riskPercentage}% exceeds 1.0% maximum mandate`,
          'Doubled normal capital commitment after losing streak'
        ]),
        evidence: JSON.stringify({ riskPercentage: trade.riskPercentage, pnl: trade.pnl }),
        consequences: JSON.stringify({ avgLoss: '-$182.00', maxDrawdownImpact: 'High' }),
        detectedAt: trade.entryTime,
      });
    } else if (notes.includes('EarlyExit')) {
      events.push({
        userId,
        tradeId: trade.id,
        eventType: 'early_exit',
        confidence: 0.78,
        severity: 'low',
        signals: JSON.stringify([
          'Closed position at 38% of planned take-profit level',
          'Premature exit cutting upside potential'
        ]),
        evidence: JSON.stringify({ symbol: trade.symbol, pnl: trade.pnl }),
        consequences: JSON.stringify({ missedProfitPotential: '+$85.00 avg' }),
        detectedAt: trade.entryTime,
      });
    } else if (notes.includes('SLViolation')) {
      events.push({
        userId,
        tradeId: trade.id,
        eventType: 'stop_loss_violation',
        confidence: 0.96,
        severity: 'critical',
        signals: JSON.stringify([
          'Stop-loss widened past initial invalidation level',
          'Trade closed beyond defined risk parameters'
        ]),
        evidence: JSON.stringify({ symbol: trade.symbol, pnl: trade.pnl }),
        consequences: JSON.stringify({ avgLoss: '-$120.45' }),
        detectedAt: trade.entryTime,
      });
    }
  }

  return events;
}

export function generateDemoRuleViolations(
  savedTrades: Array<{ id: string; entryTime: Date; notes?: string | null; riskPercentage: number | null }>,
  rules: Array<{ id: string; ruleType: string }>,
  userId: string
) {
  const violations = [];
  const ruleMap = new Map(rules.map(r => [r.ruleType, r.id]));

  for (const trade of savedTrades) {
    const notes = trade.notes || '';

    if (notes.includes('FOMO') && ruleMap.has('custom_boolean')) {
      const ruleId = rules.find(r => r.ruleType === 'custom_boolean' && (r as any).name?.includes('FOMO'))?.id || rules[0]?.id;
      if (ruleId) {
        violations.push({
          userId,
          tradeId: trade.id,
          ruleId,
          violationType: 'pre_trade',
          actualValue: 'Chased entry',
          ruleValue: 'Wait for pullback',
          description: 'FOMO breakout trade entered without structure confirmation.',
          acknowledged: true,
          createdAt: trade.entryTime,
        });
      }
    } else if (notes.includes('Revenge')) {
      const ruleId = rules.find(r => (r as any).name?.includes('Revenge'))?.id || rules[0]?.id;
      if (ruleId) {
        violations.push({
          userId,
          tradeId: trade.id,
          ruleId,
          violationType: 'pre_trade',
          actualValue: 'Entry < 15m after loss',
          ruleValue: 'Cooldown mandatory',
          description: 'Revenge trade entered during emotional tilt cooldown.',
          acknowledged: true,
          createdAt: trade.entryTime,
        });
      }
    } else if (notes.includes('RiskExpansion')) {
      const ruleId = rules.find(r => r.ruleType === 'max_risk')?.id || rules[0]?.id;
      if (ruleId) {
        violations.push({
          userId,
          tradeId: trade.id,
          ruleId,
          violationType: 'pre_trade',
          actualValue: `${trade.riskPercentage}%`,
          ruleValue: '1.0%',
          description: `Exceeded max 1.0% risk cap (${trade.riskPercentage}% risked).`,
          acknowledged: true,
          createdAt: trade.entryTime,
        });
      }
    } else if (notes.includes('SLViolation')) {
      const ruleId = rules.find(r => (r as any).name?.includes('Stop-Loss'))?.id || rules[0]?.id;
      if (ruleId) {
        violations.push({
          userId,
          tradeId: trade.id,
          ruleId,
          violationType: 'during_trade',
          actualValue: 'SL moved',
          ruleValue: 'Immediate hard SL',
          description: 'Stop-loss adjusted or violated during trade.',
          acknowledged: false,
          createdAt: trade.entryTime,
        });
      }
    }
  }

  return violations;
}

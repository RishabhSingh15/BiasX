import { Trade } from './quantitative-engine';

export interface BehaviorDetection {
  detected: boolean;
  pattern: string; // 'fomo' | 'revenge_trading' | 'overtrading' | 'risk_expansion' | 'stop_loss_violation' | 'early_exit' | 'strategy_deviation'
  confidence: number; // 0-1
  severity: 'low' | 'medium' | 'high' | 'critical';
  signals: string[]; // human-readable signal descriptions
  evidence: Record<string, any>; // supporting data
  historicalConsequences?: {
    occurrences: number;
    winRate: number;
    avgPnl: number;
    totalImpact: number;
  };
}

export function detectFOMO(proposedTrade: Trade, allTrades: Trade[], recentPriceMove: number = 0): BehaviorDetection {
  const signals: string[] = [];
  let confidence = 0;
  
  if (Math.abs(recentPriceMove) > 1.5) {
    signals.push(`Entry after significant price move (${recentPriceMove}%)`);
    confidence += 0.4;
  }
  
  const symbolTrades = allTrades.filter(t => t.symbol === proposedTrade.symbol);
  if (symbolTrades.length > 0) {
    const avgSize = symbolTrades.reduce((sum, t) => sum + t.positionSize, 0) / symbolTrades.length;
    if (proposedTrade.positionSize > avgSize * 1.25) {
      signals.push(`Position size ${Math.round((proposedTrade.positionSize / avgSize - 1) * 100)}% above average for ${proposedTrade.symbol}`);
      confidence += 0.3;
    }
  }

  const sortedTrades = [...allTrades].sort((a, b) => b.entryTime.getTime() - a.entryTime.getTime());
  if (sortedTrades.length > 0) {
    const lastTrade = sortedTrades[0];
    const minsSinceLast = (proposedTrade.entryTime.getTime() - lastTrade.entryTime.getTime()) / (1000 * 60);
    if (minsSinceLast < 5 && Math.abs(recentPriceMove) > 0.5) {
      signals.push(`Very short time since last trade (${Math.round(minsSinceLast)}m) during market movement`);
      confidence += 0.3;
    }
  }

  const detected = confidence >= 0.5;
  const severity = confidence > 0.8 ? 'high' : confidence > 0.6 ? 'medium' : 'low';

  return {
    detected,
    pattern: 'fomo',
    confidence: Math.min(1, confidence),
    severity,
    signals,
    evidence: { recentPriceMove, positionSize: proposedTrade.positionSize }
  };
}

export function detectRevengeTrading(proposedTrade: Trade, allTrades: Trade[]): BehaviorDetection {
  const signals: string[] = [];
  let confidence = 0;

  const closedTrades = [...allTrades].filter(t => t.status === 'CLOSED' && t.exitTime).sort((a, b) => b.exitTime!.getTime() - a.exitTime!.getTime());
  
  if (closedTrades.length > 0) {
    const lastTrade = closedTrades[0];
    if (lastTrade.pnl !== null && lastTrade.pnl < 0) {
      signals.push('Previous trade was a loss');
      confidence += 0.3;

      const minsSinceLoss = (proposedTrade.entryTime.getTime() - lastTrade.exitTime!.getTime()) / (1000 * 60);
      if (minsSinceLoss < 15) {
        signals.push(`Time gap since loss is short (${Math.round(minsSinceLoss)}m)`);
        confidence += 0.4;
      }

      if (proposedTrade.positionSize > lastTrade.positionSize) {
        signals.push('Position size increased after loss');
        confidence += 0.3;
      }

      if (proposedTrade.symbol === lastTrade.symbol) {
        signals.push('Re-entering same symbol after loss');
        confidence += 0.2;
      }
    }
  }

  const detected = confidence >= 0.5;
  const severity = confidence > 0.8 ? 'critical' : confidence > 0.5 ? 'high' : 'medium';

  return {
    detected,
    pattern: 'revenge_trading',
    confidence: Math.min(1, confidence),
    severity,
    signals,
    evidence: { previousTradeResult: closedTrades[0]?.pnl }
  };
}

export function detectOvertrading(proposedTrade: Trade, allTrades: Trade[], dailyTradeLimit: number = 3): BehaviorDetection {
  const signals: string[] = [];
  let confidence = 0;

  const todayStr = proposedTrade.entryTime.toISOString().split('T')[0];
  const tradesToday = allTrades.filter(t => t.entryTime.toISOString().split('T')[0] === todayStr);

  if (tradesToday.length >= dailyTradeLimit) {
    signals.push(`Trades today (${tradesToday.length + 1}) exceed daily limit (${dailyTradeLimit})`);
    confidence += 0.6;
  }

  const recentTrades = [...allTrades].sort((a, b) => b.entryTime.getTime() - a.entryTime.getTime()).slice(0, 3);
  if (recentTrades.length >= 2) {
    const t1 = proposedTrade.entryTime.getTime();
    const t2 = recentTrades[0].entryTime.getTime();
    const t3 = recentTrades[1].entryTime.getTime();
    if ((t1 - t3) < 1000 * 60 * 30) {
      signals.push('Multiple trades in rapid succession (< 30m)');
      confidence += 0.4;
    }
  }

  const detected = confidence >= 0.5;

  return {
    detected,
    pattern: 'overtrading',
    confidence: Math.min(1, confidence),
    severity: confidence > 0.8 ? 'high' : 'medium',
    signals,
    evidence: { tradesToday: tradesToday.length, limit: dailyTradeLimit }
  };
}

export function detectRiskExpansion(proposedTrade: Trade, allTrades: Trade[], maxRisk: number = 1.0): BehaviorDetection {
  const signals: string[] = [];
  let confidence = 0;

  if (proposedTrade.riskPercentage !== null && proposedTrade.riskPercentage > maxRisk) {
    signals.push(`Risk (${proposedTrade.riskPercentage}%) above personal max (${maxRisk}%)`);
    confidence += 0.5;
  }

  const closedLosses = [...allTrades].filter(t => t.status === 'CLOSED' && t.pnl !== null && t.pnl < 0).sort((a, b) => b.exitTime!.getTime() - a.exitTime!.getTime());
  
  if (closedLosses.length >= 2) {
    const avgSize = allTrades.reduce((sum, t) => sum + t.positionSize, 0) / (allTrades.length || 1);
    if (proposedTrade.positionSize > avgSize * 1.5) {
      signals.push('Position size much larger than average after recent losses');
      confidence += 0.4;
    }
  }

  const detected = confidence >= 0.5;

  return {
    detected,
    pattern: 'risk_expansion',
    confidence: Math.min(1, confidence),
    severity: confidence >= 0.8 ? 'critical' : 'high',
    signals,
    evidence: { proposedRisk: proposedTrade.riskPercentage, maxRisk }
  };
}

export function detectStopLossViolation(trade: Trade, allTrades: Trade[]): BehaviorDetection {
  const signals: string[] = [];
  let confidence = 0;

  if (trade.stopLoss === null) {
    signals.push('No stop-loss set');
    confidence += 0.8;
  } else if (trade.entryPrice > 0) {
    const slDist = Math.abs(trade.entryPrice - trade.stopLoss) / trade.entryPrice;
    if (slDist > 0.1) {
      signals.push('Stop-loss is excessively far from entry (>10%)');
      confidence += 0.4;
    }
  }

  return {
    detected: confidence >= 0.5,
    pattern: 'stop_loss_violation',
    confidence: Math.min(1, confidence),
    severity: confidence >= 0.8 ? 'high' : 'medium',
    signals,
    evidence: { hasStopLoss: trade.stopLoss !== null }
  };
}

export function detectEarlyExit(trade: Trade, allTrades: Trade[]): BehaviorDetection {
  const signals: string[] = [];
  let confidence = 0;

  if (trade.status === 'CLOSED' && trade.pnl !== null && trade.pnl > 0 && trade.takeProfit && trade.exitPrice) {
    const totalPotential = Math.abs(trade.takeProfit - trade.entryPrice);
    const captured = Math.abs(trade.exitPrice - trade.entryPrice);
    
    if (totalPotential > 0 && captured / totalPotential < 0.5) {
      signals.push(`Exited well before take-profit target (${Math.round(captured/totalPotential * 100)}% captured)`);
      confidence += 0.7;
    }
  }

  return {
    detected: confidence >= 0.5,
    pattern: 'early_exit',
    confidence: Math.min(1, confidence),
    severity: 'medium',
    signals,
    evidence: {}
  };
}

export function detectStrategyDeviation(proposedTrade: Trade, allTrades: Trade[], rules?: any): BehaviorDetection {
  const signals: string[] = [];
  let confidence = 0;

  if (!proposedTrade.strategy || proposedTrade.strategy.trim() === '') {
    signals.push('Trade does not match any defined strategy');
    confidence += 0.6;
  } else {
    const symbolTrades = allTrades.filter(t => t.symbol === proposedTrade.symbol);
    if (symbolTrades.length > 5) {
      const usualTimeframe = symbolTrades[symbolTrades.length - 1].timeframe;
      if (proposedTrade.timeframe && usualTimeframe && proposedTrade.timeframe !== usualTimeframe) {
        signals.push(`Timeframe (${proposedTrade.timeframe}) deviates from usual (${usualTimeframe}) for this symbol`);
        confidence += 0.4;
      }
    }
  }

  return {
    detected: confidence >= 0.5,
    pattern: 'strategy_deviation',
    confidence: Math.min(1, confidence),
    severity: 'medium',
    signals,
    evidence: { strategy: proposedTrade.strategy }
  };
}

export function analyzeBehavior(proposedTrade: Trade, allTrades: Trade[], rules?: any, recentPriceMove?: number): BehaviorDetection[] {
  const detections: BehaviorDetection[] = [];

  detections.push(detectFOMO(proposedTrade, allTrades, recentPriceMove));
  detections.push(detectRevengeTrading(proposedTrade, allTrades));
  detections.push(detectOvertrading(proposedTrade, allTrades, rules?.dailyTradeLimit));
  detections.push(detectRiskExpansion(proposedTrade, allTrades, rules?.maxRisk));
  detections.push(detectStopLossViolation(proposedTrade, allTrades));
  detections.push(detectEarlyExit(proposedTrade, allTrades));
  detections.push(detectStrategyDeviation(proposedTrade, allTrades, rules));

  return detections.filter(d => d.detected);
}

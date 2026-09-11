import { Trade } from './quantitative-engine';

export interface SimilarTradeResult {
  totalSimilar: number;
  trades: SimilarTrade[];
  aggregateWinRate: number;
  avgPnl: number;
  avgHoldingTime: number; // seconds
  avgRisk: number;
  overallSimilarity: number; // 0-1
}

export interface SimilarTrade {
  trade: Trade;
  similarity: number; // 0-1
  matchFactors: string[]; // which factors matched
}

export function findSimilarTrades(proposedTrade: any, allTrades: any[], options?: any): SimilarTradeResult {
  const similarTrades: SimilarTrade[] = [];
  const propSym = String(proposedTrade.symbol || '').toUpperCase().replace('/', '');
  const propDir = String(proposedTrade.direction || '').toUpperCase();
  const propTime = proposedTrade.entryTime || proposedTrade.openTime ? new Date(proposedTrade.entryTime || proposedTrade.openTime) : new Date();
  const propHour = propTime.getHours();
  const propRisk = proposedTrade.riskPercentage !== null && proposedTrade.riskPercentage !== undefined ? Number(proposedTrade.riskPercentage) : null;
  const propSize = Number(proposedTrade.positionSize ?? proposedTrade.lotSize ?? proposedTrade.quantity ?? 0);

  for (const trade of (allTrades || [])) {
    if (trade.id === proposedTrade.id) continue;

    let similarity = 0;
    const matchFactors: string[] = [];

    // Same symbol: 30%
    const tradeSym = String(trade.symbol || '').toUpperCase().replace('/', '');
    if (tradeSym === propSym) {
      similarity += 0.30;
      matchFactors.push('Same symbol');
    }

    // Same direction: 20%
    const tradeDir = String(trade.direction || '').toUpperCase();
    if (tradeDir === propDir) {
      similarity += 0.20;
      matchFactors.push('Same direction');
    }

    // Similar time of day: 10%
    const tradeTime = trade.entryTime || trade.openTime ? new Date(trade.entryTime || trade.openTime) : null;
    if (tradeTime && !isNaN(tradeTime.getTime())) {
      const tradeHour = tradeTime.getHours();
      if (Math.abs(propHour - tradeHour) <= 2 || Math.abs(propHour - tradeHour) >= 22) {
        similarity += 0.10;
        matchFactors.push('Similar time of day');
      }
    }

    // Similar risk level: 10%
    const tradeRisk = trade.riskPercentage !== null && trade.riskPercentage !== undefined ? Number(trade.riskPercentage) : null;
    if (propRisk !== null && tradeRisk !== null) {
      if (Math.abs(propRisk - tradeRisk) <= 0.3) {
        similarity += 0.10;
        matchFactors.push('Similar risk level');
      }
    }

    // Similar position size: 10%
    const tradeSize = Number(trade.positionSize ?? trade.lotSize ?? trade.quantity ?? 0);
    if (tradeSize > 0 && propSize > 0) {
      const sizeDiff = Math.abs(propSize - tradeSize) / tradeSize;
      if (sizeDiff <= 0.3) {
        similarity += 0.10;
        matchFactors.push('Similar position size');
      }
    }

    if (similarity >= 0.4) {
      similarTrades.push({ trade, similarity, matchFactors });
    }
  }

  similarTrades.sort((a, b) => b.similarity - a.similarity);
  const topSimilar = similarTrades.slice(0, 10);

  const getTradePnl = (t: any) => Number(t.pnl ?? t.netProfit ?? t.profit ?? 0);
  const getTradeDur = (t: any) => Number(t.duration ?? t.durationSeconds ?? 0);

  const closedTop = topSimilar.filter(t => (t.trade.status || 'CLOSED').toUpperCase() === 'CLOSED');

  const aggregateWinRate = closedTop.length > 0 
    ? closedTop.filter(t => getTradePnl(t.trade) > 0).length / closedTop.length 
    : 0;

  const avgPnl = closedTop.length > 0
    ? closedTop.reduce((sum, t) => sum + getTradePnl(t.trade), 0) / closedTop.length
    : 0;

  const durTrades = topSimilar.filter(t => getTradeDur(t.trade) > 0);
  const avgHoldingTime = durTrades.length > 0
    ? durTrades.reduce((sum, t) => sum + getTradeDur(t.trade), 0) / durTrades.length
    : 0;

  const riskTrades = topSimilar.filter(t => t.trade.riskPercentage !== null && t.trade.riskPercentage !== undefined);
  const avgRisk = riskTrades.length > 0
    ? riskTrades.reduce((sum, t) => sum + Number(t.trade.riskPercentage), 0) / riskTrades.length
    : 0;

  const overallSimilarity = topSimilar.length > 0
    ? topSimilar.reduce((sum, t) => sum + t.similarity, 0) / topSimilar.length
    : 0;

  return {
    totalSimilar: similarTrades.length,
    trades: topSimilar,
    aggregateWinRate: Number(aggregateWinRate.toFixed(2)),
    avgPnl: Number(avgPnl.toFixed(2)),
    avgHoldingTime: Math.round(avgHoldingTime),
    avgRisk: Number(avgRisk.toFixed(2)),
    overallSimilarity: Number(overallSimilarity.toFixed(2))
  };
}

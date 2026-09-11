export interface Trade {
  id: string;
  symbol: string;
  direction: 'LONG' | 'SHORT';
  entryPrice: number;
  exitPrice: number | null;
  quantity: number;
  positionSize: number;
  stopLoss: number | null;
  takeProfit: number | null;
  entryTime: Date;
  exitTime: Date | null;
  pnl: number | null;
  pnlPercentage: number | null;
  fees: number | null;
  duration: number | null; // in seconds
  strategy: string | null;
  timeframe: string | null;
  riskPercentage: number | null;
  riskReward: number | null;
  orderType: string | null;
  status: 'OPEN' | 'CLOSED' | 'CANCELLED';
}

export interface QuantitativeProfile {
  winRate: number;
  profitFactor: number;
  expectancy: number;
  maxDrawdown: { amount: number; percentage: number; startDate: Date | null; endDate: Date | null };
  currentDrawdown: number;
  averageRisk: number;
  averagePositionSize: number;
  tradeFrequency: { daily: number; weekly: number; monthly: number };
  holdingTimeStats: { average: number; median: number; min: number; max: number };
  timeOfDayPerformance: Array<{ hour: number; trades: number; winRate: number; avgPnl: number }>;
  dayOfWeekPerformance: Array<{ day: string; trades: number; winRate: number; avgPnl: number }>;
  streaks: {
    currentStreak: { type: 'win' | 'loss'; count: number };
    maxWinStreak: number;
    maxLossStreak: number;
    avgWinStreak: number;
    avgLossStreak: number;
  };
  riskRewardStats: { average: number; median: number; planned: number; actual: number };
  symbolPerformance: Array<{ symbol: string; trades: number; winRate: number; totalPnl: number; avgPnl: number }>;
  strategyPerformance: Array<{ strategy: string; trades: number; winRate: number; totalPnl: number; profitFactor: number }>;
  dailyPnl: Array<{ date: string; pnl: number; trades: number; cumulativePnl: number }>;
}

export function calculateWinRate(trades: Trade[]): number {
  const closedTrades = trades.filter(t => t.status === 'CLOSED' && t.pnl !== null);
  if (closedTrades.length === 0) return 0;
  const wins = closedTrades.filter(t => t.pnl! > 0).length;
  return wins / closedTrades.length;
}

export function calculateProfitFactor(trades: Trade[]): number {
  const closedTrades = trades.filter(t => t.status === 'CLOSED' && t.pnl !== null);
  let grossProfit = 0;
  let grossLoss = 0;
  
  for (const trade of closedTrades) {
    if (trade.pnl! > 0) grossProfit += trade.pnl!;
    else if (trade.pnl! < 0) grossLoss += Math.abs(trade.pnl!);
  }
  
  if (grossLoss === 0) return grossProfit > 0 ? Number.POSITIVE_INFINITY : 0;
  return grossProfit / grossLoss;
}

export function calculateExpectancy(trades: Trade[]): number {
  const closedTrades = trades.filter(t => t.status === 'CLOSED' && t.pnl !== null);
  if (closedTrades.length === 0) return 0;
  
  const wins = closedTrades.filter(t => t.pnl! > 0);
  const losses = closedTrades.filter(t => t.pnl! <= 0);
  
  const winRate = wins.length / closedTrades.length;
  const lossRate = losses.length / closedTrades.length;
  
  const avgWin = wins.length > 0 ? wins.reduce((sum, t) => sum + t.pnl!, 0) / wins.length : 0;
  const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((sum, t) => sum + t.pnl!, 0) / losses.length) : 0;
  
  return (winRate * avgWin) - (lossRate * avgLoss);
}

export function calculateMaxDrawdown(trades: Trade[]): { amount: number; percentage: number; startDate: Date | null; endDate: Date | null } {
  let peak = 0;
  let currentBalance = 0;
  let maxDrawdownAmount = 0;
  let maxDrawdownPct = 0;
  let peakDate: Date | null = null;
  let ddStartDate: Date | null = null;
  let ddEndDate: Date | null = null;

  const sortedTrades = [...trades].filter(t => t.status === 'CLOSED' && t.exitTime && t.pnl !== null)
    .sort((a, b) => a.exitTime!.getTime() - b.exitTime!.getTime());

  if (sortedTrades.length === 0) return { amount: 0, percentage: 0, startDate: null, endDate: null };

  for (const trade of sortedTrades) {
    currentBalance += trade.pnl!;
    if (currentBalance > peak) {
      peak = currentBalance;
      peakDate = trade.exitTime;
    }

    const drawdownAmount = peak - currentBalance;
    const drawdownPct = peak > 0 ? drawdownAmount / peak : 0; // Relative to profit peak

    if (drawdownAmount > maxDrawdownAmount) {
      maxDrawdownAmount = drawdownAmount;
      maxDrawdownPct = drawdownPct;
      ddStartDate = peakDate;
      ddEndDate = trade.exitTime;
    }
  }

  return { amount: maxDrawdownAmount, percentage: maxDrawdownPct, startDate: ddStartDate, endDate: ddEndDate };
}

export function calculateCurrentDrawdown(trades: Trade[], currentBalance: number, startingBalance: number): number {
  let peak = startingBalance;
  let runningBalance = startingBalance;
  
  const sortedTrades = [...trades].filter(t => t.status === 'CLOSED' && t.exitTime && t.pnl !== null)
    .sort((a, b) => a.exitTime!.getTime() - b.exitTime!.getTime());

  for (const trade of sortedTrades) {
    runningBalance += trade.pnl!;
    if (runningBalance > peak) {
      peak = runningBalance;
    }
  }
  
  if (currentBalance >= peak) return 0;
  return peak - currentBalance;
}

export function calculateAverageRisk(trades: Trade[]): number {
  const riskTrades = trades.filter(t => t.riskPercentage !== null);
  if (riskTrades.length === 0) return 0;
  return riskTrades.reduce((sum, t) => sum + t.riskPercentage!, 0) / riskTrades.length;
}

export function calculateAveragePositionSize(trades: Trade[]): number {
  if (trades.length === 0) return 0;
  return trades.reduce((sum, t) => sum + t.positionSize, 0) / trades.length;
}

export function calculateTradeFrequency(trades: Trade[]): { daily: number; weekly: number; monthly: number } {
  if (trades.length < 2) return { daily: trades.length, weekly: trades.length, monthly: trades.length };
  
  const sorted = [...trades].sort((a, b) => a.entryTime.getTime() - b.entryTime.getTime());
  const first = sorted[0].entryTime.getTime();
  const last = sorted[sorted.length - 1].entryTime.getTime();
  const daysDiff = Math.max(1, (last - first) / (1000 * 60 * 60 * 24));
  
  return {
    daily: trades.length / daysDiff,
    weekly: trades.length / (daysDiff / 7 || 1),
    monthly: trades.length / (daysDiff / 30 || 1)
  };
}

export function calculateHoldingTimeStats(trades: Trade[]): { average: number; median: number; min: number; max: number } {
  const durations = trades.filter(t => t.duration !== null).map(t => t.duration!);
  if (durations.length === 0) return { average: 0, median: 0, min: 0, max: 0 };
  
  durations.sort((a, b) => a - b);
  const sum = durations.reduce((a, b) => a + b, 0);
  const average = sum / durations.length;
  const min = durations[0];
  const max = durations[durations.length - 1];
  const mid = Math.floor(durations.length / 2);
  const median = durations.length % 2 !== 0 ? durations[mid] : (durations[mid - 1] + durations[mid]) / 2;
  
  return { average, median, min, max };
}

export function calculateTimeOfDayPerformance(trades: Trade[]): Array<{ hour: number; trades: number; winRate: number; avgPnl: number }> {
  const byHour = new Map<number, Trade[]>();
  for (let i = 0; i < 24; i++) byHour.set(i, []);
  
  trades.filter(t => t.status === 'CLOSED' && t.pnl !== null).forEach(t => {
    const hour = t.entryTime.getHours();
    byHour.get(hour)?.push(t);
  });
  
  return Array.from(byHour.entries()).map(([hour, hourTrades]) => {
    const wins = hourTrades.filter(t => t.pnl! > 0).length;
    const winRate = hourTrades.length > 0 ? wins / hourTrades.length : 0;
    const avgPnl = hourTrades.length > 0 ? hourTrades.reduce((sum, t) => sum + t.pnl!, 0) / hourTrades.length : 0;
    return { hour, trades: hourTrades.length, winRate, avgPnl };
  });
}

export function calculateDayOfWeekPerformance(trades: Trade[]): Array<{ day: string; trades: number; winRate: number; avgPnl: number }> {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const byDay = new Map<string, Trade[]>();
  days.forEach(d => byDay.set(d, []));
  
  trades.filter(t => t.status === 'CLOSED' && t.pnl !== null).forEach(t => {
    const day = days[t.entryTime.getDay()];
    byDay.get(day)?.push(t);
  });
  
  return Array.from(byDay.entries()).map(([day, dayTrades]) => {
    const wins = dayTrades.filter(t => t.pnl! > 0).length;
    const winRate = dayTrades.length > 0 ? wins / dayTrades.length : 0;
    const avgPnl = dayTrades.length > 0 ? dayTrades.reduce((sum, t) => sum + t.pnl!, 0) / dayTrades.length : 0;
    return { day, trades: dayTrades.length, winRate, avgPnl };
  });
}

export function calculateStreaks(trades: Trade[]): { currentStreak: { type: 'win' | 'loss'; count: number }; maxWinStreak: number; maxLossStreak: number; avgWinStreak: number; avgLossStreak: number } {
  const closed = [...trades].filter(t => t.status === 'CLOSED' && t.pnl !== null).sort((a, b) => a.exitTime!.getTime() - b.exitTime!.getTime());
  
  let maxWinStreak = 0;
  let maxLossStreak = 0;
  let currentWinStreak = 0;
  let currentLossStreak = 0;
  
  const winStreaks: number[] = [];
  const lossStreaks: number[] = [];
  
  for (const t of closed) {
    if (t.pnl! > 0) {
      if (currentLossStreak > 0) {
        lossStreaks.push(currentLossStreak);
        currentLossStreak = 0;
      }
      currentWinStreak++;
      if (currentWinStreak > maxWinStreak) maxWinStreak = currentWinStreak;
    } else if (t.pnl! < 0) {
      if (currentWinStreak > 0) {
        winStreaks.push(currentWinStreak);
        currentWinStreak = 0;
      }
      currentLossStreak++;
      if (currentLossStreak > maxLossStreak) maxLossStreak = currentLossStreak;
    }
  }
  
  if (currentWinStreak > 0) winStreaks.push(currentWinStreak);
  if (currentLossStreak > 0) lossStreaks.push(currentLossStreak);
  
  const avgWinStreak = winStreaks.length > 0 ? winStreaks.reduce((a, b) => a + b, 0) / winStreaks.length : 0;
  const avgLossStreak = lossStreaks.length > 0 ? lossStreaks.reduce((a, b) => a + b, 0) / lossStreaks.length : 0;
  
  let currentType: 'win' | 'loss' = 'win';
  let currentCount = 0;
  
  if (currentWinStreak > 0) {
    currentType = 'win';
    currentCount = currentWinStreak;
  } else if (currentLossStreak > 0) {
    currentType = 'loss';
    currentCount = currentLossStreak;
  }

  return {
    currentStreak: { type: currentType, count: currentCount },
    maxWinStreak, maxLossStreak, avgWinStreak, avgLossStreak
  };
}

export function calculateRiskRewardStats(trades: Trade[]): { average: number; median: number; planned: number; actual: number } {
  const validTrades = trades.filter(t => t.riskReward !== null);
  if (validTrades.length === 0) return { average: 0, median: 0, planned: 0, actual: 0 };
  
  const rrs = validTrades.map(t => t.riskReward!);
  rrs.sort((a, b) => a - b);
  
  const average = rrs.reduce((a, b) => a + b, 0) / rrs.length;
  const mid = Math.floor(rrs.length / 2);
  const median = rrs.length % 2 !== 0 ? rrs[mid] : (rrs[mid - 1] + rrs[mid]) / 2;
  
  let totalPlanned = 0;
  let plannedCount = 0;
  
  let totalActual = 0;
  let actualCount = 0;

  for (const t of trades) {
    if (t.entryPrice && t.stopLoss && t.takeProfit) {
      const risk = Math.abs(t.entryPrice - t.stopLoss);
      const reward = Math.abs(t.takeProfit - t.entryPrice);
      if (risk > 0) {
        totalPlanned += reward / risk;
        plannedCount++;
      }
    }
    
    if (t.status === 'CLOSED' && t.pnl !== null && t.riskPercentage && t.riskPercentage > 0 && t.positionSize > 0) {
      const riskAmount = t.positionSize * (t.riskPercentage / 100);
      if (riskAmount > 0) {
         totalActual += t.pnl / riskAmount;
         actualCount++;
      }
    }
  }

  const planned = plannedCount > 0 ? totalPlanned / plannedCount : 0;
  const actual = actualCount > 0 ? totalActual / actualCount : average;

  return { average, median, planned, actual };
}

export function calculateSymbolPerformance(trades: Trade[]): Array<{ symbol: string; trades: number; winRate: number; totalPnl: number; avgPnl: number }> {
  const bySymbol = new Map<string, Trade[]>();
  
  trades.forEach(t => {
    if (!bySymbol.has(t.symbol)) bySymbol.set(t.symbol, []);
    bySymbol.get(t.symbol)!.push(t);
  });
  
  return Array.from(bySymbol.entries()).map(([symbol, symTrades]) => {
    const closed = symTrades.filter(t => t.status === 'CLOSED' && t.pnl !== null);
    const wins = closed.filter(t => t.pnl! > 0).length;
    const winRate = closed.length > 0 ? wins / closed.length : 0;
    const totalPnl = closed.reduce((sum, t) => sum + t.pnl!, 0);
    const avgPnl = closed.length > 0 ? totalPnl / closed.length : 0;
    
    return { symbol, trades: symTrades.length, winRate, totalPnl, avgPnl };
  }).sort((a, b) => b.totalPnl - a.totalPnl);
}

export function calculateStrategyPerformance(trades: Trade[]): Array<{ strategy: string; trades: number; winRate: number; totalPnl: number; profitFactor: number }> {
  const byStrategy = new Map<string, Trade[]>();
  
  trades.forEach(t => {
    const strat = t.strategy || 'Uncategorized';
    if (!byStrategy.has(strat)) byStrategy.set(strat, []);
    byStrategy.get(strat)!.push(t);
  });
  
  return Array.from(byStrategy.entries()).map(([strategy, stratTrades]) => {
    const closed = stratTrades.filter(t => t.status === 'CLOSED' && t.pnl !== null);
    const wins = closed.filter(t => t.pnl! > 0).length;
    const winRate = closed.length > 0 ? wins / closed.length : 0;
    const totalPnl = closed.reduce((sum, t) => sum + t.pnl!, 0);
    
    let grossProfit = 0;
    let grossLoss = 0;
    closed.forEach(t => {
      if (t.pnl! > 0) grossProfit += t.pnl!;
      else if (t.pnl! < 0) grossLoss += Math.abs(t.pnl!);
    });
    const profitFactor = grossLoss === 0 ? (grossProfit > 0 ? Number.POSITIVE_INFINITY : 0) : grossProfit / grossLoss;
    
    return { strategy, trades: stratTrades.length, winRate, totalPnl, profitFactor };
  }).sort((a, b) => b.totalPnl - a.totalPnl);
}

export function calculateDailyPnl(trades: Trade[]): Array<{ date: string; pnl: number; trades: number; cumulativePnl: number }> {
  const closed = [...trades].filter(t => t.status === 'CLOSED' && t.pnl !== null && t.exitTime)
    .sort((a, b) => a.exitTime!.getTime() - b.exitTime!.getTime());
    
  const byDate = new Map<string, { pnl: number; trades: number }>();
  
  closed.forEach(t => {
    const dateStr = t.exitTime!.toISOString().split('T')[0];
    if (!byDate.has(dateStr)) byDate.set(dateStr, { pnl: 0, trades: 0 });
    const day = byDate.get(dateStr)!;
    day.pnl += t.pnl!;
    day.trades += 1;
  });
  
  let cumulativePnl = 0;
  return Array.from(byDate.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, data]) => {
      cumulativePnl += data.pnl;
      return { date, pnl: data.pnl, trades: data.trades, cumulativePnl };
    });
}

export function getQuantitativeProfile(trades: Trade[], balance: number, startingBalance: number): QuantitativeProfile {
  return {
    winRate: calculateWinRate(trades),
    profitFactor: calculateProfitFactor(trades),
    expectancy: calculateExpectancy(trades),
    maxDrawdown: calculateMaxDrawdown(trades),
    currentDrawdown: calculateCurrentDrawdown(trades, balance, startingBalance),
    averageRisk: calculateAverageRisk(trades),
    averagePositionSize: calculateAveragePositionSize(trades),
    tradeFrequency: calculateTradeFrequency(trades),
    holdingTimeStats: calculateHoldingTimeStats(trades),
    timeOfDayPerformance: calculateTimeOfDayPerformance(trades),
    dayOfWeekPerformance: calculateDayOfWeekPerformance(trades),
    streaks: calculateStreaks(trades),
    riskRewardStats: calculateRiskRewardStats(trades),
    symbolPerformance: calculateSymbolPerformance(trades),
    strategyPerformance: calculateStrategyPerformance(trades),
    dailyPnl: calculateDailyPnl(trades)
  };
}

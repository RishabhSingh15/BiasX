export interface CalendarDay {
  day: number;
  weekday: number; // 0=Sun, 1=Mon, ..., 6=Sat
  traded: boolean;
  pnl?: number;
  grossProfit?: number;
  grossLoss?: number;
  trades?: number;
  wins?: number;
  losses?: number;
  pnlPercent?: number;
  rMultiple?: number;
  symbols?: string[];
}

export interface RiskMetrics {
  dailyLossUsed: number;
  dailyLossLimit: number;
  dailyLossPercent: number;
  maxDrawdownUsed: number;
  maxDrawdownLimit: number;
  maxDrawdownPercent: number;
  tradesToday: number;
  maxTradesPerDay: number;
  capitalAtRiskPercent: number;
  maxRiskPerTrade: number;
  ruleViolations: number;
}

export interface BehaviorScoreBreakdown {
  ruleAdherence: number;
  riskDiscipline: number;
  fomoControl: number;
  revengeTrading: number;
  overtrading: number;
  consistency: number;
}

export interface BehaviorScore {
  total: number;
  status: string;
  weeklyChange: number;
  breakdown: BehaviorScoreBreakdown;
}

export interface DailyPnlItem {
  date: string;
  pnl: number;
  cumulativePnl: number;
}

export interface DashboardData {
  balance: number;
  equity: number;
  startingBalance: number;
  todaysPnl: number;
  totalTrades: number;
  winRate: number;
  profitFactor: number;
  dailyPnl: DailyPnlItem[];
  behaviorScore: BehaviorScore;
  riskMetrics: RiskMetrics;
  recentTrades: any[];
}

export interface BehaviorPattern {
  id: string;
  name: string;
  type?: string;
  severity: 'critical' | 'high' | 'medium' | 'advisory';
  whatHappened?: string;
  description?: string;
  howToFix?: string;
  cost: number;
  frequency: number;
  frequencyLabel?: string;
  winRate?: number;
}

export interface RuleConsequenceMetrics {
  totalTrades: number;
  winRate: number;
  profitFactor: number;
  totalPnl: number;
  avgWin: number;
  avgLoss: number;
}

export interface ConsequenceComparison {
  ruleFollowing: RuleConsequenceMetrics;
  ruleViolating: RuleConsequenceMetrics;
}

export interface TraderProfile {
  bestSessionWindow?: string;
  worstSessionWindow?: string;
}

export interface BehaviorAudit {
  state?: number;
  ruleAdherenceRate?: number;
  totalBadHabitCost?: number;
  ruleViolationsCount?: number;
  cleanTradesCount?: number;
  violatingTradesCount?: number;
  patterns?: BehaviorPattern[];
  traderProfile?: TraderProfile;
  consequenceComparison?: ConsequenceComparison;
  activeRulesCount?: number;
}

export interface DashboardStatsWithBehavior {
  stats?: {
    totalTrades?: number;
  };
  behaviorAudit?: BehaviorAudit;
}

export interface TradeRecord {
  id: string | number;
  date: string;
  symbol: string;
  direction: 'LONG' | 'SHORT';
  entry: number;
  exit: number | null;
  lotSize: number;
  size: string;
  pnl: number | null;
  status?: string;
  rr: string;
  duration: string;
  strategy: string;
  rulesFollowed: number;
  totalRules: number;
  breaches: string[];
  behavior: string;
  score: number;
  stopLoss: number | null;
  takeProfit: number | null;
}

export interface ActiveRuleItem {
  id?: string;
  name: string;
  ruleType?: string;
  value?: string | number;
  unit?: string;
  isActive?: boolean;
}

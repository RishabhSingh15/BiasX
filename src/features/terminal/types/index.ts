export type TradeDirection = 'BUY' | 'SELL';

export interface SymbolContractInfo {
  size: number;
  label: string;
}

export interface SymbolListItem {
  symbol: string;
  name: string;
  defaultPrice: number;
  category: string;
}

export interface RuleCheckItem {
  name: string;
  passed: boolean;
  desc?: string;
  impact?: string;
}

export interface ConsequenceItem {
  title: string;
  detail: string;
  impact?: 'high' | 'medium' | 'info';
  stat?: string;
}

export interface ProtocolItem {
  step: number;
  action: string;
  explanation?: string;
}

export interface OrderAnalysisResult {
  analysisId?: string;
  status: 'SAFE' | 'CAUTION' | 'HIGH RISK' | 'BLOCK';
  title: string;
  message: string;
  behaviorDetected?: string | null;
  rules: RuleCheckItem[];
  consequences?: ConsequenceItem[];
  protocol?: string[] | ProtocolItem[];
  historicalStats?: {
    totalSimilar: number;
    winRate: number;
    avgPnl: number;
    summary?: string;
  };
  keyTakeaway?: string;
  canProceed?: boolean;
  recommendedLots?: number;
  recommendedTP?: number;
}

export interface OrderCalculationResults {
  numLots: number;
  contractMultiplier: number;
  contractInfo: SymbolContractInfo;
  slPriceDiff: number;
  tpPriceDiff: number;
  slPricePct: string;
  tpPricePct: string;
  dollarRisk: number;
  dollarProfit: number;
  riskPct: number;
  rewardPct: number;
  rrRatio: string;
  isRiskSafe: boolean;
  maxAllowedRiskDollar: number;
  isSlValid: boolean;
  isTpValid: boolean;
  slError?: string | null;
  tpError?: string | null;
}

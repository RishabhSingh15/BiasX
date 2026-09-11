import { DemoTrade } from './demo-data-generator';

export type NormalizedTrade = {
  symbol: string;
  assetClass: string;
  direction: string;
  entryPrice: number;
  exitPrice?: number;
  quantity: number;
  positionSize: number;
  stopLoss?: number;
  takeProfit?: number;
  entryTime: Date;
  exitTime?: Date;
  pnl?: number;
  pnlPercentage?: number;
  fees: number;
  status: string;
  notes?: string;
  orderType: string;
};

export type ColumnMapping = {
  symbol: string;
  direction: string;
  entryPrice: string;
  exitPrice: string;
  quantity: string;
  entryTime: string;
  exitTime: string;
  pnl: string;
  fees: string;
};

export function normalizeDemoTrade(trade: DemoTrade): NormalizedTrade {
  return {
    symbol: trade.symbol,
    assetClass: trade.assetClass,
    direction: trade.direction,
    entryPrice: trade.entryPrice,
    exitPrice: trade.exitPrice || undefined,
    quantity: trade.quantity,
    positionSize: trade.positionSize,
    stopLoss: trade.stopLoss || undefined,
    takeProfit: trade.takeProfit || undefined,
    entryTime: trade.entryTime,
    exitTime: trade.exitTime || undefined,
    pnl: trade.pnl || undefined,
    pnlPercentage: trade.pnlPercentage || undefined,
    fees: trade.fees,
    status: trade.status,
    notes: trade.notes || undefined,
    orderType: trade.orderType,
  };
}

export function normalizeCSVTrade(row: Record<string, string>, mapping: ColumnMapping): NormalizedTrade {
  const symbol = row[mapping.symbol] || 'UNKNOWN';
  const direction = row[mapping.direction]?.toLowerCase().includes('sell') || row[mapping.direction]?.toLowerCase().includes('short') ? 'short' : 'long';
  const entryPrice = parseFloat(row[mapping.entryPrice] || '0');
  const exitPrice = parseFloat(row[mapping.exitPrice] || '0');
  const quantity = parseFloat(row[mapping.quantity] || '0');
  const entryTime = new Date(row[mapping.entryTime] || Date.now());
  const exitTime = new Date(row[mapping.exitTime] || Date.now());
  const pnl = parseFloat(row[mapping.pnl] || '0');
  const fees = parseFloat(row[mapping.fees] || '0');

  return {
    symbol,
    assetClass: 'crypto', // Default for now
    direction,
    entryPrice,
    exitPrice: exitPrice || undefined,
    quantity,
    positionSize: entryPrice * quantity,
    entryTime,
    exitTime: exitTime || undefined,
    pnl,
    pnlPercentage: entryPrice > 0 ? (pnl / (entryPrice * quantity)) * 100 : 0,
    fees,
    status: 'closed',
    orderType: 'market',
  };
}

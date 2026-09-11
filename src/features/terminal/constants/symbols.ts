import { SUPPORTED_SYMBOLS } from '@/components/charts/tradingview-chart';
import { SymbolContractInfo, SymbolListItem } from '../types';

export const SYMBOL_CONTRACT_SIZES: Record<string, SymbolContractInfo> = {
  'XAU/USD': { size: 100, label: 'oz' },       // 1 lot = 100 oz Gold
  'GOLD': { size: 100, label: 'oz' },
  'GC1!': { size: 100, label: 'oz' },
  'EUR/USD': { size: 100000, label: 'EUR' },   // 1 lot = 100,000 units
  'GBP/USD': { size: 100000, label: 'GBP' },   // 1 lot = 100,000 units
  'USD/JPY': { size: 100000, label: 'USD' },
  'BTC/USDT': { size: 1, label: 'BTC' },       // 1 lot = 1 BTC
  'ETH/USDT': { size: 1, label: 'ETH' },       // 1 lot = 1 ETH
  'SOL/USDT': { size: 1, label: 'SOL' },       // 1 lot = 1 SOL
  'XRP/USDT': { size: 1000, label: 'XRP' },
  'DOGE/USDT': { size: 10000, label: 'DOGE' },
  'BNB/USDT': { size: 1, label: 'BNB' },
  'TSLA': { size: 100, label: 'shares' },      // 1 lot = 100 shares
  'NVDA': { size: 100, label: 'shares' },
  'AAPL': { size: 100, label: 'shares' },
  'SPY': { size: 100, label: 'shares' },
  'NAS100': { size: 1, label: 'contracts' },
};

export const SYMBOL_LIST: SymbolListItem[] = Object.entries(SUPPORTED_SYMBOLS).map(([sym, cfg]) => ({
  symbol: sym,
  name: cfg.name,
  defaultPrice: cfg.defaultPrice,
  category: cfg.category,
}));

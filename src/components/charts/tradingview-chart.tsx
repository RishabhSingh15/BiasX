'use client';

import React, { useEffect, useRef, useState, memo } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SymbolConfig {
  name: string;
  decimals: number;
  category: string;
  defaultPrice: number;
  tvTicker?: string;
}

export const SUPPORTED_SYMBOLS: Record<string, SymbolConfig> = {
  'XAU/USD': { name: 'Gold Spot USD', decimals: 2, category: 'Commodities', defaultPrice: 2850.50, tvTicker: 'OANDA:XAUUSD' },
  'GOLD': { name: 'Gold Spot USD', decimals: 2, category: 'Commodities', defaultPrice: 2850.50, tvTicker: 'TVC:GOLD' },
  'GC1!': { name: 'Gold Futures', decimals: 1, category: 'Commodities', defaultPrice: 2865.00, tvTicker: 'COMEX:GC1!' },
  'BTC/USDT': { name: 'Bitcoin', decimals: 2, category: 'Crypto', defaultPrice: 79854.60, tvTicker: 'BINANCE:BTCUSDT' },
  'ETH/USDT': { name: 'Ethereum', decimals: 2, category: 'Crypto', defaultPrice: 2497.00, tvTicker: 'BINANCE:ETHUSDT' },
  'SOL/USDT': { name: 'Solana', decimals: 2, category: 'Crypto', defaultPrice: 106.48, tvTicker: 'BINANCE:SOLUSDT' },
  'XRP/USDT': { name: 'XRP', decimals: 4, category: 'Crypto', defaultPrice: 2.45, tvTicker: 'BINANCE:XRPUSDT' },
  'DOGE/USDT': { name: 'Dogecoin', decimals: 4, category: 'Crypto', defaultPrice: 0.245, tvTicker: 'BINANCE:DOGEUSDT' },
  'BNB/USDT': { name: 'BNB', decimals: 2, category: 'Crypto', defaultPrice: 650.00, tvTicker: 'BINANCE:BNBUSDT' },
  'EUR/USD': { name: 'Euro / USD', decimals: 4, category: 'Forex', defaultPrice: 1.1613, tvTicker: 'FX:EURUSD' },
  'GBP/USD': { name: 'British Pound', decimals: 4, category: 'Forex', defaultPrice: 1.3510, tvTicker: 'FX:GBPUSD' },
  'USD/JPY': { name: 'USD / JPY', decimals: 2, category: 'Forex', defaultPrice: 156.20, tvTicker: 'FX:USDJPY' },
  'TSLA': { name: 'Tesla, Inc.', decimals: 2, category: 'Stocks', defaultPrice: 354.08, tvTicker: 'NASDAQ:TSLA' },
  'NVDA': { name: 'NVIDIA Corp.', decimals: 2, category: 'Stocks', defaultPrice: 230.36, tvTicker: 'NASDAQ:NVDA' },
  'AAPL': { name: 'Apple Inc.', decimals: 2, category: 'Stocks', defaultPrice: 319.97, tvTicker: 'NASDAQ:AAPL' },
  'SPY': { name: 'SPDR S&P 500 ETF', decimals: 2, category: 'Indices', defaultPrice: 770.19, tvTicker: 'AMEX:SPY' },
  'NAS100': { name: 'Nasdaq 100 Index', decimals: 2, category: 'Indices', defaultPrice: 21500.00, tvTicker: 'FOREXCOM:NAS100' },
};

export function getTradingViewSymbol(symbol: string): string {
  const cfg = SUPPORTED_SYMBOLS[symbol];
  if (cfg?.tvTicker) return cfg.tvTicker;
  if (symbol.includes(':')) return symbol;
  const clean = symbol.replace(/[^A-Z0-9]/g, '');
  return `BINANCE:${clean}`;
}

const TIMEFRAMES = [
  { label: '1m', value: '1m', tv: '1' },
  { label: '5m', value: '5m', tv: '5' },
  { label: '15m', value: '15m', tv: '15' },
  { label: '1H', value: '1h', tv: '60' },
  { label: '4H', value: '4h', tv: '240' },
  { label: '1D', value: '1d', tv: 'D' },
];

export interface TradingViewChartProps {
  symbol?: string;
  interval?: string;
  onMaximizeToggle?: () => void;
  isMaximized?: boolean;
  onSymbolChange?: (symbol: string) => void;
}

/**
 * Clean TradingView Advanced Chart Embed:
 * Tactile BehaviorGuard palette with pure candles, smooth loading spinner & reload resilience
 */
function OriginalTradingViewEmbedComponent({
  symbol,
  interval = '15',
}: {
  symbol: string;
  interval?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const tvTicker = getTradingViewSymbol(symbol);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    setIsLoading(true);
    setHasError(false);
    container.innerHTML = '';

    const widgetContainer = document.createElement('div');
    widgetContainer.className = 'tradingview-widget-container';
    widgetContainer.style.height = '100%';
    widgetContainer.style.width = '100%';

    const widgetSlot = document.createElement('div');
    widgetSlot.className = 'tradingview-widget-container__widget';
    widgetSlot.style.height = '100%';
    widgetSlot.style.width = '100%';
    widgetContainer.appendChild(widgetSlot);

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: tvTicker,
      interval: interval,
      timezone: 'Etc/UTC',
      theme: 'light',
      style: '1',
      locale: 'en',
      enable_publishing: false,
      allow_symbol_change: true,
      calendar: false,
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: false,
      hide_side_toolbar: false,
      withdateranges: true,
      details: false,
      hotlist: false,
      backgroundColor: '#E0E5EC',
      gridColor: 'rgba(163, 177, 198, 0.25)',
      support_host: 'https://www.tradingview.com',
      studies: [],
    });

    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 4500);

    script.onload = () => {
      setTimeout(() => setIsLoading(false), 400);
    };

    script.onerror = () => {
      setHasError(true);
      setIsLoading(false);
    };

    widgetContainer.appendChild(script);
    container.appendChild(widgetContainer);

    return () => {
      clearTimeout(timer);
      container.innerHTML = '';
    };
  }, [tvTicker, interval, reloadKey]);

  return (
    <div className="w-full h-full min-h-[520px] flex-1 relative bg-[#E0E5EC]">
      <div className="w-full h-full min-h-[520px]" ref={containerRef} />
      
      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-10 bg-[#E0E5EC]/85 backdrop-blur-[2px] flex flex-col items-center justify-center gap-3 transition-opacity duration-300">
          <div className="w-9 h-9 rounded-full border-3 border-[#6C63FF] border-t-transparent animate-spin" />
          <span className="text-sm font-semibold font-heading text-[#2D3748]">Loading Live Market Feed ({symbol})...</span>
          <span className="text-xs text-[#4A5568] font-mono">Connecting to TradingView network</span>
        </div>
      )}

      {/* Error / Timeout Recovery State */}
      {hasError && (
        <div className="absolute inset-0 z-20 bg-[#E0E5EC] flex flex-col items-center justify-center gap-3 p-6 text-center">
          <p className="text-sm font-bold text-[#FF6B6B] font-heading">Unable to connect to chart stream</p>
          <p className="text-xs text-[#4A5568] max-w-sm font-body">TradingView CDN connection took too long. Click below to reconnect.</p>
          <button
            onClick={() => setReloadKey(k => k + 1)}
            className="px-4 py-2 rounded-[18px] bg-[#E0E5EC] neu-raised text-xs font-heading font-bold text-[#6C63FF] hover:neu-inset transition-all cursor-pointer"
          >
            Retry Connection
          </button>
        </div>
      )}
    </div>
  );
}

const OriginalTradingViewEmbed = memo(OriginalTradingViewEmbedComponent);

/**
 * Dusky Black Chart Container
 */
function TradingViewChartComponent({
  symbol = 'XAU/USD',
  interval = '15m',
  onMaximizeToggle,
  isMaximized = false,
  onSymbolChange,
}: TradingViewChartProps) {
  const [selectedInterval, setSelectedInterval] = useState(interval);

  const config = SUPPORTED_SYMBOLS[symbol] || {
    name: symbol,
    decimals: 2,
    category: 'Custom',
    defaultPrice: 100,
  };

  const currentTfObj = TIMEFRAMES.find(t => t.value === selectedInterval) || TIMEFRAMES[2];

  return (
    <div className="relative w-full h-full min-h-[560px] flex flex-col bg-[#E0E5EC] rounded-[32px] overflow-hidden select-none neu-raised border border-[#A0AEC0]/30">
      {/* Clean Header: Symbol & Maximize (without time buttons) */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#A0AEC0]/30 bg-[#E0E5EC] z-20">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="font-heading font-extrabold text-base text-[#2D3748] tracking-wide">{symbol}</span>
            <span className="text-xs text-[#4A5568] font-medium hidden sm:inline font-body">{config.name}</span>
          </div>
        </div>

        {/* Maximize Toggle */}
        {onMaximizeToggle && (
          <button
            onClick={onMaximizeToggle}
            title={isMaximized ? 'Minimize Chart' : 'Maximize Chart'}
            className="p-2 rounded-full neu-raised-sm hover:neu-inset-sm text-[#4A5568] hover:text-[#2D3748] transition-all cursor-pointer"
          >
            {isMaximized ? <Minimize2 className="h-4 w-4 text-[#2D3748]" /> : <Maximize2 className="h-4 w-4 text-[#2D3748]" />}
          </button>
        )}
      </div>

      {/* Main TradingView Viewport */}
      <div className="relative flex-1 w-full h-full min-h-[500px]">
        <OriginalTradingViewEmbed
          symbol={symbol}
          interval={currentTfObj.tv}
        />
      </div>
    </div>
  );
}

export const TradingViewChart = memo(TradingViewChartComponent);

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
  'XAU/USD': { name: 'Gold Spot USD', decimals: 2, category: 'Commodities', defaultPrice: 4429.82, tvTicker: 'OANDA:XAUUSD' },
  'GOLD': { name: 'Gold Spot USD', decimals: 2, category: 'Commodities', defaultPrice: 4429.82, tvTicker: 'TVC:GOLD' },
  'GC1!': { name: 'Gold Futures', decimals: 1, category: 'Commodities', defaultPrice: 4476.60, tvTicker: 'COMEX:GC1!' },
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
 * Black & Dusky Obsidian palette with pure candles
 */
function OriginalTradingViewEmbedComponent({
  symbol,
  interval = '15',
}: {
  symbol: string;
  interval?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const tvTicker = getTradingViewSymbol(symbol);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

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
      theme: 'dark',
      style: '1',
      locale: 'en',
      enable_publishing: false,
      allow_symbol_change: true,
      calendar: false,
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: false,
      hide_side_toolbar: true,
      withdateranges: false,
      details: false,
      hotlist: false,
      backgroundColor: '#0a0a0a',
      gridColor: 'rgba(255, 255, 255, 0.03)',
      support_host: 'https://www.tradingview.com',
    });

    widgetContainer.appendChild(script);
    container.appendChild(widgetContainer);

    return () => {
      container.innerHTML = '';
    };
  }, [tvTicker, interval]);

  return (
    <div className="w-full h-full min-h-[520px] flex-1 relative bg-[#0a0a0a]" ref={containerRef} />
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
    <div className="relative w-full h-full min-h-[560px] flex flex-col bg-[#0d0d0d] rounded-2xl overflow-hidden select-none border border-[#202020] shadow-2xl shadow-black/80">
      {/* Clean Dusky Header: Symbol, Timeframes, Maximize */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#202020] bg-[#111111] z-20">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-base text-neutral-100 tracking-wide">{symbol}</span>
            <span className="text-xs text-neutral-400 font-medium hidden sm:inline">{config.name}</span>
          </div>
        </div>

        {/* Timeframes & Maximize */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center bg-[#080808] rounded-xl p-0.5 border border-[#222222]">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf.value}
                onClick={() => setSelectedInterval(tf.value)}
                className={cn(
                  "px-2.5 py-1 text-xs font-mono font-medium rounded-lg transition-colors cursor-pointer",
                  selectedInterval === tf.value
                    ? "bg-[#242424] text-white font-bold border border-[#383838] shadow-sm"
                    : "text-neutral-400 hover:text-white"
                )}
              >
                {tf.label}
              </button>
            ))}
          </div>

          {onMaximizeToggle && (
            <button
              onClick={onMaximizeToggle}
              title={isMaximized ? 'Minimize Chart' : 'Maximize Chart'}
              className="p-1.5 rounded-xl bg-[#080808] hover:bg-[#1a1a1a] border border-[#222222] text-neutral-300 hover:text-white transition-colors cursor-pointer"
            >
              {isMaximized ? <Minimize2 className="h-4 w-4 text-neutral-300" /> : <Maximize2 className="h-4 w-4 text-neutral-300" />}
            </button>
          )}
        </div>
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

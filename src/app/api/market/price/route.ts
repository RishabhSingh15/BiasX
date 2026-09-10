import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface SymbolTarget {
  market: 'cfd' | 'crypto' | 'forex' | 'america' | 'futures';
  ticker: string;
  defaultPrice: number;
  decimals: number;
}

const SYMBOL_MAP: Record<string, SymbolTarget> = {
  // Gold Spot & Futures
  'XAU/USD': { market: 'cfd', ticker: 'OANDA:XAUUSD', defaultPrice: 4429.82, decimals: 2 },
  'GOLD': { market: 'cfd', ticker: 'TVC:GOLD', defaultPrice: 4429.82, decimals: 2 },
  'TVC:GOLD': { market: 'cfd', ticker: 'TVC:GOLD', defaultPrice: 4429.82, decimals: 2 },
  'XAUUSD': { market: 'cfd', ticker: 'OANDA:XAUUSD', defaultPrice: 4429.82, decimals: 2 },
  'OANDA:XAUUSD': { market: 'cfd', ticker: 'OANDA:XAUUSD', defaultPrice: 4429.82, decimals: 2 },
  'GC1!': { market: 'futures', ticker: 'COMEX:GC1!', defaultPrice: 4476.60, decimals: 2 },
  'COMEX:GC1!': { market: 'futures', ticker: 'COMEX:GC1!', defaultPrice: 4476.60, decimals: 2 },
  'GOLD_FUTURES': { market: 'futures', ticker: 'COMEX:GC1!', defaultPrice: 4476.60, decimals: 2 },

  // Crypto
  'BTC/USDT': { market: 'crypto', ticker: 'BINANCE:BTCUSDT', defaultPrice: 79854.60, decimals: 2 },
  'BTC': { market: 'crypto', ticker: 'BINANCE:BTCUSDT', defaultPrice: 79854.60, decimals: 2 },
  'BTCUSD': { market: 'crypto', ticker: 'BINANCE:BTCUSDT', defaultPrice: 79854.60, decimals: 2 },
  'ETH/USDT': { market: 'crypto', ticker: 'BINANCE:ETHUSDT', defaultPrice: 2497.00, decimals: 2 },
  'ETH': { market: 'crypto', ticker: 'BINANCE:ETHUSDT', defaultPrice: 2497.00, decimals: 2 },
  'SOL/USDT': { market: 'crypto', ticker: 'BINANCE:SOLUSDT', defaultPrice: 106.48, decimals: 2 },
  'SOL': { market: 'crypto', ticker: 'BINANCE:SOLUSDT', defaultPrice: 106.48, decimals: 2 },
  'XRP/USDT': { market: 'crypto', ticker: 'BINANCE:XRPUSDT', defaultPrice: 2.45, decimals: 4 },
  'DOGE/USDT': { market: 'crypto', ticker: 'BINANCE:DOGEUSDT', defaultPrice: 0.245, decimals: 4 },
  'BNB/USDT': { market: 'crypto', ticker: 'BINANCE:BNBUSDT', defaultPrice: 650.00, decimals: 2 },

  // Forex
  'EUR/USD': { market: 'forex', ticker: 'FX:EURUSD', defaultPrice: 1.1613, decimals: 4 },
  'EURUSD': { market: 'forex', ticker: 'FX:EURUSD', defaultPrice: 1.1613, decimals: 4 },
  'GBP/USD': { market: 'forex', ticker: 'FX:GBPUSD', defaultPrice: 1.3510, decimals: 4 },
  'USD/JPY': { market: 'forex', ticker: 'FX:USDJPY', defaultPrice: 156.20, decimals: 2 },

  // Stocks & Indices
  'TSLA': { market: 'america', ticker: 'NASDAQ:TSLA', defaultPrice: 354.08, decimals: 2 },
  'NVDA': { market: 'america', ticker: 'NASDAQ:NVDA', defaultPrice: 230.36, decimals: 2 },
  'AAPL': { market: 'america', ticker: 'NASDAQ:AAPL', defaultPrice: 319.97, decimals: 2 },
  'SPY': { market: 'america', ticker: 'AMEX:SPY', defaultPrice: 770.19, decimals: 2 },
  'NAS100': { market: 'cfd', ticker: 'FOREXCOM:NAS100', defaultPrice: 21500.00, decimals: 2 },
};

// In-memory cache for fast responses (1 second TTL)
const cache: Record<string, { data: any; timestamp: number }> = {};
const CACHE_TTL_MS = 1000;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawSymbol = searchParams.get('symbol') || 'XAU/USD';
    const cleanSym = rawSymbol.trim().toUpperCase();

    const target: SymbolTarget = SYMBOL_MAP[cleanSym] || {
      market: cleanSym.includes('GC') ? 'futures' : 'crypto',
      ticker: cleanSym.includes(':') ? cleanSym : `BINANCE:${cleanSym.replace(/[^A-Z0-9]/g, '')}`,
      defaultPrice: 100.00,
      decimals: 2,
    };

    const now = Date.now();
    if (cache[target.ticker] && now - cache[target.ticker].timestamp < CACHE_TTL_MS) {
      return NextResponse.json(cache[target.ticker].data);
    }

    // Query TradingView scanner
    const scanUrl = `https://scanner.tradingview.com/${target.market}/scan`;
    const res = await fetch(scanUrl, {
      method: 'POST',
      body: JSON.stringify({
        symbols: { tickers: [target.ticker] },
        columns: ['close', 'change', 'change_abs', 'description', 'high', 'low', 'open']
      }),
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0'
      },
      cache: 'no-store'
    });

    if (res.ok) {
      const data = await res.json();
      if (data.data && data.data.length > 0) {
        const d = data.data[0].d;
        const result = {
          symbol: rawSymbol,
          ticker: target.ticker,
          price: Number(d[0]),
          changePct: Number(d[1] || 0),
          changeAbs: Number(d[2] || 0),
          description: d[3] || cleanSym,
          high: Number(d[4] || d[0]),
          low: Number(d[5] || d[0]),
          open: Number(d[6] || d[0]),
          decimals: target.decimals,
          timestamp: now
        };
        cache[target.ticker] = { data: result, timestamp: now };
        return NextResponse.json(result);
      }
    }

    // Fallback if scanner has no data
    const fallback = {
      symbol: rawSymbol,
      ticker: target.ticker,
      price: target.defaultPrice,
      changePct: 0.15,
      changeAbs: 0.50,
      description: cleanSym,
      decimals: target.decimals,
      timestamp: now
    };
    return NextResponse.json(fallback);
  } catch (error) {
    console.error('Market price API error:', error);
    return NextResponse.json({
      error: 'Failed to fetch market price',
      price: 4429.82,
      decimals: 2
    }, { status: 500 });
  }
}

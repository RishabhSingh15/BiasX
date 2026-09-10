import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

const YAHOO_SYMBOLS: Record<string, string> = {
  'XAU/USD': 'GC=F',
  'GOLD': 'GC=F',
  'GC1!': 'GC=F',
  'XAUUSD': 'GC=F',
  'EUR/USD': 'EURUSD=X',
  'EURUSD': 'EURUSD=X',
  'GBP/USD': 'GBPUSD=X',
  'USD/JPY': 'JPY=X',
  'TSLA': 'TSLA',
  'NVDA': 'NVDA',
  'AAPL': 'AAPL',
  'SPY': 'SPY',
  'NAS100': '^IXIC',
  'BTC/USDT': 'BTC-USD',
  'ETH/USDT': 'ETH-USD',
  'SOL/USDT': 'SOL-USD',
};

const BINANCE_SYMBOLS: Record<string, string> = {
  'BTC/USDT': 'BTCUSDT',
  'ETH/USDT': 'ETHUSDT',
  'SOL/USDT': 'SOLUSDT',
  'XRP/USDT': 'XRPUSDT',
  'DOGE/USDT': 'DOGEUSDT',
  'BNB/USDT': 'BNBUSDT',
};

const INTERVAL_MAP: Record<string, { binance: string; yahoo: string; range: string }> = {
  '1m': { binance: '1m', yahoo: '1m', range: '1d' },
  '5m': { binance: '5m', yahoo: '5m', range: '1d' },
  '15m': { binance: '15m', yahoo: '15m', range: '2d' },
  '1h': { binance: '1h', yahoo: '60m', range: '5d' },
  '4h': { binance: '4h', yahoo: '60m', range: '1mo' },
  '1d': { binance: '1d', yahoo: '1d', range: '3mo' },
};

// In-memory cache for fast repeated queries (3 second TTL)
const historyCache: Record<string, { data: Candle[]; timestamp: number }> = {};
const CACHE_TTL_MS = 3000;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawSymbol = (searchParams.get('symbol') || 'XAU/USD').trim().toUpperCase();
    const intervalKey = (searchParams.get('interval') || '15m').toLowerCase();

    const tf = INTERVAL_MAP[intervalKey] || INTERVAL_MAP['15m'];
    const cacheKey = `${rawSymbol}_${intervalKey}`;

    const now = Date.now();
    if (historyCache[cacheKey] && now - historyCache[cacheKey].timestamp < CACHE_TTL_MS) {
      return NextResponse.json({
        symbol: rawSymbol,
        interval: intervalKey,
        candles: historyCache[cacheKey].data
      });
    }

    let candles: Candle[] = [];

    // 1. Try Binance for crypto symbols
    const binanceSym = BINANCE_SYMBOLS[rawSymbol];
    if (binanceSym) {
      try {
        const binanceUrl = `https://api.binance.com/api/v3/klines?symbol=${binanceSym}&interval=${tf.binance}&limit=100`;
        const res = await fetch(binanceUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, cache: 'no-store' });
        if (res.ok) {
          const raw = await res.json();
          candles = raw.map((k: any) => ({
            time: Math.floor(k[0] / 1000),
            open: parseFloat(k[1]),
            high: parseFloat(k[2]),
            low: parseFloat(k[3]),
            close: parseFloat(k[4]),
            volume: parseFloat(k[5]),
          }));
        }
      } catch (err) {
        console.warn('Binance klines fallback to Yahoo:', err);
      }
    }

    // 2. If not crypto or Binance failed, use Yahoo Finance
    if (candles.length === 0) {
      const yahooTicker = YAHOO_SYMBOLS[rawSymbol] || rawSymbol.replace('/', '-');
      const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooTicker)}?interval=${tf.yahoo}&range=${tf.range}`;
      
      try {
        const res = await fetch(yahooUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          cache: 'no-store'
        });
        if (res.ok) {
          const data = await res.json();
          if (data.chart?.result?.[0]) {
            const res0 = data.chart.result[0];
            const timestamps = res0.timestamp || [];
            const q = res0.indicators?.quote?.[0] || {};
            const opens = q.open || [];
            const highs = q.high || [];
            const lows = q.low || [];
            const closes = q.close || [];
            const volumes = q.volume || [];

            const isForex = rawSymbol.includes('EUR') || rawSymbol.includes('GBP') || rawSymbol.includes('USD');
            const decimals = isForex ? 4 : 2;

            for (let i = 0; i < timestamps.length; i++) {
              if (opens[i] != null && closes[i] != null && highs[i] != null && lows[i] != null) {
                candles.push({
                  time: timestamps[i],
                  open: Number(opens[i].toFixed(decimals)),
                  high: Number(highs[i].toFixed(decimals)),
                  low: Number(lows[i].toFixed(decimals)),
                  close: Number(closes[i].toFixed(decimals)),
                  volume: Number(volumes[i] || 0),
                });
              }
            }
          }
        }
      } catch (err) {
        console.error('Yahoo candles error:', err);
      }
    }

    if (candles.length > 0) {
      historyCache[cacheKey] = { data: candles, timestamp: now };
      return NextResponse.json({
        symbol: rawSymbol,
        interval: intervalKey,
        candles
      });
    }

    // Fallback: If network is offline, generate a continuous series around baseline
    const fallbackPrice = rawSymbol.includes('GC') || rawSymbol.includes('XAU') ? 4476.60 : 79854.60;
    const dummyCandles: Candle[] = [];
    const baseTime = Math.floor(now / 1000) - 100 * 900;
    let lastClose = fallbackPrice;
    for (let i = 0; i < 80; i++) {
      const open = lastClose;
      const variation = (Math.random() - 0.49) * (fallbackPrice * 0.002);
      const close = open + variation;
      const high = Math.max(open, close) + Math.random() * (fallbackPrice * 0.001);
      const low = Math.min(open, close) - Math.random() * (fallbackPrice * 0.001);
      lastClose = close;
      dummyCandles.push({
        time: baseTime + i * 900,
        open: Number(open.toFixed(2)),
        high: Number(high.toFixed(2)),
        low: Number(low.toFixed(2)),
        close: Number(close.toFixed(2)),
      });
    }

    return NextResponse.json({
      symbol: rawSymbol,
      interval: intervalKey,
      candles: dummyCandles
    });
  } catch (error) {
    console.error('Market history API error:', error);
    return NextResponse.json({ error: 'Failed to fetch history', candles: [] }, { status: 500 });
  }
}

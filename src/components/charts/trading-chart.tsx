'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import {
  createChart,
  type IChartApi,
  type ISeriesApi,
  ColorType,
  CrosshairMode,
  type CandlestickData,
  type HistogramData,
  type LineData,
  type Time,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
} from 'lightweight-charts';

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface ChartDataPoint {
  time: Time;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface TradingChartProps {
  data: ChartDataPoint[];
  symbol?: string;
  indicators?: {
    sma20?: boolean;
    sma50?: boolean;
    ema20?: boolean;
    volume?: boolean;
  };
  entryLine?: number;
  stopLossLine?: number;
  takeProfitLine?: number;
  height?: number;
}

// ─── SMA/EMA CALCULATION ─────────────────────────────────────────────────────

function calculateSMA(data: ChartDataPoint[], period: number): LineData[] {
  const result: LineData[] = [];
  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      sum += data[j].close;
    }
    result.push({ time: data[i].time, value: sum / period });
  }
  return result;
}

function calculateEMA(data: ChartDataPoint[], period: number): LineData[] {
  const result: LineData[] = [];
  const multiplier = 2 / (period + 1);
  let ema = data.slice(0, period).reduce((sum, d) => sum + d.close, 0) / period;
  result.push({ time: data[period - 1].time, value: ema });
  for (let i = period; i < data.length; i++) {
    ema = (data[i].close - ema) * multiplier + ema;
    result.push({ time: data[i].time, value: ema });
  }
  return result;
}

// ─── CHART COMPONENT ─────────────────────────────────────────────────────────

export const TradingChart: React.FC<TradingChartProps> = ({
  data,
  indicators = { sma20: true, volume: true },
  entryLine,
  stopLossLine,
  takeProfitLine,
  height,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  const initChart = useCallback(() => {
    if (!containerRef.current || data.length === 0) return;

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: height || containerRef.current.clientHeight || 500,
      layout: {
        background: { type: ColorType.Solid, color: '#0B0E12' },
        textColor: '#94A3B8',
        fontSize: 11,
        fontFamily: "'JetBrains Mono', 'SF Mono', monospace",
      },
      grid: {
        vertLines: { color: '#161B22' },
        horzLines: { color: '#161B22' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: '#242A33', width: 1, style: 3, labelBackgroundColor: '#0E1116' },
        horzLine: { color: '#242A33', width: 1, style: 3, labelBackgroundColor: '#0E1116' },
      },
      timeScale: {
        borderColor: '#242A33',
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 5,
        barSpacing: 8,
      },
      rightPriceScale: {
        borderColor: '#242A33',
        scaleMargins: { top: 0.1, bottom: 0.2 },
      },
    });

    chartRef.current = chart;

    // Candlestick Series (v5 API)
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#22C55E',
      downColor: '#EF4444',
      borderVisible: false,
      wickUpColor: '#22C55E',
      wickDownColor: '#EF4444',
    });

    const candleData: CandlestickData<Time>[] = data.map((d) => ({
      time: d.time,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }));
    candleSeries.setData(candleData);

    // Volume
    if (indicators.volume) {
      const volumeSeries = chart.addSeries(HistogramSeries, {
        priceFormat: { type: 'volume' },
        priceScaleId: '',
      });
      volumeSeries.priceScale().applyOptions({
        scaleMargins: { top: 0.85, bottom: 0 },
      });

      const volumeData: HistogramData<Time>[] = data.map((d) => ({
        time: d.time,
        value: d.volume || 0,
        color: d.close >= d.open ? 'rgba(34, 197, 94, 0.25)' : 'rgba(239, 68, 68, 0.25)',
      }));
      volumeSeries.setData(volumeData);
    }

    // SMA 20
    if (indicators.sma20 && data.length >= 20) {
      const sma20 = chart.addSeries(LineSeries, {
        color: '#a1a1aa',
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });
      sma20.setData(calculateSMA(data, 20));
    }

    // SMA 50
    if (indicators.sma50 && data.length >= 50) {
      const sma50 = chart.addSeries(LineSeries, {
        color: '#64748B',
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });
      sma50.setData(calculateSMA(data, 50));
    }

    // EMA 20
    if (indicators.ema20 && data.length >= 20) {
      const ema20 = chart.addSeries(LineSeries, {
        color: '#F59E0B',
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });
      ema20.setData(calculateEMA(data, 20));
    }

    // Price Lines
    if (entryLine) {
      candleSeries.createPriceLine({
        price: entryLine,
        color: '#e4e4e7',
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: 'Entry',
      });
    }
    if (stopLossLine) {
      candleSeries.createPriceLine({
        price: stopLossLine,
        color: '#EF4444',
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: 'SL',
      });
    }
    if (takeProfitLine) {
      candleSeries.createPriceLine({
        price: takeProfitLine,
        color: '#22C55E',
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: 'TP',
      });
    }

    chart.timeScale().fitContent();
  }, [data, indicators, entryLine, stopLossLine, takeProfitLine, height]);

  useEffect(() => {
    initChart();

    const handleResize = () => {
      if (chartRef.current && containerRef.current) {
        chartRef.current.applyOptions({
          width: containerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [initChart]);

  return (
    <div className="relative w-full h-full min-h-[400px]" ref={containerRef} />
  );
};

// ─── DEMO DATA GENERATOR ─────────────────────────────────────────────────────

export function generateChartData(
  symbol: string,
  timeframe: string = '1H',
  bars: number = 200
): ChartDataPoint[] {
  const data: ChartDataPoint[] = [];
  const now = new Date();

  const basePrices: Record<string, number> = {
    'BTC/USDT': 104250,
    'ETH/USDT': 4020,
    'AAPL': 231.20,
    'TSLA': 342.12,
    'SPY': 583.50,
    'EUR/USD': 1.0892,
  };

  const basePrice = basePrices[symbol] || 100;
  const volatility = symbol.includes('BTC') ? 0.008 : symbol.includes('ETH') ? 0.01 : symbol === 'EUR/USD' ? 0.001 : 0.005;

  const tfMinutes: Record<string, number> = {
    '1m': 1, '5m': 5, '15m': 15, '30m': 30,
    '1H': 60, '4H': 240, '1D': 1440, '1W': 10080,
  };
  const minutes = tfMinutes[timeframe] || 60;

  let currentPrice = basePrice * (1 + (Math.random() - 0.5) * 0.05);

  for (let i = bars; i >= 0; i--) {
    const date = new Date(now.getTime() - i * minutes * 60 * 1000);
    const timestamp = Math.floor(date.getTime() / 1000) as Time;

    const change = (Math.random() - 0.48) * volatility * currentPrice;
    const open = currentPrice;
    const close = open + change;
    const high = Math.max(open, close) + Math.random() * volatility * currentPrice * 0.5;
    const low = Math.min(open, close) - Math.random() * volatility * currentPrice * 0.5;
    const volume = Math.floor(Math.random() * 1000000 + 100000);

    data.push({
      time: timestamp,
      open: parseFloat(open.toFixed(symbol === 'EUR/USD' ? 4 : 2)),
      high: parseFloat(high.toFixed(symbol === 'EUR/USD' ? 4 : 2)),
      low: parseFloat(low.toFixed(symbol === 'EUR/USD' ? 4 : 2)),
      close: parseFloat(close.toFixed(symbol === 'EUR/USD' ? 4 : 2)),
      volume,
    });

    currentPrice = close;
  }

  return data;
}

export default TradingChart;

'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Activity } from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';
import { DashboardData } from '../types';

interface EquityCurveCardProps {
  data: DashboardData;
}

export function EquityCurveCard({ data }: EquityCurveCardProps) {
  const [chartRange, setChartRange] = useState<'1W' | '1M' | '3M' | 'ALL'>('ALL');
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);

  if (data.totalTrades === 0) {
    return (
      <Card className="lg:col-span-3 p-7 flex flex-col justify-between relative overflow-hidden neu-raised rounded-[32px] bg-[#E0E5EC]">
        <div className="flex flex-col items-center justify-center h-[260px] text-center p-6 space-y-2">
          <div className="w-12 h-12 rounded-full bg-[#E0E5EC] neu-inset flex items-center justify-center text-[#6C63FF] mb-2">
            <Activity className="w-6 h-6" />
          </div>
          <span className="text-base font-bold text-[#2D3748] font-heading">No Trading Activity Yet</span>
          <p className="text-xs text-[#4A5568] max-w-md leading-relaxed font-body">
            Connect your account or import trades to generate your cumulative equity curve and performance progression.
          </p>
        </div>
      </Card>
    );
  }

  const rawDailyList = data?.dailyPnl || [];
  let dailyPnlList = rawDailyList;
  if (chartRange === '1W') dailyPnlList = rawDailyList.slice(-7);
  else if (chartRange === '1M') dailyPnlList = rawDailyList.slice(-30);
  else if (chartRange === '3M') dailyPnlList = rawDailyList.slice(-90);

  const baseBalance = data?.startingBalance || 2000;

  const chartPoints = dailyPnlList.length > 0 ? [
    { date: dailyPnlList[0].date, balance: baseBalance, pnl: 0, dayPnl: 0 },
    ...dailyPnlList.map((d: any) => ({
      date: d.date,
      balance: baseBalance + (d.cumulativePnl || 0),
      pnl: d.cumulativePnl || 0,
      dayPnl: d.pnl || 0,
    }))
  ] : [
    { date: 'Initial', balance: baseBalance, pnl: 0, dayPnl: 0 },
    { date: 'Current', balance: baseBalance, pnl: 0, dayPnl: 0 }
  ];

  const balances = chartPoints.map(p => p.balance);
  const pnls = chartPoints.map(p => p.pnl);
  const minB = Math.min(...balances);
  const maxB = Math.max(...balances);
  const bRange = Math.max(40, maxB - minB);
  const yMin = Math.floor((minB - bRange * 0.1) / 20) * 20;
  const yMax = Math.ceil((maxB + bRange * 0.1) / 20) * 20;

  const total = chartPoints.length;
  const getX = (i: number) => total > 1 ? 55 + (i / (total - 1)) * 540 : 55;
  const getY = (val: number) => (yMax === yMin) ? 112 : 195 - ((val - yMin) / (yMax - yMin)) * 165;

  const balancePathD = `M ${chartPoints.map((p, i) => `${getX(i).toFixed(1)} ${getY(p.balance).toFixed(1)}`).join(' L ')}`;
  const balanceAreaD = `${balancePathD} L ${getX(total - 1).toFixed(1)} 200 L 55 200 Z`;

  const gridLevels = [0, 1, 2, 3, 4].map(idx => {
    const val = yMin + (idx / 4) * (yMax - yMin);
    const y = getY(val);
    return { val: Math.round(val), y };
  });

  const monthMarkers: Array<{ label: string; x: number }> = [];
  let lastSeen = '';
  chartPoints.forEach((p, idx) => {
    if (p.date && p.date.includes('-')) {
      const parts = p.date.split('-');
      const mStr = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 1).toLocaleString('default', { month: 'short' });
      if (mStr !== lastSeen) {
        lastSeen = mStr;
        monthMarkers.push({ label: mStr, x: getX(idx) });
      }
    }
  });
  if (monthMarkers.length === 0) {
    monthMarkers.push({ label: 'Initial', x: 55 }, { label: 'Current', x: 595 });
  }

  const activeIndex = (hoveredPointIndex !== null && hoveredPointIndex >= 0 && hoveredPointIndex < total)
    ? hoveredPointIndex
    : total - 1;

  const activePoint = chartPoints[activeIndex];
  const activeX = getX(activeIndex);
  const activeBalanceY = getY(activePoint.balance);
  const pctX = (activeX / 620) * 100;
  const isRightSide = activeX > 370;

  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const relX = (mouseX / rect.width) * 620;
    const clampedX = Math.max(55, Math.min(595, relX));
    const ratio = (clampedX - 55) / 540;
    const nearestIdx = Math.round(ratio * (total - 1));
    setHoveredPointIndex(nearestIdx);
  };

  const handleSvgMouseLeave = () => {
    setHoveredPointIndex(null);
  };

  return (
    <Card className="lg:col-span-3 p-7 flex flex-col justify-between relative overflow-hidden neu-raised rounded-[32px] bg-[#E0E5EC]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-base font-bold text-[#2D3748] font-heading tracking-wide">Account Growth</span>
          {/* Legend */}
          <div className="flex items-center gap-2 text-xs">
            <span className="h-2.5 w-2.5 rounded-full bg-[#6C63FF]"></span>
            <span className="text-[#4A5568] font-body text-xs font-medium">Account Balance</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Range Selector Chips */}
          <div className="flex items-center p-1 rounded-[18px] bg-[#E0E5EC] neu-inset-sm text-xs gap-0.5">
            {(['1W', '1M', '3M', 'ALL'] as const).map(rng => (
              <button
                key={rng}
                type="button"
                onClick={() => { setChartRange(rng); setHoveredPointIndex(null); }}
                className={cn(
                  "px-3 py-1 rounded-[14px] font-mono text-xs font-semibold transition-all cursor-pointer",
                  chartRange === rng
                    ? "bg-[#6C63FF] text-white shadow-sm font-bold"
                    : "text-[#4A5568] hover:text-[#2D3748]"
                )}
              >
                {rng}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="relative w-full h-[260px] mt-2 select-none overflow-hidden">
        <svg 
          className="w-full h-full cursor-crosshair" 
          viewBox="0 0 620 240" 
          fill="none" 
          preserveAspectRatio="none"
          onMouseMove={handleSvgMouseMove}
          onMouseLeave={handleSvgMouseLeave}
          onTouchMove={(e) => {
            if (e.touches.length > 0) {
              const touch = e.touches[0];
              const svg = e.currentTarget;
              const rect = svg.getBoundingClientRect();
              const relX = ((touch.clientX - rect.left) / rect.width) * 620;
              const clampedX = Math.max(55, Math.min(595, relX));
              const ratio = (clampedX - 55) / 540;
              setHoveredPointIndex(Math.round(ratio * (total - 1)));
            }
          }}
          onTouchEnd={handleSvgMouseLeave}
        >
          <defs>
            {/* BehaviorGuard Violet Wave Gradient */}
            <linearGradient id="balanceWaveGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#6C63FF" stopOpacity="0.25" />
              <stop offset="60%" stopColor="#6C63FF" stopOpacity="0.04" />
              <stop offset="100%" stopColor="#E0E5EC" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal Grid Lines */}
          {gridLevels.map((lvl) => (
            <g key={lvl.val}>
              <line x1="50" y1={lvl.y} x2="600" y2={lvl.y} stroke="rgba(163, 177, 198, 0.35)" strokeWidth="1" strokeDasharray="3 3" />
              <text x="45" y={lvl.y + 3} fill="#718096" fontSize="10" fontFamily="monospace" textAnchor="end">
                ${lvl.val.toLocaleString()}
              </text>
            </g>
          ))}

          {/* Balance Area Fill & Spline Curve */}
          <path d={balanceAreaD} fill="url(#balanceWaveGrad)" />
          <path 
            d={balancePathD} 
            stroke="#6C63FF" 
            strokeWidth="2.5" 
            strokeLinecap="round"
          />

          {/* Gliding Vertical Needle at Active Point */}
          <line 
            x1={activeX} 
            y1="20" 
            x2={activeX} 
            y2="200" 
            stroke="rgba(108, 99, 255, 0.45)" 
            strokeWidth="1.5" 
            strokeDasharray="3 3" 
            className="transition-all duration-75" 
          />
          <circle 
            cx={activeX} 
            cy={activeBalanceY} 
            r="5" 
            fill="#6C63FF" 
            stroke="#E0E5EC" 
            strokeWidth="2.5" 
            className="transition-all duration-75 shadow-md" 
          />

          {/* X-Axis Month Labels */}
          {monthMarkers.map((item, idx) => (
            <text 
              key={idx} 
              x={item.x} 
              y="222" 
              fill="#4A5568" 
              fontSize="10" 
              fontWeight="600"
              fontFamily="monospace" 
              textAnchor="middle"
            >
              {item.label}
            </text>
          ))}
        </svg>

        {/* Dynamic Floating HUD Tooltip */}
        <div 
          className="absolute top-2.5 p-3.5 rounded-[22px] bg-[#E0E5EC] neu-raised border border-[#A0AEC0]/30 shadow-2xl min-w-[210px] z-20 pointer-events-none transition-[left,transform] duration-100 ease-out font-heading"
          style={{
            left: `${Math.max(5, Math.min(95, pctX))}%`,
            transform: isRightSide ? 'translateX(calc(-100% - 14px))' : 'translateX(14px)',
          }}
        >
          {/* Top Bar: Date & Live Status Pill */}
          <div className="flex items-center justify-between gap-3 pb-2 mb-2 border-b border-[#A0AEC0]/25">
            <span className="text-xs font-bold text-[#2D3748] tracking-tight font-mono">
              {activePoint.date}
            </span>
            <span className="flex items-center gap-1.5 text-xs font-bold px-2 py-0.5 rounded-[14px] font-mono neu-inset-sm text-[#6C63FF]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#6C63FF]" />
              {hoveredPointIndex !== null ? 'Inspector' : 'Live'}
            </span>
          </div>

          {/* Total Balance Metric */}
          <div className="flex items-center justify-between text-xs py-1">
            <span className="flex items-center gap-1.5 text-[#4A5568] font-medium font-body">
              <span className="h-1.5 w-1.5 rounded-full bg-[#6C63FF]"></span>
              <span>Total Balance:</span>
            </span>
            <span className="font-mono font-extrabold text-[#2D3748] tracking-tight text-[13px]">
              {formatCurrency(activePoint.balance)}
            </span>
          </div>

          {/* Cumulative P&L Metric */}
          <div className="flex items-center justify-between text-xs py-1">
            <span className="flex items-center gap-1.5 text-[#4A5568] font-medium font-body">
              <span className={cn("h-1.5 w-1.5 rounded-full", activePoint.pnl >= 0 ? "bg-[#38B2AC]" : "bg-[#FF6B6B]")}></span>
              <span>Cumulative P&L:</span>
            </span>
            <span className={cn(
              "font-mono font-extrabold text-[13px]",
              activePoint.pnl >= 0 ? "text-[#38B2AC]" : "text-[#FF6B6B]"
            )}>
              {activePoint.pnl >= 0 ? '+' : ''}{formatCurrency(activePoint.pnl)}
            </span>
          </div>

          {/* Day Change / Session Delta */}
          {activePoint.dayPnl !== undefined && activePoint.dayPnl !== 0 && (
            <div className="flex items-center justify-between text-xs text-[#4A5568] pt-1.5 border-t border-[#A0AEC0]/25 mt-1 font-body">
              <span className="text-xs text-[#4A5568]">Day Change:</span>
              <span className={cn("font-mono font-bold text-xs", activePoint.dayPnl >= 0 ? "text-[#38B2AC]" : "text-[#FF6B6B]")}>
                {activePoint.dayPnl >= 0 ? '+' : ''}{formatCurrency(activePoint.dayPnl)}
              </span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

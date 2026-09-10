'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { 
  AlertTriangle, 
  Info, 
  ArrowUpRight, 
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Sliders,
  Shield,
  Activity,
  CheckCircle2,
  Calendar as CalendarIcon,
  TrendingUp,
  TrendingDown,
  FileText,
  Clock,
  Layers
} from 'lucide-react';
import { formatCurrency, getPnlColor, cn } from '@/lib/utils';

// Clean dusky candlestick sparkline
function MiniCandleSparkline({ isPositive = true, neutral = false }: { isPositive?: boolean; neutral?: boolean }) {
  const color = neutral ? '#71717a' : (isPositive ? '#10b981' : '#ef4444');
  return (
    <svg className="w-16 h-10 shrink-0 filter drop-shadow-[0_0_6px_rgba(0,0,0,0.5)]" viewBox="0 0 64 40" fill="none">
      <line x1="8" y1="16" x2="8" y2="34" stroke={color} strokeWidth="1.2" opacity="0.6" />
      <rect x="5.5" y="20" width="5" height="9" fill={color} rx="1" />
      
      <line x1="20" y1="10" x2="20" y2="30" stroke={color} strokeWidth="1.2" opacity="0.6" />
      <rect x="17.5" y="15" width="5" height="10" fill={color} rx="1" />
      
      <line x1="32" y1="6" x2="32" y2="28" stroke={color} strokeWidth="1.2" opacity="0.6" />
      <rect x="29.5" y="10" width="5" height="12" fill={color} rx="1" />
      
      <line x1="44" y1="14" x2="44" y2="34" stroke={color} strokeWidth="1.2" opacity="0.6" />
      <rect x="41.5" y="18" width="5" height="9" fill={color} rx="1" />
      
      <line x1="56" y1="4" x2="56" y2="24" stroke={color} strokeWidth="1.2" opacity="0.6" />
      <rect x="53.5" y="6" width="5" height="13" fill={color} rx="1" />
    </svg>
  );
}

// May 2025 Calendar Day Data for TradeZella Heatmap
// (May 1, 2025 was a Thursday; 31 days)
interface CalendarDay {
  day: number;
  weekday: number; // 0=Sun, 1=Mon, ..., 6=Sat
  traded: boolean;
  pnl?: number;
  grossProfit?: number;
  grossLoss?: number;
  trades?: number;
  wins?: number;
  losses?: number;
  pnlPercent?: number;
  rMultiple?: number;
  symbols?: string[];
}

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [centerView, setCenterView] = useState<'chart' | 'radar'>('chart');
  const [chartRange, setChartRange] = useState<'1W' | '1M' | '3M' | 'ALL'>('ALL');
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);
  const [heatmapUnit, setHeatmapUnit] = useState<'$' | '%' | 'R'>('$');
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);
  const [bottomTab, setBottomTab] = useState<'heatmap' | 'journal'>('heatmap');
  const [rawCalendarDays, setRawCalendarDays] = useState<any[]>([]);
  const [selectedYearMonth, setSelectedYearMonth] = useState<{ year: number; month: number }>({
    year: new Date().getFullYear(),
    month: new Date().getMonth(),
  });

  useEffect(() => {
    fetch('/api/dashboard/stats', { cache: 'no-store' })
      .then(r => r.json())
      .then(res => {
        if (res.account && res.stats) {
          const calDays = res.calendarDays || [];
          setRawCalendarDays(calDays);

          if (calDays.length > 0) {
            const firstDateObj = new Date(calDays[0].date);
            setSelectedYearMonth({
              year: firstDateObj.getFullYear(),
              month: firstDateObj.getMonth(),
            });
          }

          const hasTrades = (res.stats.totalTrades || 0) > 0;

          setData({
            balance: res.account.balance,
            equity: res.account.equity,
            startingBalance: res.account.startingBalance || 2000,
            todaysPnl: hasTrades ? res.account.totalPnl : 0,
            totalTrades: res.stats.totalTrades || 0,
            winRate: hasTrades ? res.stats.winRate : 0,
            profitFactor: hasTrades ? res.stats.profitFactor : 0,
            dailyPnl: res.stats.dailyPnl || [],
            behaviorScore: {
              total: hasTrades ? (res.behaviorScore?.overall || 100) : 100,
              status: hasTrades ? ((res.behaviorScore?.overall || 100) >= 80 ? 'Disciplined' : 'Needs Work') : 'Clean Slate',
              weeklyChange: 0,
              breakdown: {
                ruleAdherence: hasTrades ? Math.round(res.behaviorScore?.ruleAdherence || 100) : 100,
                riskDiscipline: hasTrades ? Math.round(res.behaviorScore?.riskDiscipline || 100) : 100,
                fomoControl: hasTrades ? Math.round(res.behaviorScore?.fomoControl || 100) : 100,
                revengeTrading: hasTrades ? Math.round(res.behaviorScore?.revengeControl || 100) : 100,
                overtrading: hasTrades ? Math.round(res.behaviorScore?.overtradingControl || 100) : 100,
                consistency: hasTrades ? Math.round(res.behaviorScore?.consistency || 100) : 100,
              }
            },
            riskMetrics: res.riskMetrics || {
              dailyLossUsed: 0.00,
              dailyLossLimit: 40.00,
              dailyLossPercent: 0,
              maxDrawdownUsed: 0,
              maxDrawdownLimit: 200.00,
              maxDrawdownPercent: 0,
              tradesToday: 0,
              maxTradesPerDay: 5,
              capitalAtRiskPercent: 0.75,
              maxRiskPerTrade: 1.0,
              ruleViolations: 0,
            },
            recentTrades: res.recentTrades || [],
          });
        }
      })
      .catch(err => {
        console.warn('Dashboard fetch fallback:', err);
        setData({
          balance: 2000.00,
          equity: 2000.00,
          startingBalance: 2000.00,
          todaysPnl: 0,
          totalTrades: 0,
          winRate: 0,
          profitFactor: 0,
          dailyPnl: [],
          behaviorScore: {
            total: 100,
            status: 'Clean Slate',
            weeklyChange: 0,
            breakdown: {
              ruleAdherence: 100,
              riskDiscipline: 100,
              fomoControl: 100,
              revengeTrading: 100,
              overtrading: 100,
              consistency: 100,
            }
          },
          riskMetrics: {
            dailyLossUsed: 0.00,
            dailyLossLimit: 40.00,
            dailyLossPercent: 0,
            maxDrawdownUsed: 0,
            maxDrawdownLimit: 200.00,
            maxDrawdownPercent: 0,
            tradesToday: 0,
            maxTradesPerDay: 5,
            capitalAtRiskPercent: 0.75,
            maxRiskPerTrade: 1.0,
            ruleViolations: 0,
          },
          recentTrades: []
        });
      });
  }, []);

  // Compute month days for current selected month
  const activeYear = selectedYearMonth.year;
  const activeMonth = selectedYearMonth.month;
  const daysInMonth = new Date(activeYear, activeMonth + 1, 0).getDate();
  const firstDayWeekday = new Date(activeYear, activeMonth, 1).getDay();

  const currentMonthDays: CalendarDay[] = Array.from({ length: daysInMonth }, (_, i) => {
    const d = i + 1;
    const dateStr = `${activeYear}-${String(activeMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const match = rawCalendarDays.find(c => c.date === dateStr);
    const weekday = new Date(activeYear, activeMonth, d).getDay();
    if (match) {
      return {
        day: d,
        weekday,
        traded: true,
        pnl: match.pnl,
        grossProfit: match.grossProfit,
        grossLoss: match.grossLoss,
        trades: match.trades,
        wins: match.wins,
        losses: match.losses,
        pnlPercent: match.pnlPercent,
        rMultiple: match.rMultiple,
        symbols: match.symbols,
      };
    }
    return {
      day: d,
      weekday,
      traded: false,
    };
  });

  const monthTradedDays = currentMonthDays.filter(d => d.traded);
  const monthWinDays = monthTradedDays.filter(d => (d.pnl || 0) > 0);
  const monthLossDays = monthTradedDays.filter(d => (d.pnl || 0) < 0);
  const monthNetPnl = Number(monthTradedDays.reduce((sum, d) => sum + (d.pnl || 0), 0).toFixed(2));
  const monthWins = monthTradedDays.reduce((sum, d) => sum + (d.wins || 0), 0);
  const monthLosses = monthTradedDays.reduce((sum, d) => sum + (d.losses || 0), 0);
  const monthWinRate = (monthWins + monthLosses) > 0 ? ((monthWins / (monthWins + monthLosses)) * 100).toFixed(1) : '0.0';
  const monthGrossProfit = Number(monthTradedDays.reduce((s, d) => s + (d.grossProfit !== undefined ? d.grossProfit : ((d.pnl || 0) > 0 ? (d.pnl || 0) : 0)), 0).toFixed(2));
  const monthGrossLoss = Number(monthTradedDays.reduce((s, d) => s + (d.grossLoss !== undefined ? d.grossLoss : ((d.pnl || 0) < 0 ? Math.abs(d.pnl || 0) : 0)), 0).toFixed(2));
  const monthProfitFactor = monthGrossLoss === 0 ? (monthGrossProfit > 0 ? '∞' : '0.00') : (monthGrossProfit / monthGrossLoss).toFixed(2);
  const monthTitle = new Date(activeYear, activeMonth, 1).toLocaleString('default', { month: 'long', year: 'numeric' });

  const handlePrevMonth = () => {
    setSelectedDay(null);
    setSelectedYearMonth(prev => prev.month === 0 ? { year: prev.year - 1, month: 11 } : { year: prev.year, month: prev.month - 1 });
  };

  const handleNextMonth = () => {
    setSelectedDay(null);
    setSelectedYearMonth(prev => prev.month === 11 ? { year: prev.year + 1, month: 0 } : { year: prev.year, month: prev.month + 1 });
  };

  // Format value based on TradeZella unit toggle with strict positive/negative signs
  const formatHeatmapVal = (d: CalendarDay) => {
    if (!d.traded) return '';
    const pnl = d.pnl || 0;
    const absVal = Math.abs(pnl).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (heatmapUnit === '$') {
      return pnl >= 0 ? `+$${absVal}` : `-$${absVal}`;
    }
    if (heatmapUnit === '%') {
      const pct = d.pnlPercent || 0;
      return `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
    }
    const r = d.rMultiple || 0;
    return `${r >= 0 ? '+' : ''}${r.toFixed(1)}R`;
  };

  if (!data) return (
    <div className="flex h-[400px] items-center justify-center font-mono text-sm text-slate-400">
      <div className="flex items-center gap-3">
        <div className="h-4 w-4 rounded-full border-2 border-neutral-600 border-t-transparent animate-spin" />
        <span>Loading dashboard...</span>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-6 max-w-[1600px] mx-auto pb-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-neutral-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400 font-mono">Trading Terminal</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Trading Dashboard & Performance</h1>
        </div>

      </div>

      {/* Top Row: 3 Financial Metrics Cards (Account Balance, Equity, Cumulative Realized P&L) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Account Balance */}
        <Card className="p-5 flex flex-col justify-between hover:border-neutral-700 transition-all group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-neutral-400">Balance</span>
            <span className="text-[11px] font-semibold text-neutral-300 bg-[#161616] border border-[#262626] px-2.5 py-0.5 rounded-full flex items-center gap-0.5 font-mono">
              {data.totalTrades > 0 ? `${data.todaysPnl >= 0 ? '+' : ''}${((data.todaysPnl / (data.startingBalance || 2000)) * 100).toFixed(1)}% from $2k` : 'No trades yet'}
            </span>
          </div>
          <div className="flex items-end justify-between">
            <div className="text-2xl lg:text-3xl font-bold font-mono tracking-tight text-white">
              {formatCurrency(data.balance)}
            </div>
            <MiniCandleSparkline neutral={true} />
          </div>
        </Card>

        {/* Card 2: Equity */}
        <Card className="p-5 flex flex-col justify-between hover:border-neutral-700 transition-all group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-neutral-400">Equity</span>
            <span className="text-[11px] font-semibold text-neutral-300 bg-[#161616] border border-[#262626] px-2.5 py-0.5 rounded-full flex items-center gap-0.5 font-mono">
              100% Capital
            </span>
          </div>
          <div className="flex items-end justify-between">
            <div className="text-2xl lg:text-3xl font-bold font-mono tracking-tight text-white">
              {formatCurrency(data.equity)}
            </div>
            <MiniCandleSparkline neutral={true} />
          </div>
        </Card>

        {/* Card 3: Cumulative Realized Profit / Loss */}
        <Card className="p-5 flex flex-col justify-between hover:border-neutral-700 transition-all group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-neutral-400">Total Profit/Loss</span>
            <span className="text-[11px] font-semibold text-neutral-300 bg-[#161616] border border-[#262626] px-2.5 py-0.5 rounded-full flex items-center gap-0.5 font-mono">
              {data.totalTrades} Trades
            </span>
          </div>
          <div className="flex items-end justify-between">
            <div className={cn("text-2xl lg:text-3xl font-bold font-mono tracking-tight", getPnlColor(data.todaysPnl))}>
              {data.todaysPnl > 0 ? '+' : ''}{formatCurrency(data.todaysPnl)}
            </div>
            <MiniCandleSparkline isPositive={data.todaysPnl >= 0} />
          </div>
        </Card>
      </div>

      {/* Middle Row: Total Revenue Wave Chart & Universal Broker/Prop Firm Risk Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Left Panel (60% width): Total Revenue Spline Wave Chart */}
        <Card className="lg:col-span-3 p-6 flex flex-col justify-between relative overflow-hidden">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
            <div className="flex flex-wrap items-center gap-4">
              <span className="text-base font-bold text-white tracking-wide">Account Growth</span>
              {/* Legend */}
              <div className="flex items-center gap-2 text-xs">
                <span className="h-2 w-2 rounded-full bg-white"></span>
                <span className="text-neutral-400 font-mono text-xs">Account Balance</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Range Selector Chips */}
              <div className="flex items-center p-0.5 rounded-xl bg-black/30 border border-white/10 text-xs">
                {(['1W', '1M', '3M', 'ALL'] as const).map(rng => (
                  <button
                    key={rng}
                    type="button"
                    onClick={() => { setChartRange(rng); setHoveredPointIndex(null); }}
                    className={cn(
                      "px-2.5 py-1 rounded-lg font-mono text-[11px] font-semibold transition-all cursor-pointer",
                      chartRange === rng
                        ? "bg-[#2a2a2a] text-white shadow-sm font-bold"
                        : "text-slate-400 hover:text-white"
                    )}
                  >
                    {rng}
                  </button>
                ))}
              </div>

              <button 
                onClick={() => setCenterView(centerView === 'chart' ? 'radar' : 'chart')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/10 border border-white/10 text-slate-400 text-xs font-medium hover:text-white hover:bg-white/[0.06] transition-colors"
                title="Toggle Behavioral Radar view"
              >
                <Sliders className="h-3 w-3 text-neutral-400" />
                <span>{centerView === 'chart' ? 'Score Breakdown' : 'Equity Curve'}</span>
              </button>
            </div>
          </div>

          {centerView === 'chart' ? (() => {
            if (data.totalTrades === 0) {
              return (
                <div className="flex flex-col items-center justify-center h-[260px] text-center p-6 space-y-2">
                  <Activity className="w-10 h-10 text-[#2a2a2a] opacity-50 mb-1" />
                  <span className="text-sm font-bold text-white tracking-wide">No Trading Activity Yet</span>
                  <p className="text-xs text-slate-400 max-w-md leading-relaxed">
                    Import your MT5 or Excel statement in Accounts to visualize your cumulative equity curve and performance progression.
                  </p>
                </div>
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

            const minPnl = Math.min(...pnls, 0);
            const maxPnl = Math.max(...pnls, 10);
            const pnlRange = Math.max(20, maxPnl - minPnl);

            const total = chartPoints.length;
            const getX = (i: number) => total > 1 ? 55 + (i / (total - 1)) * 540 : 55;
            const getY = (val: number) => (yMax === yMin) ? 112 : 195 - ((val - yMin) / (yMax - yMin)) * 165;
            const getPnlY = (val: number) => 195 - ((val - minPnl) / pnlRange) * 120;

            const balancePathD = `M ${chartPoints.map((p, i) => `${getX(i).toFixed(1)} ${getY(p.balance).toFixed(1)}`).join(' L ')}`;
            const balanceAreaD = `${balancePathD} L ${getX(total - 1).toFixed(1)} 200 L 55 200 Z`;

            const pnlPathD = `M ${chartPoints.map((p, i) => `${getX(i).toFixed(1)} ${getPnlY(p.pnl).toFixed(1)}`).join(' L ')}`;
            const pnlAreaD = `${pnlPathD} L ${getX(total - 1).toFixed(1)} 200 L 55 200 Z`;

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
            const activePnlY = getPnlY(activePoint.pnl);
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
                    {/* Dusky Monochrome Equity Curve Gradient */}
                    <linearGradient id="balanceWaveGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#ffffff" stopOpacity="0.09" />
                      <stop offset="60%" stopColor="#a1a1aa" stopOpacity="0.02" />
                      <stop offset="100%" stopColor="#000000" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Grid Lines */}
                  {gridLevels.map((lvl) => (
                    <g key={lvl.val}>
                      <line x1="50" y1={lvl.y} x2="600" y2={lvl.y} stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
                      <text x="45" y={lvl.y + 3} fill="#71717a" fontSize="10" fontFamily="monospace" textAnchor="end">
                        ${lvl.val.toLocaleString()}
                      </text>
                    </g>
                  ))}

                  {/* Balance Area Fill & Spline Curve */}
                  <path d={balanceAreaD} fill="url(#balanceWaveGrad)" />
                  <path 
                    d={balancePathD} 
                    stroke="#ededed" 
                    strokeWidth="2" 
                    strokeLinecap="round"
                    className="filter drop-shadow-[0_0_6px_rgba(255,255,255,0.12)]"
                  />

                  {/* Gliding Vertical Needle at Active Point */}
                  <line 
                    x1={activeX} 
                    y1="20" 
                    x2={activeX} 
                    y2="200" 
                    stroke="rgba(255,255,255,0.3)" 
                    strokeWidth="1" 
                    strokeDasharray="3 3" 
                    className="transition-all duration-75" 
                  />
                  <circle 
                    cx={activeX} 
                    cy={activeBalanceY} 
                    r="4.5" 
                    fill="#ffffff" 
                    stroke="#0a0a0a" 
                    strokeWidth="2" 
                    className="filter drop-shadow-[0_0_6px_rgba(255,255,255,0.4)] transition-all duration-75" 
                  />

                  {/* X-Axis Month Labels */}
                  {monthMarkers.map((item, idx) => (
                    <text 
                      key={idx} 
                      x={item.x} 
                      y="222" 
                      fill="#71717a" 
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
                  className="absolute top-2.5 p-3 rounded-xl bg-[#111111]/95 border border-[#262626] shadow-2xl backdrop-blur-xl min-w-[200px] z-20 pointer-events-none transition-[left,transform] duration-100 ease-out"
                  style={{
                    left: `${Math.max(5, Math.min(95, pctX))}%`,
                    transform: isRightSide ? 'translateX(calc(-100% - 14px))' : 'translateX(14px)',
                  }}
                >
                  {/* Top Bar: Date & Live Status Pill */}
                  <div className="flex items-center justify-between gap-3 pb-2 mb-2 border-b border-[#222222]">
                    <span className="text-xs font-bold text-white tracking-tight font-mono">
                      {activePoint.date}
                    </span>
                    <span className="flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full font-mono border bg-[#181818] text-neutral-300 border-[#2a2a2a]">
                      <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
                      {hoveredPointIndex !== null ? 'Inspector' : 'Live'}
                    </span>
                  </div>

                  {/* Total Balance Metric */}
                  <div className="flex items-center justify-between text-xs py-1">
                    <span className="flex items-center gap-1.5 text-neutral-400 font-medium">
                      <span className="h-1.5 w-1.5 rounded-full bg-white"></span>
                      <span>Total Balance:</span>
                    </span>
                    <span className="font-mono font-bold text-white tracking-tight text-[13px]">
                      {formatCurrency(activePoint.balance)}
                    </span>
                  </div>

                  {/* Cumulative P&L Metric */}
                  <div className="flex items-center justify-between text-xs py-1">
                    <span className="flex items-center gap-1.5 text-neutral-400 font-medium">
                      <span className={cn("h-1.5 w-1.5 rounded-full", activePoint.pnl >= 0 ? "bg-emerald-400" : "bg-rose-400")}></span>
                      <span>Cumulative P&L:</span>
                    </span>
                    <span className={cn(
                      "font-mono font-bold text-[13px]",
                      activePoint.pnl >= 0 ? "text-emerald-400" : "text-rose-400"
                    )}>
                      {activePoint.pnl >= 0 ? '+' : ''}{formatCurrency(activePoint.pnl)}
                    </span>
                  </div>

                  {/* Day Change / Session Delta (if available) */}
                  {activePoint.dayPnl !== undefined && activePoint.dayPnl !== 0 && (
                    <div className="flex items-center justify-between text-[11px] text-neutral-400 pt-1.5 border-t border-[#222222] mt-1">
                      <span className="text-[10px] text-neutral-400">Day Change:</span>
                      <span className={cn("font-mono font-bold text-[11px]", activePoint.dayPnl >= 0 ? "text-emerald-400" : "text-rose-400")}>
                        {activePoint.dayPnl >= 0 ? '+' : ''}{formatCurrency(activePoint.dayPnl)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })() : (
            /* Radar / Discipline View */
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-auto items-center py-4">
              <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-black/10 border border-white/10">
                <div className="relative flex items-center justify-center w-28 h-28 mb-2.5">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" stroke="#222222" strokeWidth="8" fill="none" />
                    <circle 
                      cx="50" 
                      cy="50" 
                      r="40" 
                      stroke="url(#dashScoreGrad)" 
                      strokeWidth="8" 
                      strokeDasharray="251.2"
                      strokeDashoffset={251.2 - (251.2 * data.behaviorScore.total) / 100}
                      strokeLinecap="round"
                      fill="none" 
                      className="filter drop-shadow-[0_0_6px_rgba(255,255,255,0.15)]"
                    />
                    <defs>
                      <linearGradient id="dashScoreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#ffffff" />
                        <stop offset="100%" stopColor="#a1a1aa" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold font-mono text-white tracking-tight">{data.behaviorScore.total}</span>
                    <span className="text-[10px] font-semibold text-neutral-400 -mt-1">/ 100</span>
                  </div>
                </div>
                <div className="text-xs font-semibold text-neutral-200">{data.behaviorScore.status}</div>
                <div className="text-[11px] text-neutral-400 font-mono mt-0.5">+{data.behaviorScore.weeklyChange} this week</div>
              </div>

              <div className="md:col-span-2 space-y-2.5">
                {[
                  { label: 'Rule Adherence', val: data.behaviorScore.breakdown.ruleAdherence },
                  { label: 'Risk Discipline', val: data.behaviorScore.breakdown.riskDiscipline },
                  { label: 'FOMO Control', val: data.behaviorScore.breakdown.fomoControl },
                  { label: 'Revenge Trading', val: data.behaviorScore.breakdown.revengeTrading },
                  { label: 'Overtrading', val: data.behaviorScore.breakdown.overtrading },
                  { label: 'Consistency', val: data.behaviorScore.breakdown.consistency },
                ].map((item, i) => (
                  <div key={i} className="flex flex-col gap-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-neutral-300 font-medium">{item.label}</span>
                      <span className="font-mono text-neutral-200 font-semibold">{item.val}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-black/25 border border-white/[0.06] overflow-hidden">
                      <div 
                        className="h-full rounded-full bg-neutral-300 transition-all duration-300" 
                        style={{ width: `${item.val}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* Right Panel (40% width): Risk Limits */}
        <Card className="lg:col-span-2 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-neutral-400" />
                <span className="text-base font-bold text-white tracking-wide">Risk Limits</span>
              </div>
              <span className="text-[10px] font-semibold text-neutral-300 bg-[#161616] border border-[#262626] px-2 py-0.5 rounded-md">
                Limits
              </span>
            </div>

            {/* Risk Capsule 1: Daily Loss Limit */}
            <div className="space-y-3.5">
              <div className="p-3.5 rounded-xl bg-black/10 border border-white/10">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-200 mb-2">
                  <div className="flex items-center gap-1.5">
                    <span>Daily Loss Limit</span>
                    <span className="text-[10px] text-neutral-400 font-normal">(Max daily loss)</span>
                  </div>
                  <div className="h-5 w-5 rounded-full bg-[#161616] border border-[#262626] flex items-center justify-center">
                    <ArrowUpRight className="h-3 w-3 text-neutral-400" />
                  </div>
                </div>
                <div className="h-2.5 w-full rounded-full bg-black/20 border border-white/10 mb-2 overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-gradient-to-r from-neutral-500 to-neutral-300" 
                    style={{ width: `${data.riskMetrics.dailyLossPercent}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-400 font-mono">
                    ${data.riskMetrics.dailyLossUsed.toFixed(2)} / ${data.riskMetrics.dailyLossLimit.toFixed(2)} used ({data.riskMetrics.dailyLossPercent}%)
                  </span>
                  <span className="flex items-center gap-1.5 text-neutral-300 font-semibold bg-[#161616] px-2 py-0.5 rounded-full border border-[#242424] text-[10px]">
                    <span className="h-1.5 w-1.5 rounded-full bg-neutral-400"></span>
                    {data.riskMetrics.dailyLossPercent < 50 ? 'Safe' : 'Warning'}
                  </span>
                </div>
              </div>

              {/* Risk Capsule 2: Max Drawdown Limit */}
              <div className="p-3.5 rounded-xl bg-black/10 border border-white/10">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-200 mb-2">
                  <div className="flex items-center gap-1.5">
                    <span>Max Drawdown Limit</span>
                    <span className="text-[10px] text-neutral-400 font-normal">(Total loss limit)</span>
                  </div>
                  <div className="h-5 w-5 rounded-full bg-[#161616] border border-[#262626] flex items-center justify-center">
                    <ArrowUpRight className="h-3 w-3 text-neutral-400" />
                  </div>
                </div>
                <div className="h-2.5 w-full rounded-full bg-black/20 border border-white/10 mb-2 overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-gradient-to-r from-neutral-500 to-neutral-300" 
                    style={{ width: `${data.riskMetrics.maxDrawdownPercent}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-400 font-mono">
                    ${data.riskMetrics.maxDrawdownUsed.toFixed(2)} / ${data.riskMetrics.maxDrawdownLimit.toFixed(2)} used ({data.riskMetrics.maxDrawdownPercent}%)
                  </span>
                  <span className="flex items-center gap-1.5 text-neutral-300 font-semibold bg-[#161616] px-2 py-0.5 rounded-full border border-[#242424] text-[10px]">
                    <span className="h-1.5 w-1.5 rounded-full bg-neutral-400"></span>
                    {Math.max(0, 100 - data.riskMetrics.maxDrawdownPercent)}% Buffer
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400 pt-1.5 border-t border-white/[0.06] mt-2">
                  <span>Buffer Left:</span>
                  <span className="text-white font-mono font-bold">
                    ${Math.max(0, data.riskMetrics.maxDrawdownLimit - data.riskMetrics.maxDrawdownUsed).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Real-time Account Guard Metrics */}
          <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-white/10">
            <div className="p-2.5 rounded-xl bg-black/10 border border-white/10 flex flex-col">
              <span className="text-[10px] text-neutral-400 font-medium">Trades Today</span>
              <span className="text-sm font-bold font-mono text-white mt-0.5">
                {data.riskMetrics.tradesToday} / {data.riskMetrics.maxTradesPerDay}
              </span>
              <span className="text-[9px] text-neutral-400 mt-0.5">Pace</span>
            </div>

            <div className="p-2.5 rounded-xl bg-black/10 border border-white/10 flex flex-col">
              <span className="text-[10px] text-neutral-400 font-medium">Risk / Trade</span>
              <span className="text-sm font-bold font-mono text-white mt-0.5">
                {data.riskMetrics.capitalAtRiskPercent}%
              </span>
              <span className="text-[9px] text-neutral-400 mt-0.5">&lt; {data.riskMetrics.maxRiskPerTrade}% Max</span>
            </div>

            <div className="p-2.5 rounded-xl bg-black/10 border border-white/10 flex flex-col">
              <span className="text-[10px] text-neutral-400 font-medium">Mistakes</span>
              <span className="text-sm font-bold font-mono text-white mt-0.5">
                {data.riskMetrics.ruleViolations}
              </span>
              <span className="text-[9px] text-neutral-400 mt-0.5">Recorded</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Bottom Row: TradeZella P&L Calendar Heatmap */}
      <Card className="p-6">
        {/* TradeZella Header & Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-white/[0.08]">
          {/* Left: Title & Month Switcher */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-neutral-400" />
              <h3 className="text-base font-bold text-white tracking-wide">P&L Calendar Heatmap</h3>
            </div>

            {/* Month Navigation */}
            <div className="flex items-center gap-1 px-2 py-1 rounded-xl bg-black/10 border border-white/10">
              <button 
                onClick={handlePrevMonth}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                title="Previous Month"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span className="px-2 font-mono text-xs font-semibold text-white min-w-[110px] text-center">
                {monthTitle}
              </span>
              <button 
                onClick={handleNextMonth}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                title="Next Month"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Center: Month Quick Summary (Clean TradeZella ribbon stats) */}
          <div className="flex flex-wrap items-center gap-3 md:gap-5 px-3.5 py-1.5 rounded-xl bg-black/10 border border-white/10 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Net P&L:</span>
              <span className={cn("font-mono font-bold text-sm", monthNetPnl >= 0 ? "text-emerald-400" : "text-rose-400")}>
                {monthNetPnl >= 0 ? '+' : ''}{formatCurrency(monthNetPnl)}
              </span>
            </div>
            <div className="h-3 w-px bg-white/10" />
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Days Traded:</span>
              <span className="font-mono font-bold text-white">{monthTradedDays.length}</span>
            </div>
            <div className="h-3 w-px bg-white/10" />
            <div className="flex items-center gap-1.5">
              <span className="text-neutral-400">Win Rate:</span>
              <span className="font-mono font-bold text-white">{monthWinRate}%</span>
              <span className="text-[11px] text-neutral-400 font-mono">({monthWins}W - {monthLosses}L)</span>
            </div>
            <div className="h-3 w-px bg-white/10" />
            <div className="flex items-center gap-1.5">
              <span className="text-neutral-400">Profit Factor:</span>
              <span className="font-mono font-bold text-white">{monthProfitFactor}</span>
            </div>
          </div>

          {/* Right: TradeZella Unit Toggles ($, %, R) & Tab Switcher */}
          <div className="flex items-center gap-3">
            {/* Currency / Percentage / R-Multiple Switcher */}
            <div className="flex items-center p-0.5 rounded-xl bg-black/15 border border-white/10 text-xs">
              {(['$', '%', 'R'] as const).map((unit) => (
                <button
                  key={unit}
                  onClick={() => setHeatmapUnit(unit)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg font-mono text-xs font-medium transition-colors cursor-pointer",
                    heatmapUnit === unit 
                      ? "bg-[#2a2a2a] text-white shadow-sm font-bold" 
                      : "text-slate-400 hover:text-white"
                  )}
                >
                  {unit}
                </button>
              ))}
            </div>

            {/* View switcher */}
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setBottomTab('heatmap')}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer",
                  bottomTab === 'heatmap'
                    ? "bg-[#1f1f1f] border border-[#2e2e2e] text-white"
                    : "bg-[#111111] border border-[#222222] text-neutral-400 hover:text-white"
                )}
              >
                Calendar Heatmap
              </button>
              <button 
                onClick={() => setBottomTab('journal')}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer",
                  bottomTab === 'journal'
                    ? "bg-[#1f1f1f] border border-[#2e2e2e] text-white"
                    : "bg-[#111111] border border-[#222222] text-neutral-400 hover:text-white"
                )}
              >
                Recent Trades
              </button>
            </div>
          </div>
        </div>

        {bottomTab === 'heatmap' ? (
          data.totalTrades === 0 ? (
            <div className="pt-10 pb-12 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#161616] border border-[#262626] flex items-center justify-center text-neutral-400">
                <CalendarIcon className="w-6 h-6" />
              </div>
              <span className="text-sm font-bold text-white tracking-wide">No Trading Activity Available for Heatmap Analysis</span>
              <p className="text-xs text-neutral-400 max-w-md leading-relaxed">
                Import your MT5 trade history to begin tracking daily performance, win rates, and P&L heatmaps.
              </p>
            </div>
          ) : (
          /* Clean Matte TradeZella Calendar View */
          <div className="pt-5 space-y-4">
            {/* Weekdays Header */}
            <div className="grid grid-cols-7 gap-2.5 text-center">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <span key={d} className="text-xs font-semibold text-neutral-400 uppercase tracking-wider py-1 font-mono">
                  {d}
                </span>
              ))}
            </div>

            {/* Calendar Grid for Selected Month */}
            <div className="grid grid-cols-7 gap-2.5">
              {/* Dynamic Offset for Day 1 weekday of this month */}
              {Array.from({ length: firstDayWeekday }, (_, i) => (
                <div 
                  key={`blank-${i}`} 
                  className="min-h-[96px] rounded-xl p-2.5 bg-[#0a0a0a] border border-[#161616] opacity-30 flex flex-col justify-between"
                >
                  <span className="text-xs font-mono text-neutral-600"></span>
                </div>
              ))}

              {/* Days of Current Month */}
              {currentMonthDays.map((d) => {
                const isSelected = selectedDay?.day === d.day;
                const isProfitable = d.traded && (d.pnl || 0) > 0;

                return (
                  <div
                    key={d.day}
                    onClick={() => d.traded && setSelectedDay(d)}
                    className={cn(
                      "min-h-[96px] rounded-xl p-2.5 flex flex-col justify-between border transition-all cursor-pointer select-none",
                      d.traded 
                        ? "bg-[#111111] border-[#202020] hover:border-[#333333]" 
                        : "bg-[#090909] border-[#161616] opacity-40 hover:opacity-70",
                      isSelected && "ring-1 ring-neutral-400 border-neutral-500"
                    )}
                  >
                    {/* Top Row: Day Number & Trade Count */}
                    <div className="flex items-center justify-between">
                      <span className={cn(
                        "text-xs font-mono font-semibold",
                        d.traded ? "text-neutral-200" : "text-neutral-600"
                      )}>
                        {d.day}
                      </span>

                      {d.traded && (
                        <span className="text-[11px] font-mono text-neutral-400">
                          {d.trades} {d.trades === 1 ? 'trade' : 'trades'}
                        </span>
                      )}
                    </div>

                    {/* Middle Row: Large, Sharp, High-Contrast P&L Number */}
                    {d.traded ? (
                      <div className="my-auto text-center py-1">
                        <div className={cn(
                          "text-base md:text-lg font-bold font-mono tracking-tight",
                          isProfitable ? "text-emerald-400" : "text-rose-400"
                        )}>
                          {formatHeatmapVal(d)}
                        </div>
                        <div className="text-[11px] text-neutral-400 font-mono mt-0.5">
                          {d.wins}W - {d.losses}L
                        </div>
                      </div>
                    ) : (
                      <div className="my-auto text-center py-1">
                        <span className="text-[11px] text-neutral-600 font-mono">No trades</span>
                      </div>
                    )}

                    {/* Bottom Row: Symbol & Session % */}
                    <div className="flex items-center justify-between pt-1 border-t border-white/[0.05] text-[10px] font-mono text-neutral-400">
                      <span className="truncate max-w-[55px] text-neutral-400">
                        {d.traded ? (d.symbols?.[0] || 'Trade') : '—'}
                      </span>
                      {d.traded && d.pnlPercent !== undefined && (
                        <span className={cn(
                          "font-semibold",
                          isProfitable ? "text-emerald-400" : "text-rose-400"
                        )}>
                          {d.pnlPercent >= 0 ? '+' : ''}{d.pnlPercent.toFixed(1)}%
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* TradeZella Session Drilldown Bar (Clean Matte Black Display) */}
            {selectedDay && selectedDay.traded && (
              <div className="mt-4 p-4 rounded-xl bg-black/20 backdrop-blur-[2px] border border-white/10 shadow-md flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="h-11 w-11 rounded-xl flex items-center justify-center border shrink-0 bg-[#161616] border-[#262626]">
                    {(selectedDay.pnl || 0) >= 0 ? <TrendingUp className="h-5 w-5 text-emerald-400" /> : <TrendingDown className="h-5 w-5 text-rose-400" />}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-white font-mono">Day {selectedDay.day} Trading Session</h4>
                      <span className={cn(
                        "text-[10px] font-semibold px-2 py-0.5 rounded border",
                        (selectedDay.pnl || 0) >= 0 ? "bg-[#161616] text-emerald-400 border-[#262626]" : "bg-[#161616] text-rose-400 border-[#262626]"
                      )}>
                        {(selectedDay.pnl || 0) >= 0 ? 'Profitable Day' : 'Drawdown Day'}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-neutral-400 mt-1">
                      <span>Symbols: <span className="text-neutral-200 font-medium">{selectedDay.symbols?.join(', ') || 'XAUUSD'}</span></span>
                      <span>Executions: <span className="text-neutral-200 font-medium">{selectedDay.trades ?? 0} trades</span></span>
                      <span>Win Rate: <span className="text-neutral-200 font-medium">{(selectedDay.trades ?? 0) > 0 ? Math.round(((selectedDay.wins || 0) / (selectedDay.trades || 1)) * 100) : 0}%</span></span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-medium">Session Net P&L</span>
                    <div className={cn(
                      "text-xl font-bold font-mono",
                      (selectedDay.pnl || 0) >= 0 ? "text-emerald-400" : "text-rose-400"
                    )}>
                      {(selectedDay.pnl || 0) >= 0 ? '+' : '-'}${Math.abs(selectedDay.pnl || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-medium">Win / Loss</span>
                    <div className="text-sm font-bold font-mono text-white">
                      {selectedDay.wins}W - {selectedDay.losses}L ({selectedDay.trades} trades)
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          )
        ) : (
          /* Recent Trades Table */
          <div className="pt-4 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/[0.08] text-slate-400 text-left">
                  <th className="pb-3 font-medium">Date</th>
                  <th className="pb-3 font-medium">Symbol</th>
                  <th className="pb-3 font-medium">Direction</th>
                  <th className="pb-3 font-medium">Lot Size</th>
                  <th className="pb-3 font-medium">Hold Time</th>
                  <th className="pb-3 font-medium text-right">P&L</th>
                  <th className="pb-3 font-medium">Rule Breaches</th>
                  <th className="pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {data.recentTrades.map((t: any, i: number) => (
                  <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 font-mono text-slate-300">{t.date}</td>
                    <td className="py-3 font-bold text-white">{t.symbol}</td>
                    <td className="py-3">
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-semibold",
                        t.direction === 'LONG' ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                      )}>
                        {t.direction}
                      </span>
                    </td>
                    <td className="py-3 font-mono text-slate-200 font-semibold">{t.quantity} lots</td>
                    <td className="py-3 font-mono text-slate-300">{t.duration}</td>
                    <td className={cn("py-3 font-mono font-bold text-right", getPnlColor(t.pnl))}>
                      {t.pnl >= 0 ? '+' : ''}{formatCurrency(t.pnl)}
                    </td>
                    <td className="py-3">
                      {t.breaches && t.breaches.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {t.breaches.map((b: string, bi: number) => (
                            <span key={bi} className="px-1.5 py-0.5 rounded bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[10px] font-mono">
                              {b}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-neutral-400 font-mono text-[10px] font-semibold inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-neutral-400" /> Clean Execution
                        </span>
                      )}
                    </td>
                    <td className="py-3">
                      <span className="text-[11px] text-slate-400">{t.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

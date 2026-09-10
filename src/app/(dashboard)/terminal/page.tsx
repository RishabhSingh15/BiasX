'use client';

import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Check, 
  X, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Minimize2,
  Search,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SUPPORTED_SYMBOLS } from '@/components/charts/tradingview-chart';

// Dynamically import TradingView chart to avoid SSR issues
const TradingViewChart = dynamic(
  () => import('@/components/charts/tradingview-chart').then(m => m.TradingViewChart),
  { 
    ssr: false, 
    loading: () => (
      <div className="flex-1 h-full min-h-[540px] flex items-center justify-center text-neutral-400 font-mono text-sm bg-[#0a0a0a] rounded-2xl border border-[#202020]">
        <div className="flex items-center gap-2.5">
          <div className="h-4 w-4 rounded-full border-2 border-neutral-400 border-t-transparent animate-spin" />
          <span>Loading Chart...</span>
        </div>
      </div>
    ) 
  }
);

// Standard contract multipliers for proper lot risk calculation
const SYMBOL_CONTRACT_SIZES: Record<string, { size: number; label: string }> = {
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

const SYMBOL_LIST = Object.entries(SUPPORTED_SYMBOLS).map(([sym, cfg]) => ({
  symbol: sym,
  name: cfg.name,
  defaultPrice: cfg.defaultPrice,
  category: cfg.category,
}));

export default function TerminalPage() {
  const accountBalance = 2137.24; // User's real account balance

  const [selectedSymbol, setSelectedSymbol] = useState('XAU/USD');
  const [direction, setDirection] = useState<'BUY' | 'SELL'>('BUY');
  const [lots, setLots] = useState('0.05');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  const cfg = SUPPORTED_SYMBOLS[selectedSymbol] || SUPPORTED_SYMBOLS['XAU/USD'];
  const decimals = cfg.decimals;

  // Prices: direct user inputs
  const [entryPrice, setEntryPrice] = useState<number>(cfg.defaultPrice);
  const [stopLoss, setStopLoss] = useState<number>(
    Number((cfg.defaultPrice * 0.992).toFixed(decimals))
  );
  const [takeProfit, setTakeProfit] = useState<number>(
    Number((cfg.defaultPrice * 1.020).toFixed(decimals))
  );

  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Helper to recalculate default SL/TP when symbol or direction changes
  const applyDefaultSlTp = useCallback((basePrice: number, dir: 'BUY' | 'SELL', dec: number) => {
    if (dir === 'BUY') {
      setStopLoss(Number((basePrice * 0.992).toFixed(dec)));
      setTakeProfit(Number((basePrice * 1.020).toFixed(dec)));
    } else {
      setStopLoss(Number((basePrice * 1.008).toFixed(dec)));
      setTakeProfit(Number((basePrice * 0.980).toFixed(dec)));
    }
  }, []);

  // Handle symbol change
  const handleSelectSymbol = (symbol: string) => {
    setSelectedSymbol(symbol);
    const symCfg = SUPPORTED_SYMBOLS[symbol] || SUPPORTED_SYMBOLS['XAU/USD'];
    const p = symCfg.defaultPrice;
    setEntryPrice(p);
    applyDefaultSlTp(p, direction, symCfg.decimals);
    setShowSearchDropdown(false);
    setSearchQuery('');
    handleReset();
  };

  // Handle direction toggle
  const handleDirectionChange = (newDir: 'BUY' | 'SELL') => {
    setDirection(newDir);
    applyDefaultSlTp(entryPrice, newDir, decimals);
    handleReset();
  };

  // Quick Presets for Stop Loss
  const handleSlPreset = (percent: number) => {
    const mult = direction === 'BUY' ? (1 - percent / 100) : (1 + percent / 100);
    setStopLoss(Number((entryPrice * mult).toFixed(decimals)));
    handleReset();
  };

  // Quick Presets for Take Profit (R:R multiplier)
  const handleTpRrPreset = (rrMultiplier: number) => {
    const slDist = Math.abs(entryPrice - stopLoss);
    const tpDist = slDist > 0 ? slDist * rrMultiplier : entryPrice * (rrMultiplier * 0.01);
    const newTp = direction === 'BUY'
      ? Number((entryPrice + tpDist).toFixed(decimals))
      : Number((entryPrice - tpDist).toFixed(decimals));
    setTakeProfit(newTp);
    handleReset();
  };

  // Calculations
  const numLots = Math.max(0.001, parseFloat(lots) || 0.01);
  const contractInfo = SYMBOL_CONTRACT_SIZES[selectedSymbol] || { size: 1, label: 'units' };
  const contractMultiplier = contractInfo.size;

  const slDiff = Math.abs(entryPrice - stopLoss);
  const tpDiff = Math.abs(takeProfit - entryPrice);

  const dollarRisk = slDiff * numLots * contractMultiplier;
  const dollarProfit = tpDiff * numLots * contractMultiplier;

  const riskPct = accountBalance > 0 ? (dollarRisk / accountBalance) * 100 : 0;
  const rewardPct = accountBalance > 0 ? (dollarProfit / accountBalance) * 100 : 0;
  const rrRatio = dollarRisk > 0 ? (dollarProfit / dollarRisk).toFixed(2) : '2.00';
  const isRiskSafe = riskPct <= 1.0;
  const maxAllowedRiskDollar = accountBalance * 0.01;

  // Handle ESC key to exit maximized mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMaximized) {
        setIsMaximized(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMaximized]);

  const handleReset = () => {
    setAnalysisResult(null);
    setShowConfirm(false);
  };

  const handleCheckRules = async () => {
    setIsAnalyzing(true);
    try {
      const res = await fetch('/api/trade/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: selectedSymbol,
          direction: direction.toLowerCase(),
          entryPrice: entryPrice,
          stopLoss: stopLoss,
          takeProfit: takeProfit,
          positionSize: dollarRisk,
          quantity: numLots,
          riskPercentage: riskPct,
          riskReward: parseFloat(rrRatio) || 2.0
        })
      });

      if (res.ok) {
        const data = await res.json();
        const status = riskPct > 1.0 ? 'CAUTION' : 'SAFE';
        setAnalysisResult({
          status,
          title: status === 'SAFE' ? 'Rules Passed' : 'Caution: Risk Limit Exceeded',
          message: riskPct > 1.0
            ? `Your risk is ${riskPct.toFixed(2)}% ($${dollarRisk.toFixed(2)}), which exceeds your 1.0% limit ($${maxAllowedRiskDollar.toFixed(2)} max). Lower your lot size or move your stop-loss closer.`
            : `Setup follows all rules. You are risking ${riskPct.toFixed(2)}% ($${dollarRisk.toFixed(2)}) for a 1:${rrRatio} potential return ($${dollarProfit.toFixed(2)}).`,
          rules: [
            { name: `Risk ≤ 1.0% (${riskPct.toFixed(2)}%)`, passed: isRiskSafe },
            { name: `Risk/Reward ≥ 1:1.5 (1:${rrRatio})`, passed: parseFloat(rrRatio) >= 1.5 },
            { name: 'Stop Loss Set', passed: stopLoss > 0 && slDiff > 0 },
          ]
        });
        setIsAnalyzing(false);
        return;
      }
    } catch (e) {
      console.warn('Analysis error:', e);
    }

    // Direct local check
    const passedRR = parseFloat(rrRatio) >= 1.5;
    const passedSL = stopLoss > 0 && slDiff > 0;
    const allPassed = isRiskSafe && passedRR && passedSL;

    setAnalysisResult({
      status: allPassed ? 'SAFE' : 'CAUTION',
      title: allPassed ? 'Rules Passed' : 'Caution: Risk Limit Exceeded',
      message: !isRiskSafe
        ? `Your risk is ${riskPct.toFixed(2)}% ($${dollarRisk.toFixed(2)}), above your 1.0% limit ($${maxAllowedRiskDollar.toFixed(2)}). Lower your lot size.`
        : 'Setup follows all rules. Ready to trade.',
      rules: [
        { name: `Risk ≤ 1.0% (${riskPct.toFixed(2)}%)`, passed: isRiskSafe },
        { name: `Risk/Reward ≥ 1:1.5 (1:${rrRatio})`, passed: passedRR },
        { name: 'Stop Loss Set', passed: passedSL },
      ]
    });
    setIsAnalyzing(false);
  };

  const filteredSymbols = SYMBOL_LIST.filter(s => 
    s.symbol.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-4 max-w-[1700px] mx-auto pb-6">
      {/* Clean Top Title Strip */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">Trading Terminal</h1>
          <p className="text-xs text-neutral-400 font-medium">Clear TradingView chart with disciplined lot & risk calculations</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono bg-[#111111] border border-[#222222] px-3.5 py-1.5 rounded-xl">
          <span className="text-neutral-400">Balance:</span>
          <strong className="text-white font-semibold">${accountBalance.toLocaleString()}</strong>
        </div>
      </div>

      {/* Main Workspace: Chart (8 cols) & Order Panel (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-[620px]">
        {/* Left: Clean TradingView Chart */}
        <div className="lg:col-span-8 flex flex-col min-h-[580px]">
          <TradingViewChart 
            symbol={selectedSymbol} 
            interval="15m" 
            onMaximizeToggle={() => setIsMaximized(true)}
            isMaximized={false}
          />
        </div>

        {/* Fullscreen Overlay */}
        {isMaximized && (
          <div className="fixed inset-0 z-50 p-4 md:p-6 bg-[#080808]/95 backdrop-blur-md flex flex-col gap-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between px-2">
              <span className="text-sm font-bold text-white font-mono">{selectedSymbol} Full Chart</span>
              <button
                onClick={() => setIsMaximized(false)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#141414] hover:bg-[#1f1f1f] border border-[#282828] text-neutral-200 hover:text-white transition-all cursor-pointer text-xs font-semibold"
              >
                <Minimize2 className="h-4 w-4 text-neutral-300" />
                <span>Minimize</span>
              </button>
            </div>
            <div className="flex-1 w-full rounded-2xl overflow-hidden bg-[#0a0a0a] border border-[#202020] shadow-2xl">
              <TradingViewChart 
                symbol={selectedSymbol} 
                interval="15m" 
                onMaximizeToggle={() => setIsMaximized(false)}
                isMaximized={true}
              />
            </div>
          </div>
        )}

        {/* Right: Focused Dusky Order Panel */}
        <Card className="lg:col-span-4 p-5 flex flex-col justify-between overflow-y-auto border-[#202020] bg-gradient-to-b from-[#141414] to-[#0c0c0c] shadow-2xl">
          <div className="space-y-4">
            {/* Header: Symbol Search & Switcher */}
            <div className="pb-3 border-b border-[#202020] space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 font-mono">Order</span>
                <span className="text-xs font-mono font-bold text-neutral-200">{selectedSymbol}</span>
              </div>

              {/* Symbol Selector Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-neutral-500" />
                <input
                  type="text"
                  placeholder="Change market (Gold, BTC, ETH, SOL, TSLA)..."
                  value={searchQuery}
                  onFocus={() => setShowSearchDropdown(true)}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSearchDropdown(true);
                  }}
                  className="w-full bg-[#090909] border border-[#222222] rounded-xl pl-8 pr-3 py-2 text-xs font-mono text-white placeholder:text-neutral-500 focus:outline-none focus:border-[#444444] transition-colors"
                />
                {searchQuery && (
                  <button 
                    onClick={() => {
                      setSearchQuery('');
                      setShowSearchDropdown(false);
                    }}
                    className="absolute right-2.5 top-2 text-neutral-500 hover:text-white cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Dropdown */}
                {showSearchDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 z-30 bg-[#121212] border border-[#282828] rounded-xl shadow-2xl max-h-56 overflow-y-auto divide-y divide-[#1e1e1e]">
                    {filteredSymbols.map((item) => (
                      <button
                        key={item.symbol}
                        onClick={() => handleSelectSymbol(item.symbol)}
                        className="w-full px-3.5 py-2 text-left hover:bg-[#1a1a1a] transition-colors flex items-center justify-between cursor-pointer"
                      >
                        <div>
                          <span className="text-xs font-mono font-bold text-white">{item.symbol}</span>
                          <span className="text-[11px] text-neutral-400 ml-2">{item.name}</span>
                        </div>
                        <span className="text-xs font-mono text-neutral-300">
                          ${item.defaultPrice.toLocaleString()}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Order Form */}
            {!analysisResult && !showConfirm ? (
              <div className="space-y-4">
                {/* 1. Direction: Buy vs Sell */}
                <div className="grid grid-cols-2 gap-2.5">
                  <button 
                    className={cn(
                      "py-2.5 rounded-xl text-xs font-bold tracking-wider transition-all border flex items-center justify-center gap-1.5 cursor-pointer",
                      direction === 'BUY' 
                        ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400 shadow-lg" 
                        : "bg-[#090909] border-[#222222] text-neutral-400 hover:text-white hover:bg-[#141414]"
                    )}
                    onClick={() => handleDirectionChange('BUY')}
                  >
                    <TrendingUp className="h-4 w-4" />
                    <span>BUY</span>
                  </button>
                  <button 
                    className={cn(
                      "py-2.5 rounded-xl text-xs font-bold tracking-wider transition-all border flex items-center justify-center gap-1.5 cursor-pointer",
                      direction === 'SELL' 
                        ? "bg-rose-500/15 border-rose-500/40 text-rose-400 shadow-lg" 
                        : "bg-[#090909] border-[#222222] text-neutral-400 hover:text-white hover:bg-[#141414]"
                    )}
                    onClick={() => handleDirectionChange('SELL')}
                  >
                    <TrendingDown className="h-4 w-4" />
                    <span>SELL</span>
                  </button>
                </div>

                {/* 2. Position Size (Lots) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-neutral-300">Position Size (Lots)</label>
                    <span className="text-[11px] font-mono text-neutral-500">
                      1 Lot = {contractMultiplier.toLocaleString()} {contractInfo.label}
                    </span>
                  </div>
                  <div className="relative">
                    <input 
                      type="number" 
                      step="0.01"
                      min="0.001"
                      className="w-full bg-[#090909] border border-[#222222] rounded-xl px-3.5 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-[#444444] font-bold"
                      value={lots}
                      onChange={(e) => {
                        setLots(e.target.value);
                        handleReset();
                      }}
                    />
                    <span className="absolute right-3.5 top-2.5 text-xs text-neutral-500 font-mono">LOTS</span>
                  </div>

                  {/* Lot Presets */}
                  <div className="flex items-center gap-1.5 mt-2">
                    {['0.01', '0.05', '0.10', '0.50', '1.00'].map((l) => (
                      <button
                        key={l}
                        type="button"
                        onClick={() => {
                          setLots(l);
                          handleReset();
                        }}
                        className={cn(
                          "flex-1 text-[11px] font-mono py-1 rounded-lg bg-[#090909] hover:bg-[#181818] border border-[#222222] text-neutral-400 hover:text-white transition-colors cursor-pointer",
                          lots === l && "border-neutral-500 text-white font-bold bg-[#1f1f1f]"
                        )}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Entry Price */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-neutral-300">Entry Price</label>
                  </div>
                  <input 
                    type="number" 
                    step="any"
                    className="w-full bg-[#090909] border border-[#222222] rounded-xl px-3.5 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-[#444444] font-bold"
                    value={entryPrice}
                    onChange={(e) => {
                      setEntryPrice(parseFloat(e.target.value) || 0);
                      handleReset();
                    }}
                  />
                </div>

                {/* 4. Stop Loss */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-neutral-300">Stop Loss</label>
                    <span className={cn(
                      "text-xs font-mono font-bold",
                      riskPct > 1.0 ? "text-rose-400" : "text-neutral-400"
                    )}>
                      -${dollarRisk.toFixed(2)} ({riskPct.toFixed(2)}%)
                    </span>
                  </div>
                  <input 
                    type="number" 
                    step="any"
                    className="w-full bg-[#090909] border border-[#222222] rounded-xl px-3.5 py-2 text-xs font-mono text-rose-400 font-semibold focus:outline-none focus:border-rose-500/50"
                    value={stopLoss}
                    onChange={(e) => {
                      setStopLoss(parseFloat(e.target.value) || 0);
                      handleReset();
                    }}
                  />
                  {/* Stop Loss Presets */}
                  <div className="flex items-center gap-1.5 mt-2">
                    {[0.5, 1.0, 1.5, 2.0].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => handleSlPreset(pct)}
                        className={cn(
                          "flex-1 text-[11px] font-mono py-1 rounded-lg bg-[#090909] hover:bg-[#181818] border border-[#222222] text-neutral-400 hover:text-white transition-colors cursor-pointer",
                          pct === 1.0 && "border-neutral-500 text-neutral-200 font-bold bg-[#1f1f1f]"
                        )}
                      >
                        {direction === 'BUY' ? `-${pct}%` : `+${pct}%`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 5. Take Profit */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-neutral-300">Take Profit</label>
                    <span className="text-xs font-mono font-bold text-emerald-400">
                      +${dollarProfit.toFixed(2)} (+{rewardPct.toFixed(2)}%)
                    </span>
                  </div>
                  <input 
                    type="number" 
                    step="any"
                    className="w-full bg-[#090909] border border-[#222222] rounded-xl px-3.5 py-2 text-xs font-mono text-white font-semibold focus:outline-none focus:border-neutral-500"
                    value={takeProfit}
                    onChange={(e) => {
                      setTakeProfit(parseFloat(e.target.value) || 0);
                      handleReset();
                    }}
                  />
                  {/* Take Profit Presets */}
                  <div className="flex items-center gap-1.5 mt-2">
                    {[1.5, 2.0, 3.0].map((rr) => (
                      <button
                        key={rr}
                        type="button"
                        onClick={() => handleTpRrPreset(rr)}
                        className={cn(
                          "flex-1 text-[11px] font-mono py-1 rounded-lg bg-[#090909] hover:bg-[#181818] border border-[#222222] text-neutral-400 hover:text-white transition-colors cursor-pointer",
                          rr === 2.0 && "border-neutral-500 text-white font-bold bg-neutral-800"
                        )}
                      >
                        1:{rr} R:R
                      </button>
                    ))}
                  </div>
                </div>

                {/* 6. Properly Calculated Dusky Risk Card */}
                <div className="p-3.5 rounded-xl bg-[#090909] border border-[#202020] space-y-2 font-mono text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-400">Risk Amount</span>
                    <span className={cn("font-bold text-sm", riskPct > 1.0 ? "text-rose-400" : "text-neutral-200")}>
                      -${dollarRisk.toFixed(2)} ({riskPct.toFixed(2)}%)
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-400">Target Profit</span>
                    <span className="font-bold text-sm text-emerald-400">
                      +${dollarProfit.toFixed(2)} (+{rewardPct.toFixed(2)}%)
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-t border-[#1c1c1c] pt-2">
                    <span className="text-neutral-400">Risk / Reward</span>
                    <span className={cn(
                      "font-bold text-sm",
                      parseFloat(rrRatio) >= 1.5 ? "text-neutral-100" : "text-amber-400"
                    )}>
                      1 : {rrRatio}
                    </span>
                  </div>

                  {/* 1% Rule Indicator */}
                  <div className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-sans font-medium mt-1",
                    isRiskSafe 
                      ? "bg-[#141414] text-neutral-300 border border-[#262626]" 
                      : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                  )}>
                    {isRiskSafe ? <Check className="h-3.5 w-3.5 shrink-0 text-neutral-300" /> : <AlertTriangle className="h-3.5 w-3.5 shrink-0" />}
                    <span>
                      {isRiskSafe 
                        ? `Follows 1% rule (Max allowed: $${maxAllowedRiskDollar.toFixed(2)})` 
                        : `Exceeds 1% rule ($${dollarRisk.toFixed(2)} vs $${maxAllowedRiskDollar.toFixed(2)} max)`}
                    </span>
                  </div>
                </div>

                {/* Check Rules Button */}
                <Button 
                  onClick={handleCheckRules}
                  disabled={isAnalyzing}
                  className="w-full bg-[#EDEDED] hover:bg-white text-neutral-950 font-bold py-2.5 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer text-xs"
                >
                  {isAnalyzing ? (
                    <>
                      <div className="h-4 w-4 rounded-full border-2 border-neutral-900 border-t-transparent animate-spin" />
                      <span>Checking Rules...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 text-neutral-900" />
                      <span>Check Rules</span>
                    </>
                  )}
                </Button>
              </div>
            ) : null}

            {/* Analysis Result View */}
            {analysisResult && !showConfirm && (
              <div className="space-y-3.5 animate-in fade-in duration-200">
                <div className={cn(
                  "p-3.5 rounded-xl space-y-2",
                  analysisResult.status === 'SAFE' 
                    ? "bg-[#141414] border border-[#282828]" 
                    : "bg-rose-500/10 border border-rose-500/30"
                )}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {analysisResult.status === 'SAFE' ? (
                        <Check className="h-4 w-4 text-neutral-200 shrink-0" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
                      )}
                      <span className={cn(
                        "text-xs font-bold font-mono",
                        analysisResult.status === 'SAFE' ? "text-neutral-200" : "text-rose-400"
                      )}>
                        {analysisResult.title}
                      </span>
                    </div>
                    <Badge variant="outline" className={cn(
                      "text-[10px] font-mono font-bold uppercase",
                      analysisResult.status === 'SAFE' ? "text-neutral-200 border-[#333333] bg-[#222222]" : "text-rose-300 border-rose-500/40"
                    )}>
                      {analysisResult.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-neutral-300 leading-relaxed font-sans">
                    {analysisResult.message}
                  </p>
                </div>

                {/* Rule Checklist */}
                <div className="space-y-2 p-3 rounded-xl bg-[#090909] border border-[#202020] text-xs">
                  <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block font-mono">
                    Rule Checklist
                  </span>
                  {analysisResult.rules?.map((r: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between py-1 border-b border-[#1c1c1c] last:border-0">
                      <span className="text-neutral-300 text-xs">{r.name}</span>
                      <span className={cn(
                        "text-[10px] font-mono px-1.5 py-0.5 rounded font-bold",
                        r.passed ? "bg-[#161616] text-neutral-300 border border-[#242424]" : "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                      )}>
                        {r.passed ? 'PASS' : 'FAIL'}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="space-y-2 pt-1">
                  {analysisResult.status === 'SAFE' ? (
                    <>
                      <Button 
                        onClick={() => {
                          alert(`Order placed successfully for ${numLots} lots of ${selectedSymbol} at $${entryPrice}!`);
                          handleReset();
                        }}
                        className="w-full bg-[#EDEDED] hover:bg-white text-neutral-950 font-bold py-2.5 rounded-xl cursor-pointer text-xs shadow-lg"
                      >
                        Place Order
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={handleReset}
                        className="w-full border-[#242424] text-neutral-400 hover:text-white py-2 rounded-xl text-xs cursor-pointer"
                      >
                        Edit Inputs
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button 
                        onClick={handleReset}
                        className="w-full bg-[#242424] hover:bg-[#2c2c2c] text-white border border-[#383838] font-bold py-2.5 rounded-xl cursor-pointer text-xs"
                      >
                        Fix Risk (Adjust Lots/SL)
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => setShowConfirm(true)}
                        className="w-full border-rose-500/30 text-rose-400 hover:bg-rose-500/10 py-2 rounded-xl text-xs cursor-pointer"
                      >
                        Trade Anyway
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Overriding Rule Confirm Modal */}
            {showConfirm && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 space-y-3 animate-in fade-in duration-200 text-xs">
                <div className="flex items-center gap-2 text-rose-400 font-bold">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>Rule Override Warning</span>
                </div>
                <p className="text-neutral-300 leading-relaxed font-sans">
                  This order risks ${dollarRisk.toFixed(2)} ({riskPct.toFixed(2)}%), which exceeds your 1.0% risk rule. Are you sure you want to proceed?
                </p>
                <div className="flex gap-2 pt-1">
                  <Button 
                    onClick={handleReset}
                    className="flex-1 bg-[#141414] hover:bg-[#1f1f1f] border border-[#282828] text-xs text-white py-2 cursor-pointer rounded-xl"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={() => {
                      alert(`Order simulated with rule override for ${numLots} lots of ${selectedSymbol} at $${entryPrice}!`);
                      handleReset();
                    }}
                    className="flex-1 bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white py-2 cursor-pointer rounded-xl"
                  >
                    Confirm Order
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

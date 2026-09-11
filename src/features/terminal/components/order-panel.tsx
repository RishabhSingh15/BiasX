'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Search, X, TrendingUp, TrendingDown, Zap, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TradeDirection, OrderAnalysisResult, OrderCalculationResults, SymbolListItem } from '../types';
import { RiskSummaryCard } from './risk-summary-card';

interface OrderPanelProps {
  selectedSymbol: string;
  filteredSymbols: SymbolListItem[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  showSearchDropdown: boolean;
  setShowSearchDropdown: (show: boolean) => void;
  onSelectSymbol: (symbol: string) => void;
  direction: TradeDirection;
  onDirectionChange: (dir: TradeDirection) => void;
  lots: string;
  setLots: (l: string) => void;
  entryPrice: string;
  setEntryPrice: (p: string) => void;
  stopLoss: string;
  setStopLoss: (p: string) => void;
  takeProfit: string;
  setTakeProfit: (p: string) => void;
  calc: OrderCalculationResults;
  analysisResult: OrderAnalysisResult | null;
  isAnalyzing: boolean;
  onCheckRules: () => void;
  onReset: () => void;
  onOpenAnalysisModal?: () => void;
}

export function OrderPanel({
  selectedSymbol,
  filteredSymbols,
  searchQuery,
  setSearchQuery,
  showSearchDropdown,
  setShowSearchDropdown,
  onSelectSymbol,
  direction,
  onDirectionChange,
  lots,
  setLots,
  entryPrice,
  setEntryPrice,
  stopLoss,
  setStopLoss,
  takeProfit,
  setTakeProfit,
  calc,
  analysisResult,
  isAnalyzing,
  onCheckRules,
  onReset,
  onOpenAnalysisModal,
}: OrderPanelProps) {
  const {
    contractMultiplier,
    contractInfo,
    dollarRisk,
    dollarProfit,
    riskPct,
    rewardPct,
    slPricePct,
    tpPricePct,
    isSlValid,
    isTpValid,
    slError,
    tpError,
  } = calc;


  // Handler: Auto-calculate lots to risk exactly 1% account balance
  const handleAutoRiskLots = () => {
    if (isSlValid && calc.slPriceDiff > 0) {
      const targetRiskDollar = calc.maxAllowedRiskDollar > 0 ? calc.maxAllowedRiskDollar : 20;
      const isJpyQuote = selectedSymbol.endsWith('/JPY') || selectedSymbol.includes('JPY');
      const numEntry = parseFloat(entryPrice) || 1;
      const perLotRisk = isJpyQuote 
        ? (calc.slPriceDiff * calc.contractMultiplier) / numEntry
        : calc.slPriceDiff * calc.contractMultiplier;
      if (perLotRisk > 0) {
        const calculatedLots = Math.max(0.01, Number((targetRiskDollar / perLotRisk).toFixed(2)));
        setLots(String(calculatedLots));
        onReset();
      }
    }
  };

  // Handler: Reset default symmetrical SL/TP around current entry price
  const handleAutoSlTp = () => {
    const numEntry = parseFloat(entryPrice);
    if (!isNaN(numEntry) && numEntry > 0) {
      const slRatio = direction === 'BUY' ? 0.992 : 1.008;
      const tpRatio = direction === 'BUY' ? 1.020 : 0.980;
      const dec = entryPrice.includes('.') ? entryPrice.split('.')[1].length : 2;
      setStopLoss((numEntry * slRatio).toFixed(dec));
      setTakeProfit((numEntry * tpRatio).toFixed(dec));
      onReset();
    }
  };


  // Generic sanitizer for decimal inputs to completely eliminate leading zeros
  const handleNumericInput = (raw: string, setter: (val: string) => void) => {
    if (raw === '' || /^\d*\.?\d*$/.test(raw)) {
      // If user types numbers after 0 (like "02850"), strip the superfluous leading zero unless it's "0."
      let clean = raw;
      if (clean.length > 1 && clean.startsWith('0') && !clean.startsWith('0.')) {
        clean = clean.replace(/^0+/, '');
        if (clean === '') clean = '0';
      }
      setter(clean);
      onReset();
    }
  };

  return (
    <Card className="lg:col-span-4 p-5 md:p-6 flex flex-col justify-between overflow-y-auto bg-[#E0E5EC] neu-raised rounded-[32px] border border-[#A0AEC0]/20 shadow-none">
      <div className="space-y-4">
        {/* Header: Symbol Search & Switcher */}
        <div className="pb-3 border-b border-[#A0AEC0]/25 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold uppercase tracking-wider text-[#4A5568] font-heading">Order Entry</span>
            <span className="text-base font-mono font-bold text-[#2D3748]">{selectedSymbol}</span>
          </div>

          {/* Symbol Selector Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-[#718096]" />
            <input
              type="text"
              placeholder="Change market (Gold, BTC, ETH, SOL, TSLA)..."
              value={searchQuery}
              onFocus={() => setShowSearchDropdown(true)}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearchDropdown(true);
              }}
              className="w-full bg-[#E0E5EC] neu-inset rounded-[20px] pl-10 pr-3.5 py-2 text-sm font-mono text-[#2D3748] placeholder:text-[#718096] focus:outline-none focus:ring-2 focus:ring-[#6C63FF] border border-[#A0AEC0]/20 transition-colors"
            />
            {searchQuery && (
              <button 
                onClick={() => {
                  setSearchQuery('');
                  setShowSearchDropdown(false);
                }}
                className="absolute right-3.5 top-2.5 text-[#718096] hover:text-[#2D3748] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {/* Dropdown */}
            {showSearchDropdown && (
              <div className="absolute top-full left-0 right-0 mt-2 z-30 bg-[#E0E5EC] neu-raised rounded-[22px] border border-[#A0AEC0]/30 shadow-xl max-h-56 overflow-y-auto divide-y divide-[#A0AEC0]/15">
                {filteredSymbols.map((item) => (
                  <button
                    key={item.symbol}
                    onClick={() => onSelectSymbol(item.symbol)}
                    className="w-full px-4 py-3 text-left hover:bg-[#A0AEC0]/15 transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <div>
                      <span className="text-sm font-mono font-bold text-[#2D3748]">{item.symbol}</span>
                      <span className="text-xs text-[#4A5568] ml-2 font-body">{item.name}</span>
                    </div>
                    <span className="text-sm font-mono text-[#4A5568] font-semibold">
                      ${item.defaultPrice.toLocaleString()}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Order Form */}
        <div className="space-y-4">
            {/* 1. Direction: Buy vs Sell */}
            <div className="grid grid-cols-2 gap-2.5">
              <button 
                className={cn(
                  "py-2.5 rounded-[20px] text-sm font-heading font-bold tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                  direction === 'BUY' 
                    ? "bg-[#38B2AC] text-white shadow-md" 
                    : "bg-[#E0E5EC] neu-raised-sm border border-[#A0AEC0]/20 text-[#4A5568] hover:text-[#38B2AC]"
                )}
                onClick={() => onDirectionChange('BUY')}
              >
                <TrendingUp className="h-4 w-4" />
                <span>BUY</span>
              </button>
              <button 
                className={cn(
                  "py-2.5 rounded-[20px] text-sm font-heading font-bold tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                  direction === 'SELL' 
                    ? "bg-[#FF6B6B] text-white shadow-md" 
                    : "bg-[#E0E5EC] neu-raised-sm border border-[#A0AEC0]/20 text-[#4A5568] hover:text-[#FF6B6B]"
                )}
                onClick={() => onDirectionChange('SELL')}
              >
                <TrendingDown className="h-4 w-4" />
                <span>SELL</span>
              </button>
            </div>

            {/* 2. Position Size (Lots) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-heading font-semibold text-[#2D3748]">Position Size (Lots)</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAutoRiskLots}
                    disabled={!isSlValid}
                    title="Auto-calculate lot size to risk exactly 1% of account"
                    className="px-2 py-0.5 rounded-[12px] bg-[#38B2AC]/10 border border-[#38B2AC]/30 text-[11px] font-heading font-bold text-[#38B2AC] hover:bg-[#38B2AC]/20 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed transition-all"
                  >
                    1% Risk
                  </button>
                  <span className="text-xs font-mono text-[#4A5568]">
                    1 Lot = {contractMultiplier.toLocaleString()} {contractInfo.label}
                  </span>
                </div>
              </div>
              <div className="relative">
                <input 
                  type="text" 
                  inputMode="decimal"
                  placeholder="0.05"
                  className="w-full bg-[#E0E5EC] neu-inset-deep rounded-[20px] px-4 py-2.5 text-sm font-mono text-[#2D3748] focus:outline-none focus:ring-2 focus:ring-[#6C63FF] font-bold border border-[#A0AEC0]/20"
                  value={lots}
                  onChange={(e) => handleNumericInput(e.target.value, setLots)}
                />
                <span className="absolute right-4 top-2.5 text-xs text-[#718096] font-mono font-bold">LOTS</span>
              </div>
            </div>

            {/* 3. Entry Price */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-heading font-semibold text-[#2D3748]">Entry Price</label>
                <button
                  type="button"
                  onClick={handleAutoSlTp}
                  className="px-2 py-0.5 rounded-[12px] bg-[#E0E5EC] neu-raised-sm border border-[#A0AEC0]/20 text-[11px] font-heading font-bold text-[#4A5568] hover:text-[#6C63FF] cursor-pointer transition-all"
                >
                  Auto SL/TP
                </button>
              </div>
              <input 
                type="text" 
                inputMode="decimal"
                placeholder="0.00"
                className="w-full bg-[#E0E5EC] neu-inset-deep rounded-[20px] px-4 py-2.5 text-sm font-mono text-[#2D3748] focus:outline-none focus:ring-2 focus:ring-[#6C63FF] font-bold border border-[#A0AEC0]/20"
                value={entryPrice}
                onChange={(e) => handleNumericInput(e.target.value, setEntryPrice)}
              />
            </div>

            {/* 4. Stop Loss */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-heading font-semibold text-[#2D3748]">Stop Loss</label>
                <div className="flex items-center gap-1.5">
                  {dollarRisk > 0 ? (
                    <span className={cn(
                      "text-xs font-mono font-bold",
                      riskPct > 1.0 ? "text-[#FF6B6B]" : "text-[#4A5568]"
                    )}>
                      -${dollarRisk.toFixed(2)} ({riskPct.toFixed(2)}% of account)
                    </span>
                  ) : (
                    <span className="text-[11px] font-mono font-semibold text-[#718096]">Set Stop Loss</span>
                  )}
                  {slError && (
                    <span className="text-[10px] font-mono font-semibold text-[#D69E2E] bg-[#D69E2E]/10 px-1.5 py-0.5 rounded-[10px] border border-[#D69E2E]/20">
                      {slError}
                    </span>
                  )}
                </div>
              </div>
              <input 
                type="text" 
                inputMode="decimal"
                placeholder="0.00"
                className="w-full bg-[#E0E5EC] neu-inset-deep rounded-[20px] px-4 py-2 text-sm font-mono text-[#FF6B6B] font-bold focus:outline-none focus:ring-2 focus:ring-[#FF6B6B] border border-[#A0AEC0]/20"
                value={stopLoss}
                onChange={(e) => handleNumericInput(e.target.value, setStopLoss)}
              />
            </div>

            {/* 5. Take Profit */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-heading font-semibold text-[#2D3748]">Take Profit</label>
                <div className="flex items-center gap-1.5">
                  {dollarProfit > 0 ? (
                    <span className="text-xs font-mono font-bold text-[#38B2AC]">
                      +${dollarProfit.toFixed(2)} (+{rewardPct.toFixed(2)}% of account)
                    </span>
                  ) : (
                    <span className="text-[11px] font-mono font-semibold text-[#718096]">Set Take Profit</span>
                  )}
                  {tpError && (
                    <span className="text-[10px] font-mono font-semibold text-[#D69E2E] bg-[#D69E2E]/10 px-1.5 py-0.5 rounded-[10px] border border-[#D69E2E]/20">
                      {tpError}
                    </span>
                  )}
                </div>
              </div>
              <input 
                type="text" 
                inputMode="decimal"
                placeholder="0.00"
                className="w-full bg-[#E0E5EC] neu-inset-deep rounded-[20px] px-4 py-2 text-sm font-mono text-[#38B2AC] font-bold focus:outline-none focus:ring-2 focus:ring-[#38B2AC] border border-[#A0AEC0]/20"
                value={takeProfit}
                onChange={(e) => handleNumericInput(e.target.value, setTakeProfit)}
              />
            </div>

            {/* 6. Properly Calculated BehaviorGuard Risk Card */}
            <RiskSummaryCard calc={calc} />

            {/* Analyse Button */}
            <Button 
              onClick={onCheckRules}
              disabled={isAnalyzing}
              className="w-full neu-btn-primary font-heading font-bold py-3.5 rounded-[24px] shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
            >
              {isAnalyzing ? (
                <>
                  <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  <span>Analysing...</span>
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 text-white" />
                  <span>Analyse</span>
                </>
              )}
            </Button>
            {/* Re-open Pop-up Banner if analysis is available */}
            {analysisResult && onOpenAnalysisModal && (
              <button
                type="button"
                onClick={onOpenAnalysisModal}
                className={cn(
                  "w-full py-2.5 px-3.5 rounded-[20px] text-xs font-heading font-bold flex items-center justify-between transition-all cursor-pointer",
                  analysisResult.status === 'SAFE' 
                    ? "bg-[#38B2AC]/10 text-[#38B2AC] hover:bg-[#38B2AC]/20 border border-[#38B2AC]/30" 
                    : analysisResult.status === 'CAUTION'
                    ? "bg-[#D69E2E]/10 text-[#D69E2E] hover:bg-[#D69E2E]/20 border border-[#D69E2E]/30"
                    : "bg-[#FF6B6B]/10 text-[#FF6B6B] hover:bg-[#FF6B6B]/20 border border-[#FF6B6B]/30"
                )}
              >
                <span className="flex items-center gap-1.5 truncate">
                  <Sparkles className="w-3.5 h-3.5 shrink-0 text-[#6C63FF]" />
                  <span className="truncate">View Analysis Pop-up ({analysisResult.status})</span>
                </span>
                <span className="text-[11px] underline shrink-0">Open &rarr;</span>
              </button>
            )}
          </div>
        </div>
    </Card>
  );
}

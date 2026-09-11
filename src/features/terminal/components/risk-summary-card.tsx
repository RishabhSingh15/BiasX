'use client';

import React from 'react';
import { Check, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OrderCalculationResults } from '../types';

interface RiskSummaryCardProps {
  calc: OrderCalculationResults;
}

export function RiskSummaryCard({ calc }: RiskSummaryCardProps) {
  const {
    dollarRisk,
    dollarProfit,
    riskPct,
    rewardPct,
    slPricePct,
    tpPricePct,
    rrRatio,
    isRiskSafe,
    maxAllowedRiskDollar,
    isSlValid,
    isTpValid,
    slError,
    tpError,
  } = calc;

  const hasValidRr = rrRatio !== '—' && !isNaN(parseFloat(rrRatio));

  return (
    <div className="p-4 rounded-[22px] bg-[#E0E5EC] neu-inset-sm border border-[#A0AEC0]/20 space-y-2.5 font-mono text-sm">
      <div className="flex justify-between items-center">
        <span className="text-[#4A5568] font-heading font-semibold">Risk Amount</span>
        <div className="flex items-center gap-1.5">
          {dollarRisk > 0 ? (
            <span className={cn("font-bold text-sm", riskPct > 1.0 ? "text-[#FF6B6B]" : "text-[#2D3748]")}>
              -${dollarRisk.toFixed(2)} ({riskPct.toFixed(2)}% of account)
            </span>
          ) : (
            <span className="text-xs text-[#718096] font-mono">Enter Stop Loss</span>
          )}
          {slError && (
            <span className="text-[10px] font-semibold text-[#D69E2E] bg-[#D69E2E]/10 px-1.5 py-0.5 rounded-[10px] border border-[#D69E2E]/20">
              {slError}
            </span>
          )}
        </div>
      </div>

      <div className="flex justify-between items-center">
        <span className="text-[#4A5568] font-heading font-semibold">Target Profit</span>
        <div className="flex items-center gap-1.5">
          {dollarProfit > 0 ? (
            <span className="font-bold text-sm text-[#38B2AC]">
              +${dollarProfit.toFixed(2)} (+{rewardPct.toFixed(2)}% of account)
            </span>
          ) : (
            <span className="text-xs text-[#718096] font-mono">Enter Take Profit</span>
          )}
          {tpError && (
            <span className="text-[10px] font-semibold text-[#D69E2E] bg-[#D69E2E]/10 px-1.5 py-0.5 rounded-[10px] border border-[#D69E2E]/20">
              {tpError}
            </span>
          )}
        </div>
      </div>

      <div className="flex justify-between items-center border-t border-[#A0AEC0]/20 pt-2">
        <span className="text-[#4A5568] font-heading font-semibold">Risk / Reward</span>
        <span className={cn(
          "font-bold text-sm",
          !hasValidRr
            ? "text-[#718096]"
            : parseFloat(rrRatio) >= 1.5 
            ? "text-[#2D3748]" 
            : "text-[#D69E2E]"
        )}>
          {hasValidRr ? `1 : ${rrRatio}` : '— (Set SL & TP)'}
        </span>
      </div>

      {/* 1% Rule Indicator */}
      <div className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-[16px] text-xs font-body font-semibold mt-1",
        !isSlValid
          ? "bg-[#D69E2E]/15 text-[#D69E2E] border border-[#D69E2E]/30"
          : isRiskSafe 
          ? "bg-[#38B2AC]/15 text-[#38B2AC] border border-[#38B2AC]/30" 
          : "bg-[#FF6B6B]/15 text-[#FF6B6B] border border-[#FF6B6B]/30"
      )}>
        {!isSlValid ? (
          <>
            <AlertTriangle className="h-4 w-4 shrink-0 text-[#D69E2E]" />
            <span>Valid Stop Loss required to verify risk limit ($${maxAllowedRiskDollar.toFixed(2)} cap)</span>
          </>
        ) : isRiskSafe ? (
          <>
            <Check className="h-4 w-4 shrink-0 text-[#38B2AC]" />
            <span>Follows 1% rule: ${dollarRisk.toFixed(2)} (${riskPct.toFixed(2)}% vs ${maxAllowedRiskDollar.toFixed(2)} max)</span>
          </>
        ) : (
          <>
            <AlertTriangle className="h-4 w-4 shrink-0 text-[#FF6B6B]" />
            <span>Exceeds 1% rule: ${dollarRisk.toFixed(2)} (${riskPct.toFixed(2)}% vs ${maxAllowedRiskDollar.toFixed(2)} max)</span>
          </>
        )}
      </div>
    </div>
  );
}

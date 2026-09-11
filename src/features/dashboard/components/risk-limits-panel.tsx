'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Shield, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RiskMetrics } from '../types';

interface RiskLimitsPanelProps {
  riskMetrics: RiskMetrics;
}

export function RiskLimitsPanel({ riskMetrics }: RiskLimitsPanelProps) {
  return (
    <Card className="lg:col-span-2 p-7 flex flex-col justify-between neu-raised rounded-[32px] bg-[#E0E5EC]">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-[#6C63FF]" />
            <span className="text-base font-bold text-[#2D3748] font-heading tracking-wide">Risk Limits</span>
          </div>
          <span className="text-[10px] font-bold text-[#2D3748] bg-[#E0E5EC] neu-inset-sm px-2.5 py-1 rounded-[16px] font-heading">
            Limits
          </span>
        </div>

        {/* Risk Capsule 1: Daily Loss Limit */}
        <div className="space-y-4">
          <div className="p-4 rounded-[22px] bg-[#E0E5EC] neu-raised-sm border border-[#A0AEC0]/20">
            <div className="flex items-center justify-between text-xs font-bold text-[#2D3748] font-heading mb-2">
              <div className="flex items-center gap-1.5">
                <span>Daily Loss Limit</span>
                <span className="text-[10px] text-[#4A5568] font-normal font-body">(Max daily loss)</span>
              </div>
              <div className="h-6 w-6 rounded-full bg-[#E0E5EC] neu-inset-sm flex items-center justify-center">
                <ArrowUpRight className="h-3.5 w-3.5 text-[#6C63FF]" />
              </div>
            </div>
            <div className="h-2.5 w-full rounded-full bg-[#E0E5EC] neu-inset-sm mb-2.5 overflow-hidden">
              <div 
                className="h-full rounded-full risk-gradient transition-all duration-300" 
                style={{ width: `${riskMetrics.dailyLossPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#4A5568] font-mono text-xs">
                ${riskMetrics.dailyLossUsed.toFixed(2)} / ${riskMetrics.dailyLossLimit.toFixed(2)} used ({riskMetrics.dailyLossPercent}%)
              </span>
              <span className="flex items-center gap-1.5 text-[#2D3748] font-semibold bg-[#E0E5EC] px-2.5 py-0.5 rounded-[16px] neu-inset-sm text-xs font-heading">
                <span className={cn("h-1.5 w-1.5 rounded-full", riskMetrics.dailyLossPercent < 50 ? "bg-[#38B2AC]" : "bg-[#F6AD55]")}></span>
                {riskMetrics.dailyLossPercent < 50 ? 'Safe' : 'Warning'}
              </span>
            </div>
          </div>

          {/* Risk Capsule 2: Max Drawdown Limit */}
          <div className="p-4 rounded-[22px] bg-[#E0E5EC] neu-raised-sm border border-[#A0AEC0]/20">
            <div className="flex items-center justify-between text-xs font-bold text-[#2D3748] font-heading mb-2">
              <div className="flex items-center gap-1.5">
                <span>Max Drawdown Limit</span>
                <span className="text-[10px] text-[#4A5568] font-normal font-body">(Total loss limit)</span>
              </div>
              <div className="h-6 w-6 rounded-full bg-[#E0E5EC] neu-inset-sm flex items-center justify-center">
                <ArrowUpRight className="h-3.5 w-3.5 text-[#6C63FF]" />
              </div>
            </div>
            <div className="h-2.5 w-full rounded-full bg-[#E0E5EC] neu-inset-sm mb-2.5 overflow-hidden">
              <div 
                className="h-full rounded-full risk-gradient transition-all duration-300" 
                style={{ width: `${riskMetrics.maxDrawdownPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#4A5568] font-mono text-xs">
                ${riskMetrics.maxDrawdownUsed.toFixed(2)} / ${riskMetrics.maxDrawdownLimit.toFixed(2)} used ({riskMetrics.maxDrawdownPercent}%)
              </span>
              <span className="flex items-center gap-1.5 text-[#2D3748] font-semibold bg-[#E0E5EC] px-2.5 py-0.5 rounded-[16px] neu-inset-sm text-xs font-heading">
                <span className="h-1.5 w-1.5 rounded-full bg-[#38B2AC]"></span>
                {Math.max(0, 100 - riskMetrics.maxDrawdownPercent)}% Buffer
              </span>
            </div>
            <div className="flex items-center justify-between text-xs font-mono text-[#4A5568] pt-2 border-t border-[#A0AEC0]/20 mt-2">
              <span>Buffer Left:</span>
              <span className="text-[#2D3748] font-mono font-bold">
                ${Math.max(0, riskMetrics.maxDrawdownLimit - riskMetrics.maxDrawdownUsed).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Real-time Account Guard Metrics */}
      <div className="grid grid-cols-3 gap-2.5 mt-5 pt-4 border-t border-[#A0AEC0]/25">
        <div className="p-3 rounded-[20px] bg-[#E0E5EC] neu-inset-sm flex flex-col">
          <span className="text-xs text-[#4A5568] font-heading font-semibold">Trades Today</span>
          <span className="text-sm font-bold font-mono text-[#2D3748] mt-0.5">
            {riskMetrics.tradesToday} / {riskMetrics.maxTradesPerDay}
          </span>
          <span className="text-[10px] text-[#718096] mt-0.5 font-body">Pace</span>
        </div>

        <div className="p-3 rounded-[20px] bg-[#E0E5EC] neu-inset-sm flex flex-col">
          <span className="text-xs text-[#4A5568] font-heading font-semibold">Risk / Trade</span>
          <span className="text-sm font-bold font-mono text-[#2D3748] mt-0.5">
            {riskMetrics.capitalAtRiskPercent}%
          </span>
          <span className="text-[10px] text-[#718096] mt-0.5 font-body">&lt; {riskMetrics.maxRiskPerTrade}% Max</span>
        </div>

        <div className="p-3 rounded-[20px] bg-[#E0E5EC] neu-inset-sm flex flex-col">
          <span className="text-xs text-[#4A5568] font-heading font-semibold">Behavioral Leaks</span>
          <span className="text-sm font-bold font-mono text-[#2D3748] mt-0.5">
            {riskMetrics.ruleViolations}
          </span>
          <span className="text-[10px] text-[#718096] mt-0.5 font-body">Recorded</span>
        </div>
      </div>
    </Card>
  );
}

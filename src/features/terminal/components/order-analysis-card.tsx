'use client';

import React from 'react';
import { 
  Check, 
  AlertTriangle, 
  AlertOctagon, 
  TrendingDown, 
  ShieldCheck, 
  ShieldAlert, 
  ArrowRight,
  Flame,
  Zap,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { OrderAnalysisResult } from '../types';
import { notify } from '@/components/ui/notification';

interface OrderAnalysisCardProps {
  analysisResult: OrderAnalysisResult;
  selectedSymbol: string;
  numLots: number;
  entryPrice: number;
  onReset: () => void;
  onShowOverride: () => void;
  onApplyProtocol?: (safeLots?: number, safeTp?: number) => void;
}

export function OrderAnalysisCard({
  analysisResult,
  selectedSymbol,
  numLots,
  entryPrice,
  onReset,
  onShowOverride,
  onApplyProtocol,
}: OrderAnalysisCardProps) {
  const isSafe = analysisResult.status === 'SAFE';
  const isCaution = analysisResult.status === 'CAUTION';
  const isHighRisk = analysisResult.status === 'HIGH RISK';
  const isBlocked = analysisResult.status === 'BLOCK';

  const statusColor = isSafe 
    ? 'text-[#38B2AC]' 
    : isCaution 
    ? 'text-[#D69E2E]' 
    : 'text-[#FF6B6B]';

  const statusBg = isSafe 
    ? 'bg-[#38B2AC]/10 border-[#38B2AC]/40 text-[#38B2AC]' 
    : isCaution 
    ? 'bg-[#D69E2E]/10 border-[#D69E2E]/40 text-[#D69E2E]' 
    : 'bg-[#FF6B6B]/10 border-[#FF6B6B]/40 text-[#FF6B6B]';

  // Normalize protocols into readable steps
  const protocols = (analysisResult.protocol || []).map((p, idx) => {
    if (typeof p === 'string') {
      const match = p.match(/^(\d+)\.\s*(.*?)(?:\s*—\s*(.*))?$/);
      if (match) {
        return {
          step: parseInt(match[1], 10),
          action: match[2],
          explanation: match[3] || ''
        };
      }
      return { step: idx + 1, action: p, explanation: '' };
    }
    return p;
  });

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* 1. Status Banner Card */}
      <div className={cn(
        "p-4 rounded-[22px] space-y-2.5 bg-[#E0E5EC] neu-raised-sm",
        isSafe ? "border border-[#38B2AC]/30" : isCaution ? "border border-[#D69E2E]/35" : "border border-[#FF6B6B]/40"
      )}>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            {isSafe ? (
              <Check className="h-5 w-5 text-[#38B2AC] shrink-0" />
            ) : isCaution ? (
              <AlertTriangle className="h-5 w-5 text-[#D69E2E] shrink-0" />
            ) : (
              <AlertOctagon className="h-5 w-5 text-[#FF6B6B] shrink-0" />
            )}
            <span className={cn("text-sm font-bold font-heading tracking-tight", statusColor)}>
              {analysisResult.title}
            </span>
          </div>

          <Badge variant="outline" className={cn("text-xs font-mono font-bold uppercase rounded-[14px] px-2.5 py-0.5", statusBg)}>
            {analysisResult.status}
          </Badge>
        </div>

        {/* Behavior Detection Alert Pill */}
        {analysisResult.behaviorDetected && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-[14px] bg-[#FF6B6B]/15 border border-[#FF6B6B]/30 text-[#FF6B6B] text-xs font-heading font-semibold">
            <Flame className="w-3.5 h-3.5 shrink-0" />
            <span>Behavior Bias: {analysisResult.behaviorDetected}</span>
          </div>
        )}

        <p className="text-xs sm:text-sm text-[#4A5568] leading-relaxed font-body">
          {analysisResult.message}
        </p>
      </div>

      {/* 2. CONSEQUENCES SECTION (Displayed when not SAFE or when consequences exist) */}
      {!isSafe && analysisResult.consequences && analysisResult.consequences.length > 0 && (
        <div className="p-4 rounded-[22px] bg-[#E0E5EC] neu-inset-sm border border-[#FF6B6B]/25 space-y-3">
          <div className="flex items-center justify-between pb-1 border-b border-[#A0AEC0]/20">
            <div className="flex items-center gap-2 text-[#FF6B6B]">
              <TrendingDown className="w-4 h-4 shrink-0" />
              <span className="text-xs font-heading font-bold uppercase tracking-wider">
                Consequences of Breaching Plan
              </span>
            </div>
            <span className="text-[10px] font-mono text-[#718096]">Audited Impact</span>
          </div>

          <div className="space-y-2.5">
            {analysisResult.consequences.map((c, idx) => (
              <div key={idx} className="p-3 rounded-[16px] bg-[#E0E5EC] neu-raised-sm border border-[#A0AEC0]/15 space-y-1">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs font-heading font-bold text-[#2D3748]">
                    {c.title}
                  </span>
                  {c.stat && (
                    <span className="text-[11px] font-mono font-bold text-[#FF6B6B] bg-[#FF6B6B]/10 px-2 py-0.5 rounded-[10px] border border-[#FF6B6B]/25">
                      {c.stat}
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#4A5568] font-body leading-relaxed">
                  {c.detail}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. PROTOCOL TO AVOID SECTION (Actionable steps to fix risk) */}
      {!isSafe && protocols.length > 0 && (
        <div className="p-4 rounded-[22px] bg-[#E0E5EC] neu-inset-sm border border-[#38B2AC]/25 space-y-3">
          <div className="flex items-center justify-between pb-1 border-b border-[#A0AEC0]/20">
            <div className="flex items-center gap-2 text-[#2D3748]">
              <ShieldCheck className="w-4 h-4 text-[#38B2AC] shrink-0" />
              <span className="text-xs font-heading font-bold uppercase tracking-wider">
                Protocol to Avoid Risk & Fix Setup
              </span>
            </div>
            <span className="text-[10px] font-mono text-[#38B2AC] font-semibold">Action Steps</span>
          </div>

          <div className="space-y-2">
            {protocols.map((p, idx) => (
              <div key={idx} className="p-3 rounded-[16px] bg-[#E0E5EC] neu-raised-sm border border-[#A0AEC0]/15 flex items-start gap-2.5">
                <span className="flex items-center justify-center h-5 w-5 rounded-full bg-[#6C63FF]/15 text-[#6C63FF] text-[11px] font-mono font-bold shrink-0 mt-0.5">
                  {p.step}
                </span>
                <div className="min-w-0 space-y-0.5">
                  <p className="text-xs font-heading font-bold text-[#2D3748]">
                    {p.action}
                  </p>
                  {p.explanation && (
                    <p className="text-[11px] text-[#4A5568] font-body leading-relaxed">
                      {p.explanation}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Rule Checklist */}
      <div className="space-y-2 p-4 rounded-[20px] bg-[#E0E5EC] neu-inset-sm border border-[#A0AEC0]/20 text-sm">
        <span className="text-xs font-bold text-[#4A5568] uppercase tracking-wider block font-heading">
          Rule Checklist
        </span>
        {analysisResult.rules?.map((r, idx) => (
          <div key={idx} className="flex items-center justify-between py-1.5 border-b border-[#A0AEC0]/20 last:border-0 gap-2">
            <span className="text-[#2D3748] text-xs sm:text-sm font-body font-medium truncate">{r.name}</span>
            <span className={cn(
              "text-xs font-mono px-2.5 py-0.5 rounded-[12px] font-bold shrink-0",
              r.passed ? "bg-[#38B2AC]/15 text-[#38B2AC] border border-[#38B2AC]/30" : "bg-[#FF6B6B]/15 text-[#FF6B6B] border border-[#FF6B6B]/30"
            )}>
              {r.passed ? 'PASS' : 'FAIL'}
            </span>
          </div>
        ))}
      </div>

      {/* 5. Actions */}
      <div className="space-y-2 pt-1">
        {isSafe ? (
          <>
            <Button 
              onClick={() => {
                notify.success(
                  'Order Placed Successfully',
                  `Executed ${numLots} lots of ${selectedSymbol} at $${entryPrice}. Position tracked in journal.`
                );
                onReset();
              }}
              className="w-full neu-btn-primary font-heading font-bold py-3 rounded-[24px] cursor-pointer text-sm shadow-md text-white"
            >
              Place Order
            </Button>
            <Button 
              variant="outline"
              onClick={onReset}
              className="w-full bg-[#E0E5EC] neu-raised-sm rounded-[24px] border border-[#A0AEC0]/20 text-[#4A5568] hover:text-[#2D3748] py-2.5 text-sm font-heading cursor-pointer"
            >
              Edit Inputs
            </Button>
          </>
        ) : isBlocked ? (
          <>
            <div className="p-3 rounded-[18px] bg-[#FF6B6B]/10 border border-[#FF6B6B]/40 text-center space-y-1">
              <span className="text-xs font-heading font-bold text-[#FF6B6B] block">Order Hard Blocked</span>
              <p className="text-[11px] text-[#4A5568]">Your trading rules prevent order execution to protect your account balance from severe drawdown.</p>
            </div>
            <Button 
              onClick={onReset}
              className="w-full bg-[#E0E5EC] neu-raised-sm rounded-[24px] text-[#2D3748] font-heading font-bold py-3 text-sm border border-[#A0AEC0]/20 cursor-pointer"
            >
              Return to Terminal
            </Button>
          </>
        ) : (
          <>
            {analysisResult.recommendedLots && onApplyProtocol && (
              <Button 
                onClick={() => onApplyProtocol(analysisResult.recommendedLots, analysisResult.recommendedTP)}
                className="w-full bg-[#38B2AC] hover:bg-[#38B2AC]/90 text-white font-heading font-bold py-3 rounded-[24px] cursor-pointer text-xs sm:text-sm shadow-md flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Auto-Apply Safe Setup ({analysisResult.recommendedLots} Lots{analysisResult.recommendedTP ? `, TP: $${analysisResult.recommendedTP}` : ''})</span>
              </Button>
            )}
            <Button 
              onClick={onReset}
              className="w-full neu-btn-primary font-heading font-bold py-3 rounded-[24px] cursor-pointer text-sm shadow-md text-white flex items-center justify-center gap-2"
            >
              <span>Fix Risk (Adjust Lots/SL)</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
            <Button 
              variant="outline"
              onClick={onShowOverride}
              className="w-full bg-[#E0E5EC] neu-raised-sm rounded-[24px] text-[#FF6B6B] border border-[#FF6B6B]/30 hover:bg-[#FF6B6B]/10 py-2.5 text-sm font-heading cursor-pointer"
            >
              Override Guardrail
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

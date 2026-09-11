'use client';

import React, { useState } from 'react';
import { 
  Check, 
  AlertTriangle, 
  AlertOctagon, 
  TrendingDown, 
  ShieldCheck, 
  ArrowRight,
  Flame,
  X,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogTitle, 
  DialogDescription 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { OrderAnalysisResult } from '../types';

interface OrderAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysisResult: OrderAnalysisResult | null;
  selectedSymbol: string;
  numLots: number;
  entryPrice: number;
  dollarRisk: number;
  riskPct: number;
  onApplyProtocol?: (safeLots?: number, safeTp?: number) => void;
  onConfirmOrder: (decision: 'proceeded' | 'overridden') => void;
  isExecuting?: boolean;
}

export function OrderAnalysisModal({
  isOpen,
  onClose,
  analysisResult,
  selectedSymbol,
  numLots,
  entryPrice,
  dollarRisk,
  riskPct,
  onApplyProtocol,
  onConfirmOrder,
  isExecuting = false,
}: OrderAnalysisModalProps) {
  const [showOverrideWarning, setShowOverrideWarning] = useState(false);

  if (!analysisResult) return null;

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

  const handleApply = () => {
    if (onApplyProtocol && analysisResult.recommendedLots) {
      onApplyProtocol(analysisResult.recommendedLots, analysisResult.recommendedTP);
      onClose();
    }
  };

  const handleClose = () => {
    setShowOverrideWarning(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[88vh] p-0 flex flex-col overflow-hidden bg-[#E0E5EC] rounded-[32px] neu-raised border border-[#A0AEC0]/30 shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-[#A0AEC0]/25 bg-[#E0E5EC] shrink-0">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-[16px] flex items-center justify-center shrink-0 neu-inset-sm",
              isSafe ? "text-[#38B2AC]" : isCaution ? "text-[#D69E2E]" : "text-[#FF6B6B]"
            )}>
              {isSafe ? (
                <Check className="h-5 w-5" />
              ) : isCaution ? (
                <AlertTriangle className="h-5 w-5" />
              ) : (
                <AlertOctagon className="h-5 w-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <DialogTitle className="text-base font-bold font-heading text-[#2D3748]">
                  Pre-Trade Behavioral Analysis
                </DialogTitle>
                <Badge variant="outline" className={cn("text-xs font-mono font-bold uppercase rounded-[12px] px-2.5 py-0.5", statusBg)}>
                  {analysisResult.status}
                </Badge>
              </div>
              <DialogDescription className="text-xs text-[#718096] font-mono mt-0.5">
                {selectedSymbol} • {numLots} Lots @ ${entryPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </DialogDescription>
            </div>
          </div>

          <button 
            onClick={handleClose}
            className="h-8 w-8 rounded-full flex items-center justify-center neu-raised-sm hover:neu-inset-sm text-[#718096] hover:text-[#2D3748] transition-all cursor-pointer"
            title="Close Analysis"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body: Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4.5 font-body">
          {/* Override Warning State */}
          {showOverrideWarning ? (
            <div className="p-5 rounded-[24px] bg-[#E0E5EC] neu-inset-sm border border-[#FF6B6B]/40 space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center gap-2 text-[#FF6B6B] font-heading font-bold text-sm">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                <span>Rule Override Warning</span>
              </div>
              <p className="text-sm text-[#4A5568] leading-relaxed">
                This order risks <strong>${dollarRisk.toFixed(2)} ({riskPct.toFixed(2)}%)</strong>, exceeding your active playbook limit. 
                Historical audit data confirms that rule-violating trades significantly increase loss rates and accelerate account drawdowns.
              </p>
              <p className="text-xs text-[#718096]">
                Are you sure you want to bypass your personal guardrails and place this trade?
              </p>
              <div className="flex gap-3 pt-2">
                <Button 
                  onClick={() => setShowOverrideWarning(false)}
                  className="flex-1 bg-[#E0E5EC] neu-raised-sm border border-[#A0AEC0]/25 rounded-[20px] text-xs text-[#4A5568] hover:text-[#2D3748] py-2.5 cursor-pointer font-heading"
                >
                  Back to Analysis
                </Button>
                <Button 
                  disabled={isExecuting}
                  onClick={() => {
                    onConfirmOrder('overridden');
                  }}
                  className="flex-1 bg-[#FF6B6B] hover:bg-[#FF6B6B]/90 text-xs font-heading font-bold text-white py-2.5 cursor-pointer rounded-[20px] shadow-md flex items-center justify-center gap-1.5"
                >
                  {isExecuting ? (
                    <>
                      <div className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      <span>Overriding Guardrail...</span>
                    </>
                  ) : (
                    <span>Confirm Rule Override</span>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* 1. Status & Title Banner */}
              <div className={cn(
                "p-4 rounded-[22px] space-y-2.5 bg-[#E0E5EC] neu-raised-sm",
                isSafe ? "border border-[#38B2AC]/30" : isCaution ? "border border-[#D69E2E]/35" : "border border-[#FF6B6B]/40"
              )}>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className={cn("text-sm font-bold font-heading tracking-tight", statusColor)}>
                    {analysisResult.title}
                  </span>
                  {analysisResult.behaviorDetected && (
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-[12px] bg-[#FF6B6B]/15 border border-[#FF6B6B]/30 text-[#FF6B6B] text-xs font-heading font-semibold">
                      <Flame className="w-3.5 h-3.5 shrink-0" />
                      <span>{analysisResult.behaviorDetected}</span>
                    </div>
                  )}
                </div>

                <p className="text-xs sm:text-sm text-[#4A5568] leading-relaxed">
                  {analysisResult.message}
                </p>
              </div>

              {/* 2. CONSEQUENCES SECTION */}
              {!isSafe && analysisResult.consequences && analysisResult.consequences.length > 0 && (
                <div className="p-4.5 rounded-[24px] bg-[#E0E5EC] neu-inset-sm border border-[#FF6B6B]/25 space-y-3">
                  <div className="flex items-center justify-between pb-1.5 border-b border-[#A0AEC0]/20">
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
                      <div key={idx} className="p-3.5 rounded-[18px] bg-[#E0E5EC] neu-raised-sm border border-[#A0AEC0]/15 space-y-1">
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
                        <p className="text-xs text-[#4A5568] leading-relaxed">
                          {c.detail}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. PROTOCOL TO AVOID SECTION */}
              {!isSafe && protocols.length > 0 && (
                <div className="p-4.5 rounded-[24px] bg-[#E0E5EC] neu-inset-sm border border-[#38B2AC]/25 space-y-3">
                  <div className="flex items-center justify-between pb-1.5 border-b border-[#A0AEC0]/20">
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
                      <div key={idx} className="p-3 rounded-[18px] bg-[#E0E5EC] neu-raised-sm border border-[#A0AEC0]/15 flex items-start gap-3">
                        <span className="flex items-center justify-center h-6 w-6 rounded-full bg-[#6C63FF]/15 text-[#6C63FF] text-xs font-mono font-bold shrink-0 mt-0.5">
                          {p.step}
                        </span>
                        <div className="min-w-0 space-y-0.5">
                          <p className="text-xs font-heading font-bold text-[#2D3748]">
                            {p.action}
                          </p>
                          {p.explanation && (
                            <p className="text-[11px] text-[#4A5568] leading-relaxed">
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
              <div className="space-y-2 p-4 rounded-[22px] bg-[#E0E5EC] neu-inset-sm border border-[#A0AEC0]/20 text-sm">
                <span className="text-xs font-bold text-[#4A5568] uppercase tracking-wider block font-heading">
                  Rule Evaluation Checklist
                </span>
                <div className="space-y-1">
                  {analysisResult.rules?.map((r, idx) => (
                    <div key={idx} className="flex items-center justify-between py-1.5 border-b border-[#A0AEC0]/15 last:border-0 gap-2">
                      <span className="text-[#2D3748] text-xs font-medium truncate">{r.name}</span>
                      <span className={cn(
                        "text-xs font-mono px-2.5 py-0.5 rounded-[12px] font-bold shrink-0",
                        r.passed ? "bg-[#38B2AC]/15 text-[#38B2AC] border border-[#38B2AC]/30" : "bg-[#FF6B6B]/15 text-[#FF6B6B] border border-[#FF6B6B]/30"
                      )}>
                        {r.passed ? 'PASS' : 'FAIL'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer: Action Controls */}
        {!showOverrideWarning && (
          <div className="px-6 py-4 border-t border-[#A0AEC0]/25 bg-[#E0E5EC] flex flex-wrap items-center justify-end gap-2.5 shrink-0">
            {isSafe ? (
              <>
                <Button 
                  variant="outline"
                  onClick={handleClose}
                  className="bg-[#E0E5EC] neu-raised-sm rounded-[22px] border border-[#A0AEC0]/20 text-[#4A5568] hover:text-[#2D3748] px-4 py-2 text-xs font-heading cursor-pointer"
                >
                  Edit Inputs
                </Button>
                <Button 
                  disabled={isExecuting}
                  onClick={() => {
                    onConfirmOrder('proceeded');
                  }}
                  className="neu-btn-primary font-heading font-bold px-6 py-2.5 rounded-[22px] cursor-pointer text-xs sm:text-sm shadow-md text-white flex items-center gap-1.5"
                >
                  {isExecuting ? (
                    <>
                      <div className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      <span>Placing Order...</span>
                    </>
                  ) : (
                    <span>Place Order</span>
                  )}
                </Button>
              </>
            ) : isBlocked ? (
              <Button 
                onClick={handleClose}
                className="bg-[#E0E5EC] neu-raised-sm rounded-[22px] text-[#2D3748] font-heading font-bold px-6 py-2.5 text-xs sm:text-sm border border-[#A0AEC0]/20 cursor-pointer"
              >
                Close & Return to Terminal
              </Button>
            ) : (
              <>
                {analysisResult.recommendedLots && onApplyProtocol && (
                  <Button 
                    onClick={handleApply}
                    className="bg-[#38B2AC] hover:bg-[#38B2AC]/90 text-white font-heading font-bold px-4 py-2.5 rounded-[22px] cursor-pointer text-xs shadow-md flex items-center gap-1.5"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Auto-Apply Safe Setup ({analysisResult.recommendedLots} Lots)</span>
                  </Button>
                )}
                <Button 
                  onClick={handleClose}
                  className="bg-[#E0E5EC] neu-raised-sm rounded-[22px] border border-[#A0AEC0]/20 text-[#2D3748] hover:text-[#6C63FF] font-heading font-bold px-4 py-2.5 text-xs cursor-pointer flex items-center gap-1.5"
                >
                  <span>Fix Risk (Edit Inputs)</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setShowOverrideWarning(true)}
                  className="bg-[#E0E5EC] neu-raised-sm rounded-[22px] text-[#FF6B6B] border border-[#FF6B6B]/30 hover:bg-[#FF6B6B]/10 px-4 py-2.5 text-xs font-heading cursor-pointer"
                >
                  Override Guardrail
                </Button>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

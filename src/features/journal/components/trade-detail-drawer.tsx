'use client';

import React from 'react';
import { Layers, Shield, CheckCircle2, AlertCircle } from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';
import { TradeRecord, ActiveRuleItem } from '../types';

interface TradeDetailDrawerProps {
  trade: TradeRecord;
  activeRulesList: ActiveRuleItem[];
}

export function TradeDetailDrawer({ trade, activeRulesList }: TradeDetailDrawerProps) {
  return (
    <tr className="bg-[#E0E5EC] border-y border-[#A0AEC0]/25 animate-in fade-in duration-200">
      <td colSpan={6} className="p-0">
        <div className="p-5 md:p-6 grid grid-cols-1 md:grid-cols-3 gap-5 border-l-4 border-l-[#6C63FF] bg-[#E0E5EC]">
          
          {/* Col 1: Position Details */}
          <div className="p-4 md:p-5 rounded-[22px] bg-[#E0E5EC] neu-inset-sm border border-[#A0AEC0]/20 space-y-3.5">
            <h4 className="font-heading text-sm font-bold uppercase tracking-wider text-[#2D3748] border-b border-[#A0AEC0]/20 pb-2.5 flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#6C63FF]" />
              <span>Position Execution & Metrics</span>
            </h4>
            <div className="grid grid-cols-2 gap-y-3 text-sm">
              <span className="text-[#4A5568]">Position Volume:</span>
              <span className="font-mono font-bold text-[#2D3748]">{trade.lotSize} lots</span>

              <span className="text-[#4A5568]">Exact Holding Time:</span>
              <span className="font-mono text-[#2D3748]">{trade.duration}</span>

              <span className="text-[#4A5568]">Entry Price:</span>
              <span className="font-mono text-[#2D3748]">${trade.entry.toFixed(2)}</span>

              <span className="text-[#4A5568]">Exit Price:</span>
              <span className="font-mono text-[#2D3748]">{trade.exit !== null && trade.exit !== undefined ? `$${trade.exit.toFixed(2)}` : 'Position Open'}</span>

              <span className="text-[#4A5568]">Stop-Loss:</span>
              <span className="font-mono text-[#4A5568]">{trade.stopLoss ? `$${trade.stopLoss.toFixed(2)}` : 'No Hard SL Placed'}</span>

              <span className="text-[#4A5568]">Take-Profit:</span>
              <span className="font-mono text-[#4A5568]">{trade.takeProfit ? `$${trade.takeProfit.toFixed(2)}` : 'Manual Market Exit'}</span>

              <span className="text-[#4A5568]">Planned R:R:</span>
              <span className="font-mono font-bold text-[#2D3748]">{trade.rr}</span>

              <span className="text-[#4A5568]">Strategy / Playbook:</span>
              <span className="font-mono text-[#6C63FF] font-medium">{trade.strategy}</span>

              <span className="text-[#4A5568]">Realized P&L:</span>
              <span className={cn(
                "font-mono font-bold text-base", 
                trade.pnl === null || trade.pnl === undefined
                  ? "text-[#6C63FF]"
                  : trade.pnl >= 0 ? "text-[#38B2AC]" : "text-[#FF6B6B]"
              )}>
                {trade.pnl !== null && trade.pnl !== undefined
                  ? `${trade.pnl >= 0 ? '+' : ''}${formatCurrency(trade.pnl)}`
                  : 'Open Position (Unrealized)'
                }
              </span>
            </div>
          </div>

          {/* Col 2: Rule Breaches & Behavioral Diagnostic */}
          <div className="p-4 md:p-5 rounded-[22px] bg-[#E0E5EC] neu-inset-sm border border-[#A0AEC0]/20 space-y-3.5">
            <h4 className="font-heading text-sm font-bold uppercase tracking-wider text-[#2D3748] border-b border-[#A0AEC0]/20 pb-2.5 flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#6C63FF]" />
              <span>Playbook Rule Diagnostic</span>
            </h4>
            {trade.breaches.length === 0 ? (
              <div className="flex gap-3 items-start p-4 rounded-[18px] bg-[#38B2AC]/15 border border-[#38B2AC]/30 text-sm">
                <CheckCircle2 className="text-[#38B2AC] shrink-0 mt-0.5" size={18} />
                <div className="space-y-1">
                  <strong className="text-[#38B2AC] block font-bold font-heading text-sm">100% Playbook Compliant</strong>
                  <span className="text-[#2D3748] leading-relaxed block font-body text-xs">
                    Zero rule breaches detected on this trade. Execution respected permitted trading sessions, position risk boundaries, and holding discipline.
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-[18px] bg-[#FF6B6B]/15 border border-[#FF6B6B]/30 text-sm space-y-2.5">
                <div className="flex items-center gap-2 text-[#FF6B6B] font-heading font-bold text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{trade.breaches.length} Rule {trade.breaches.length === 1 ? 'Breach' : 'Breaches'} Detected</span>
                </div>
                <div className="space-y-2 pt-1">
                  {trade.breaches.map((b, bi) => (
                    <div key={bi} className="flex items-center gap-2 text-[#FF6B6B] text-xs font-mono bg-[#E0E5EC] p-2.5 rounded-[12px] border border-[#FF6B6B]/30">
                      <span className="w-2 h-2 rounded-full bg-[#FF6B6B] shrink-0" />
                      <span className="font-semibold">{b}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Col 3: Rule Checklist */}
          <div className="p-4 md:p-5 rounded-[22px] bg-[#E0E5EC] neu-inset-sm border border-[#A0AEC0]/20 space-y-3.5">
            <h4 className="font-heading text-sm font-bold uppercase tracking-wider text-[#2D3748] border-b border-[#A0AEC0]/20 pb-2.5 flex items-center justify-between">
              <span>Active Guardrails ({activeRulesList.length})</span>
              <span className="text-xs text-[#4A5568] font-normal font-mono">Audited</span>
            </h4>
            <div className="space-y-2.5 text-sm max-h-60 overflow-y-auto pr-1">
              {activeRulesList.length === 0 ? (
                <p className="text-[#4A5568] text-xs font-body">No active trading rules defined. Configure rules in the Rules page to enable automated trade compliance auditing.</p>
              ) : (
                activeRulesList.map((rule, i) => {
                  const isBreached = trade.breaches.some(b => {
                    const bLow = b.toLowerCase();
                    const rNameLow = (rule.name || '').toLowerCase();
                    const rTypeLow = (rule.ruleType || '').toLowerCase();
                    if (bLow.includes(rNameLow) || rNameLow.includes(bLow)) return true;
                    if (rTypeLow.includes('trades_per_day') && (bLow.includes('trades per day') || bLow.includes('trades/day'))) return true;
                    if (rTypeLow.includes('risk') && (bLow.includes('risk per trade') || bLow.includes('max risk'))) return true;
                    if (rTypeLow.includes('daily_loss') && (bLow.includes('daily loss') || bLow.includes('circuit breaker'))) return true;
                    if (rTypeLow.includes('stop_loss') && (bLow.includes('stop-loss') || bLow.includes('stop loss'))) return true;
                    if (rTypeLow.includes('lot_size') && (bLow.includes('lot size') || bLow.includes('position size'))) return true;
                    if (rTypeLow.includes('cooldown') && (bLow.includes('cooldown') || bLow.includes('recovery attempt'))) return true;
                    if (rTypeLow.includes('consecutive') && (bLow.includes('consecutive loss') || bLow.includes('streak'))) return true;
                    if (rTypeLow.includes('reward') && (bLow.includes('risk/reward') || bLow.includes('r:r'))) return true;
                    if (rTypeLow.includes('symbol') && (bLow.includes('instruments') || bLow.includes('symbols') || bLow.includes('playbook'))) return true;
                    if (rTypeLow.includes('session') && (bLow.includes('session') || bLow.includes('hours'))) return true;
                    return false;
                  });
                  return (
                    <div key={i} className="flex gap-2.5 items-center justify-between py-1.5 border-b border-[#A0AEC0]/20 last:border-0">
                      <div className="flex flex-col">
                        <span className={cn("text-xs font-semibold", isBreached ? 'text-[#FF6B6B]' : 'text-[#2D3748]')}>
                          {rule.name}
                        </span>
                        {rule.value && (
                          <span className="text-[11px] font-mono text-[#4A5568]">
                            Threshold: {rule.value} {rule.unit || ''}
                          </span>
                        )}
                      </div>
                      {!isBreached ? (
                        <div className="flex items-center gap-1 text-xs text-[#38B2AC] shrink-0 font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#38B2AC]" />
                          <span>Pass</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-xs text-[#FF6B6B] shrink-0 font-bold">
                          <AlertCircle className="w-3.5 h-3.5 text-[#FF6B6B]" />
                          <span>Breached</span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>
      </td>
    </tr>
  );
}

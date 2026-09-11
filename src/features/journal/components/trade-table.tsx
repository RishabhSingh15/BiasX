'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { ChevronRight, TrendingUp, TrendingDown, Layers } from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';
import { TradeRecord, ActiveRuleItem } from '../types';
import { TradeDetailDrawer } from './trade-detail-drawer';

interface TradeTableProps {
  trades: TradeRecord[];
  loading: boolean;
  activeRulesList: ActiveRuleItem[];
  allTradesCount: number;
}

export function TradeTable({
  trades,
  loading,
  activeRulesList,
  allTradesCount,
}: TradeTableProps) {
  const [expandedId, setExpandedId] = useState<string | number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  const totalPages = Math.ceil(trades.length / pageSize) || 1;
  const paginatedTrades = trades.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <Card className="overflow-hidden bg-[#E0E5EC] neu-raised rounded-[32px] border border-[#A0AEC0]/20 shadow-none">
      <div className="overflow-x-auto">
        <table className="w-full text-left table-fixed min-w-[780px]">
          <colgroup>
            <col className="w-[24%]" />
            <col className="w-[16%]" />
            <col className="w-[14%]" />
            <col className="w-[14%]" />
            <col className="w-[18%]" />
            <col className="w-[14%]" />
          </colgroup>
          <thead className="text-sm font-heading font-semibold uppercase tracking-wider text-[#4A5568] bg-[#E0E5EC] border-b border-[#A0AEC0]/25">
            <tr>
              <th className="py-4 px-4">Date & Time</th>
              <th className="py-4 px-4">Symbol</th>
              <th className="py-4 px-4">Side</th>
              <th className="py-4 px-4 text-right">Volume</th>
              <th className="py-4 px-4 text-right">Entry → Exit</th>
              <th className="py-4 px-4 text-right">Net P&L</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#A0AEC0]/20 text-sm font-mono">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-[#4A5568]">
                  <div className="flex items-center justify-center gap-2 font-body text-sm">
                    <div className="w-4 h-4 rounded-full border-2 border-[#6C63FF] border-t-transparent animate-spin" />
                    <span>Loading trade execution history...</span>
                  </div>
                </td>
              </tr>
            ) : trades.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-14 text-center text-[#4A5568]">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="w-12 h-12 rounded-[20px] bg-[#E0E5EC] neu-inset-sm flex items-center justify-center text-[#718096] mb-1">
                      <Layers className="w-6 h-6" />
                    </div>
                    <p className="text-base font-bold text-[#2D3748] font-heading">No trades recorded in journal</p>
                    <p className="text-sm text-[#4A5568] max-w-md font-body">
                      {allTradesCount === 0 
                        ? "Import your MT5 or CSV statement in Accounts to view your complete trade journal and behavioral audit."
                        : "No trades match the selected filter criteria. Try selecting All Pairs or clearing your search."}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedTrades.map((trade) => (
                <React.Fragment key={trade.id}>
                  <tr 
                    className={cn(
                      "hover:bg-[#A0AEC0]/15 cursor-pointer transition-colors group",
                      expandedId === trade.id && "bg-[#A0AEC0]/20"
                    )}
                    onClick={() => setExpandedId(expandedId === trade.id ? null : trade.id)}
                  >
                    {/* 1. Date & Time */}
                    <td className="py-4 px-4 text-[#4A5568]">
                      <div className="flex items-center gap-2.5">
                        <span className={cn(
                          "p-1 rounded-md transition-transform duration-200 text-[#6C63FF]",
                          expandedId === trade.id ? "rotate-90 bg-[#6C63FF]/15" : "group-hover:translate-x-0.5"
                        )}>
                          <ChevronRight size={17} />
                        </span>
                        <span className="text-sm font-medium font-mono text-[#2D3748]">{trade.date}</span>
                      </div>
                    </td>

                    {/* 2. Symbol */}
                    <td className="py-4 px-4">
                      <span className="font-bold text-[#2D3748] text-base tracking-wide font-heading">{trade.symbol}</span>
                    </td>

                    {/* 3. Side */}
                    <td className="py-4 px-4">
                      <span className={cn(
                        "font-bold px-3 py-1 rounded-[14px] border inline-flex items-center gap-1.5 text-xs font-heading",
                        trade.direction === 'LONG' 
                          ? "text-[#38B2AC] border-[#38B2AC]/40 bg-[#38B2AC]/15" 
                          : "text-[#FF6B6B] border-[#FF6B6B]/40 bg-[#FF6B6B]/15"
                      )}>
                        {trade.direction === 'LONG' ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                        {trade.direction}
                      </span>
                    </td>

                    {/* 4. Volume */}
                    <td className="py-4 px-4 text-right">
                      <span className="text-sm font-bold text-[#2D3748] font-mono">
                        {trade.lotSize} lots
                      </span>
                    </td>

                    {/* 5. Entry → Exit */}
                    <td className="py-4 px-4 text-right">
                      {trade.exit !== null && trade.exit !== undefined ? (
                        <span className="text-sm font-mono text-[#4A5568]">
                          ${trade.entry.toLocaleString(undefined, { minimumFractionDigits: 2 })} → ${trade.exit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      ) : (
                        <span className="text-sm font-mono text-[#4A5568] inline-flex items-center justify-end gap-1.5">
                          <span>${trade.entry.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-[10px] bg-[#6C63FF]/15 text-[#6C63FF] border border-[#6C63FF]/30 font-mono uppercase tracking-wider">
                            ACTIVE
                          </span>
                        </span>
                      )}
                    </td>

                    {/* 6. Net P&L */}
                    <td className="py-4 px-4 text-right font-bold text-base font-mono">
                      {trade.pnl !== null && trade.pnl !== undefined ? (
                        <span className={trade.pnl >= 0 ? "text-[#38B2AC]" : "text-[#FF6B6B]"}>
                          {trade.pnl > 0 ? '+' : ''}{formatCurrency(trade.pnl)}
                        </span>
                      ) : (
                        <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-[12px] bg-[#6C63FF]/10 text-[#6C63FF] border border-[#6C63FF]/25">
                          OPEN
                        </span>
                      )}
                    </td>
                  </tr>

                  {/* Expanded Detail Drawer */}
                  {expandedId === trade.id && (
                    <TradeDetailDrawer trade={trade} activeRulesList={activeRulesList} />
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[#A0AEC0]/25 text-sm font-mono text-[#4A5568] bg-[#E0E5EC]">
        <div>
          Showing {trades.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, trades.length)} of {trades.length} trades
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            className="px-4 py-1.5 rounded-[16px] bg-[#E0E5EC] neu-raised-sm hover:neu-inset-sm border border-[#A0AEC0]/20 text-[#2D3748] font-heading font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer text-sm"
          >
            Previous
          </button>
          <span className="px-2 text-[#2D3748] font-bold">Page {currentPage} of {totalPages}</span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className="px-4 py-1.5 rounded-[16px] bg-[#E0E5EC] neu-raised-sm hover:neu-inset-sm border border-[#A0AEC0]/20 text-[#2D3748] font-heading font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer text-sm"
          >
            Next
          </button>
        </div>
      </div>
    </Card>
  );
}

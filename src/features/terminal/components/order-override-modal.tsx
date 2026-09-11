'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface OrderOverrideModalProps {
  dollarRisk: number;
  riskPct: number;
  numLots: number;
  selectedSymbol: string;
  entryPrice: number;
  onCancel: () => void;
  onConfirm: () => void;
}

export function OrderOverrideModal({
  dollarRisk,
  riskPct,
  numLots,
  selectedSymbol,
  entryPrice,
  onCancel,
  onConfirm,
}: OrderOverrideModalProps) {
  return (
    <div className="p-4 rounded-[22px] bg-[#E0E5EC] neu-raised-sm border border-[#FF6B6B]/40 space-y-3 animate-in fade-in duration-200 text-xs">
      <div className="flex items-center gap-2 text-[#FF6B6B] font-heading font-bold">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span>Rule Override Warning</span>
      </div>
      <p className="text-[#4A5568] leading-relaxed font-body">
        This order risks ${dollarRisk.toFixed(2)} ({riskPct.toFixed(2)}%), which exceeds your 1.0% risk rule. Are you sure you want to proceed?
      </p>
      <div className="flex gap-2 pt-1">
        <Button 
          onClick={onCancel}
          className="flex-1 bg-[#E0E5EC] neu-raised-sm border border-[#A0AEC0]/25 rounded-[20px] text-xs text-[#4A5568] hover:text-[#2D3748] py-2 cursor-pointer font-heading"
        >
          Cancel
        </Button>
        <Button 
          onClick={onConfirm}
          className="flex-1 bg-[#FF6B6B] hover:bg-[#FF6B6B]/90 text-xs font-heading font-bold text-white py-2 cursor-pointer rounded-[20px] shadow-md"
        >
          Confirm Order
        </Button>
      </div>
    </div>
  );
}

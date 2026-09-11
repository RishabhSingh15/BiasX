'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trash2, RotateCcw, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Rule, RulePreset } from '../types';
import { RuleValueControl } from './rule-value-control';

interface RuleCardProps {
  rule: Rule;
  preset?: RulePreset;
  onToggleActive: (id: string, active: boolean) => void;
  onUpdateValue: (id: string, value: string) => void;
  onDeleteRule: (id: string) => void;
  onResetValue: (id: string) => void;
}

export function RuleCard({
  rule,
  preset,
  onToggleActive,
  onUpdateValue,
  onDeleteRule,
  onResetValue,
}: RuleCardProps) {
  const [isSaved, setIsSaved] = useState(false);

  const handleValueChange = (newVal: string) => {
    onUpdateValue(rule.id, newVal);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 1200);
  };

  const effectivePreset = preset || {
    type: rule.ruleType,
    name: rule.name,
    category: (rule.category || 'entry') as any,
    defaultValue: rule.value || '1',
    unit: rule.unit || '',
    inputType: (rule.unit === 'ratio' ? 'ratio' : rule.unit === 'trades/day' ? 'stepper' : 'number') as any,
    severity: (rule.severity || 'strict') as any,
    desc: 'Enforced trading guardrail for disciplined risk execution.',
  };

  return (
    <Card className={cn(
      "p-5 md:p-6 rounded-[28px] border transition-all flex flex-col justify-between bg-[#E0E5EC]",
      rule.isActive
        ? "neu-raised border-[#A0AEC0]/25 shadow-sm"
        : "neu-inset-sm border-transparent opacity-60 hover:opacity-90"
    )}>
      <div className="space-y-4">
        {/* Top Bar: Active Toggle & Name & Severity Badge */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            {/* iOS-Style Neumorphic Switch */}
            <button
              type="button"
              onClick={() => onToggleActive(rule.id, !rule.isActive)}
              className={cn(
                "w-12 h-6.5 rounded-full transition-colors relative cursor-pointer shrink-0 mt-0.5 p-0.5",
                rule.isActive ? "bg-[#6C63FF]" : "bg-[#A0AEC0]/40 neu-inset-sm"
              )}
            >
              <div className={cn(
                "w-5.5 h-5.5 rounded-full bg-white transition-transform shadow-md",
                rule.isActive ? "translate-x-5.5" : "translate-x-0"
              )} />
            </button>

            <div>
              <h4 className="text-sm md:text-base font-bold text-[#2D3748] font-heading leading-snug">
                {rule.name}
              </h4>
              <p className="text-xs text-[#4A5568] leading-relaxed mt-1 font-body">
                {effectivePreset.desc}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Severity Pill */}
            <Badge variant="outline" className={cn(
              "text-[10px] font-mono font-bold uppercase rounded-[12px] px-2 py-0.5 border",
              effectivePreset.severity === 'critical'
                ? "bg-[#FF6B6B]/15 text-[#FF6B6B] border-[#FF6B6B]/40"
                : effectivePreset.severity === 'strict'
                  ? "bg-[#F6AD55]/15 text-[#DD6B20] border-[#F6AD55]/40"
                  : "bg-[#38B2AC]/15 text-[#38B2AC] border-[#38B2AC]/40"
            )}>
              {effectivePreset.severity}
            </Badge>

            {rule.isCustom && (
              <button
                type="button"
                onClick={() => onDeleteRule(rule.id)}
                className="p-1 rounded-[10px] text-[#A0AEC0] hover:text-[#FF6B6B] transition-colors cursor-pointer"
                title="Delete Custom Rule"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Specialized Value Control */}
        <div className="p-4 rounded-[22px] bg-[#E0E5EC] neu-inset-sm border border-[#A0AEC0]/20">
          <RuleValueControl
            preset={effectivePreset}
            value={rule.value}
            onChange={handleValueChange}
          />
        </div>
      </div>

      {/* Bottom Status / Reset Bar */}
      <div className="flex items-center justify-between pt-3 mt-4 border-t border-[#A0AEC0]/20 text-xs text-[#4A5568] font-mono">
        <div className="flex items-center gap-1.5">
          {isSaved ? (
            <span className="text-[#38B2AC] font-semibold flex items-center gap-1">
              <Check className="w-3.5 h-3.5" /> Saved
            </span>
          ) : (
            <span>Status: <strong className={rule.isActive ? "text-[#38B2AC]" : "text-[#718096]"}>{rule.isActive ? 'Active & Enforced' : 'Paused'}</strong></span>
          )}
        </div>

        <button
          type="button"
          onClick={() => onResetValue(rule.id)}
          className="text-xs text-[#4A5568] hover:text-[#6C63FF] transition-colors flex items-center gap-1 cursor-pointer"
          title="Reset to default benchmark"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset</span>
        </button>
      </div>
    </Card>
  );
}

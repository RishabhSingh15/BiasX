'use client';

import React, { useState } from 'react';
import { 
  X, 
  Plus, 
  ShieldCheck, 
  ShieldAlert, 
  Clock, 
  Flame, 
  Zap, 
  Sparkles 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Rule, RuleCategory } from '../types';

interface AddRuleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onRuleAdded: (rule: Rule) => void;
}

const PRESET_TEMPLATES = [
  {
    name: 'Daily Drawdown Circuit Breaker',
    category: 'risk' as RuleCategory,
    ruleType: 'max_daily_loss',
    value: '2.0',
    unit: '%',
    severity: 'critical' as const,
    description: 'Halt terminal execution if daily realized losses reach this percentage of account equity.',
  },
  {
    name: 'Max Consecutive Losses Circuit Breaker',
    category: 'behavior' as RuleCategory,
    ruleType: 'max_consecutive_losses',
    value: '3',
    unit: 'losses',
    severity: 'critical' as const,
    description: 'Lockout order entries after consecutive losses to prevent emotional tilt and revenge spirals.',
  },
  {
    name: 'Minimum Setup Risk-to-Reward',
    category: 'entry' as RuleCategory,
    ruleType: 'min_risk_reward',
    value: '2.0',
    unit: 'ratio',
    severity: 'strict' as const,
    description: 'Require take-profit distance to be at least this multiple of stop-loss risk before entry.',
  },
  {
    name: 'Post-Loss Detachment Cooldown',
    category: 'behavior' as RuleCategory,
    ruleType: 'cooldown_after_loss',
    value: '15',
    unit: 'minutes',
    severity: 'critical' as const,
    description: 'Mandatory waiting period after a closed losing trade before any new position can be entered.',
  },
  {
    name: 'Max Trades Per Hour Churn Cap',
    category: 'timing' as RuleCategory,
    ruleType: 'max_trades_per_hour',
    value: '3',
    unit: 'trades/hour',
    severity: 'strict' as const,
    description: 'Prevent high-frequency overactivity by enforcing a maximum execution count per rolling 60 minutes.',
  },
  {
    name: 'Single Position Lot Ceiling',
    category: 'risk' as RuleCategory,
    ruleType: 'max_lot_size',
    value: '0.10',
    unit: 'lots',
    severity: 'critical' as const,
    description: 'Hard cap on single order quantity to eliminate accidental oversize orders and fat-finger errors.',
  },
];

export function AddRuleDialog({ isOpen, onClose, onRuleAdded }: AddRuleDialogProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<RuleCategory>('risk');
  const [ruleType, setRuleType] = useState('');
  const [value, setValue] = useState('');
  const [unit, setUnit] = useState('');
  const [severity, setSeverity] = useState<'critical' | 'strict' | 'advisory'>('critical');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSelectTemplate = (index: number) => {
    setSelectedTemplate(index);
    const tmpl = PRESET_TEMPLATES[index];
    setName(tmpl.name);
    setCategory(tmpl.category);
    setRuleType(tmpl.ruleType);
    setValue(tmpl.value);
    setUnit(tmpl.unit);
    setSeverity(tmpl.severity);
    setDescription(tmpl.description);
  };

  const handleCustomMode = () => {
    setSelectedTemplate(null);
    setName('');
    setCategory('risk');
    setRuleType('custom_' + Date.now().toString(36));
    setValue('1.0');
    setUnit('%');
    setSeverity('critical');
    setDescription('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a rule name.');
      return;
    }
    if (!value.trim()) {
      setError('Please provide a rule threshold value.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          category,
          ruleType: ruleType.trim() || 'custom_' + Date.now().toString(36),
          value: value.trim(),
          unit: unit.trim(),
          severity,
          description: description.trim(),
          isActive: true
        })
      });

      if (!res.ok) {
        throw new Error('Failed to create rule.');
      }

      const createdRule: Rule = await res.json();
      onRuleAdded(createdRule);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error creating rule');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div 
        className="w-full max-w-2xl bg-[#E0E5EC] neu-raised rounded-[32px] p-6 md:p-8 max-h-[90vh] overflow-y-auto border border-[#A0AEC0]/30 shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#A0AEC0]/25">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[16px] bg-[#E0E5EC] neu-inset-sm flex items-center justify-center text-[#6C63FF]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-[#2D3748] font-heading">Add Trading Guardrail</h2>
              <p className="text-xs text-[#4A5568] font-body">Choose a recommended guardrail or define a custom rule.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-[#E0E5EC] neu-raised-sm hover:neu-inset-sm flex items-center justify-center text-[#4A5568] hover:text-[#2D3748] transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Template Selection Pills */}
        <div className="mt-5 space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-[#4A5568] font-heading">
            Popular Templates
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {PRESET_TEMPLATES.map((tmpl, idx) => (
              <button
                type="button"
                key={tmpl.name}
                onClick={() => handleSelectTemplate(idx)}
                className={cn(
                  "p-3 rounded-[18px] text-left text-xs transition-all cursor-pointer flex flex-col justify-between gap-1",
                  selectedTemplate === idx
                    ? "bg-[#E0E5EC] neu-inset-sm border-2 border-[#6C63FF] text-[#2D3748]"
                    : "bg-[#E0E5EC] neu-raised-sm border border-[#A0AEC0]/20 text-[#4A5568] hover:text-[#2D3748]"
                )}
              >
                <div className="font-bold font-heading text-xs truncate text-[#2D3748]">{tmpl.name}</div>
                <div className="flex items-center justify-between text-[11px] text-[#718096]">
                  <span className="capitalize">{tmpl.category}</span>
                  <span className="font-mono font-bold text-[#6C63FF]">{tmpl.value} {tmpl.unit}</span>
                </div>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={handleCustomMode}
            className="text-xs font-bold text-[#6C63FF] hover:underline mt-1 inline-flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3 h-3" /> Or create a custom rule from scratch
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {error && (
            <div className="p-3 rounded-[16px] bg-[#FF6B6B]/15 border border-[#FF6B6B]/30 text-xs font-semibold text-[#FF6B6B]">
              {error}
            </div>
          )}

          {/* Rule Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-[#4A5568] font-heading">
              Rule Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Max Loss Per Trade Cap"
              className="w-full px-4 py-2.5 rounded-[18px] bg-[#E0E5EC] neu-inset-deep text-sm font-medium text-[#2D3748] focus:outline-none focus:ring-2 focus:ring-[#6C63FF]"
              required
            />
          </div>

          {/* Category & Severity Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-[#4A5568] font-heading">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as RuleCategory)}
                className="w-full px-4 py-2.5 rounded-[18px] bg-[#E0E5EC] neu-inset-deep text-sm font-medium text-[#2D3748] focus:outline-none focus:ring-2 focus:ring-[#6C63FF]"
              >
                <option value="risk">Capital & Risk Limits</option>
                <option value="timing">Timing & Frequency</option>
                <option value="behavior">Behavior & Psychology</option>
                <option value="entry">Execution Playbook</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-[#4A5568] font-heading">
                Severity Level
              </label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as any)}
                className="w-full px-4 py-2.5 rounded-[18px] bg-[#E0E5EC] neu-inset-deep text-sm font-medium text-[#2D3748] focus:outline-none focus:ring-2 focus:ring-[#6C63FF]"
              >
                <option value="critical">Block Order (Critical Guardrail)</option>
                <option value="strict">Warn & Require Acknowledgment (Strict)</option>
                <option value="advisory">Advisory Only (Info)</option>
              </select>
            </div>
          </div>

          {/* Value & Unit Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-[#4A5568] font-heading">
                Threshold Value *
              </label>
              <input
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="e.g. 1.0 or London, New York"
                className="w-full px-4 py-2.5 rounded-[18px] bg-[#E0E5EC] neu-inset-deep text-sm font-medium text-[#2D3748] focus:outline-none focus:ring-2 focus:ring-[#6C63FF]"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-[#4A5568] font-heading">
                Unit / Measurement
              </label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="e.g. %, lots, trades, minutes"
                className="w-full px-4 py-2.5 rounded-[18px] bg-[#E0E5EC] neu-inset-deep text-sm font-medium text-[#2D3748] focus:outline-none focus:ring-2 focus:ring-[#6C63FF]"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-[#4A5568] font-heading">
              Description & Purpose
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Why this rule exists and how it protects your capital..."
              className="w-full px-4 py-2.5 rounded-[18px] bg-[#E0E5EC] neu-inset-deep text-xs font-medium text-[#2D3748] focus:outline-none focus:ring-2 focus:ring-[#6C63FF] resize-none"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#A0AEC0]/25">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              className="rounded-[20px] px-5 py-2 text-xs font-semibold text-[#4A5568] hover:text-[#2D3748] cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="neu-btn-primary text-white rounded-[20px] px-6 py-2 text-xs font-semibold cursor-pointer shadow-md"
            >
              {isSubmitting ? 'Adding Rule...' : 'Save & Enforce Rule'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

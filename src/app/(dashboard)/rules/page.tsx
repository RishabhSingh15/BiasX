'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Plus, 
  ShieldCheck, 
  Trash2, 
  CheckSquare, 
  AlertTriangle, 
  Clock, 
  Shield, 
  CheckCircle2, 
  X,
  Sliders,
  Edit2,
  Sparkles,
  RotateCcw,
  Check,
  Flame,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface RulePreset {
  type: string;
  name: string;
  category: 'risk' | 'entry' | 'behavior' | 'timing';
  defaultValue: string;
  unit: string;
  inputType: 'stepper' | 'number' | 'ratio' | 'sessions' | 'symbols' | 'boolean';
  min?: number;
  max?: number;
  step?: number;
  chips?: string[];
  severity: 'critical' | 'strict' | 'advisory';
  desc: string;
}

export const RULE_PRESETS: RulePreset[] = [
  // ─── 1. TIMING RULES ────────────────────────────────────────────────────────
  {
    type: 'max_trades_per_day',
    category: 'timing',
    name: 'Max Trades Per Day Limit',
    defaultValue: '5',
    unit: 'trades/day',
    inputType: 'stepper',
    min: 1,
    max: 30,
    step: 1,
    chips: ['3', '5', '8', '10'],
    severity: 'critical',
    desc: 'Halt trading when reaching this daily limit to eliminate overtrading and mental fatigue.',
  },
  {
    type: 'max_trades_per_hour',
    category: 'timing',
    name: 'Max Trades Per Hour Frequency',
    defaultValue: '3',
    unit: 'trades/hour',
    inputType: 'stepper',
    min: 1,
    max: 15,
    step: 1,
    chips: ['2', '3', '4', '5'],
    severity: 'strict',
    desc: 'Cap executions within any 60-minute window to prevent rapid overactivity and churn.',
  },
  {
    type: 'max_trades_per_30min',
    category: 'timing',
    name: 'Max Trades in 30 Minutes',
    defaultValue: '2',
    unit: 'trades/30m',
    inputType: 'stepper',
    min: 1,
    max: 10,
    step: 1,
    chips: ['1', '2', '3', '4'],
    severity: 'strict',
    desc: 'Detect and prevent impulsive rapid-fire trade clusters inside rolling 30-minute windows.',
  },
  {
    type: 'allowed_sessions',
    category: 'timing',
    name: 'Permitted Trading Sessions',
    defaultValue: 'London, New York',
    unit: 'sessions',
    inputType: 'sessions',
    severity: 'strict',
    desc: 'Only enter trades during approved high-liquidity sessions (London, New York, Asian).',
  },

  // ─── 2. RISK RULES ──────────────────────────────────────────────────────────
  {
    type: 'max_risk',
    category: 'risk',
    name: 'Max Risk Per Trade Cap',
    defaultValue: '1.0',
    unit: '%',
    inputType: 'number',
    min: 0.1,
    max: 10.0,
    step: 0.1,
    chips: ['0.5', '1.0', '1.5', '2.0', '3.0'],
    severity: 'critical',
    desc: 'Hard risk cap: Never risk more than this percentage of account balance on a single position.',
  },
  {
    type: 'max_daily_loss',
    category: 'risk',
    name: 'Max Daily Loss Circuit Breaker',
    defaultValue: '2.0',
    unit: '%',
    inputType: 'number',
    min: 0.5,
    max: 20.0,
    step: 0.5,
    chips: ['1.0', '2.0', '3.0', '4.0', '5.0'],
    severity: 'critical',
    desc: 'If daily realized drawdown reaches this threshold, power down the terminal for the day.',
  },
  {
    type: 'max_lot_size',
    category: 'risk',
    name: 'Maximum Position Lot Size',
    defaultValue: '1.0',
    unit: 'lots',
    inputType: 'number',
    min: 0.01,
    max: 50.0,
    step: 0.1,
    chips: ['0.10', '0.50', '1.00', '2.00', '5.00'],
    severity: 'critical',
    desc: 'Hard ceiling on single-order position volume to prevent inadvertent sizing spikes or revenge bets.',
  },
  {
    type: 'daily_profit_target',
    category: 'risk',
    name: 'Daily Profit Target & Capital Lock',
    defaultValue: '2.0',
    unit: '%',
    inputType: 'number',
    min: 0.5,
    max: 20.0,
    step: 0.5,
    chips: ['1.0', '2.0', '3.0', '5.0'],
    severity: 'strict',
    desc: 'Lock in profits once daily target is achieved to prevent late-session giveback tilt.',
  },
  {
    type: 'stop_loss_required',
    category: 'risk',
    name: 'Mandatory Hard Stop-Loss',
    defaultValue: 'true',
    unit: 'enforced',
    inputType: 'boolean',
    severity: 'critical',
    desc: 'Every order must have a registered protective stop-loss placed upon execution.',
  },

  // ─── 3. BEHAVIOR RULES ──────────────────────────────────────────────────────
  {
    type: 'max_consecutive_losses',
    category: 'behavior',
    name: 'Max Consecutive Loss Limit',
    defaultValue: '3',
    unit: 'losses',
    inputType: 'stepper',
    min: 1,
    max: 10,
    step: 1,
    chips: ['2', '3', '4', '5'],
    severity: 'critical',
    desc: 'Mandatory halt after hitting this streak of consecutive losses before emotional tilt occurs.',
  },
  {
    type: 'cooldown_after_loss',
    category: 'behavior',
    name: 'Mandatory Post-Loss Cooldown',
    defaultValue: '15',
    unit: 'minutes',
    inputType: 'number',
    min: 1,
    max: 240,
    step: 5,
    chips: ['5', '10', '15', '30', '60'],
    severity: 'critical',
    desc: 'Mandatory screen detachment following a realized loss before another order can be entered.',
  },
  {
    type: 'cooldown_after_consecutive_losses',
    category: 'behavior',
    name: 'Losing Streak Cooldown',
    defaultValue: '30',
    unit: 'minutes',
    inputType: 'number',
    min: 5,
    max: 480,
    step: 15,
    chips: ['15', '30', '45', '60', '120'],
    severity: 'critical',
    desc: 'Extended mandatory cool-off after hitting consecutive loss cap before risking further capital.',
  },
  {
    type: 'no_lot_increase_after_loss',
    category: 'behavior',
    name: 'No Lot Sizing Escalation After Loss',
    defaultValue: 'true',
    unit: 'enforced',
    inputType: 'boolean',
    severity: 'critical',
    desc: 'Strictly prohibit increasing lot size following a loss. Eliminates martingale & revenge escalation.',
  },

  // ─── 4. ENTRY DISCIPLINE RULES ──────────────────────────────────────────────
  {
    type: 'min_risk_reward',
    category: 'entry',
    name: 'Minimum Risk/Reward Benchmark',
    defaultValue: '2.0',
    unit: 'ratio',
    inputType: 'ratio',
    min: 1.0,
    max: 10.0,
    step: 0.25,
    chips: ['1.5', '2.0', '2.5', '3.0'],
    severity: 'strict',
    desc: 'Setup must offer at least this reward-to-risk ratio (e.g. 1:2.00) with hard SL and TP before entry.',
  },
  {
    type: 'allowed_symbols',
    category: 'entry',
    name: 'Approved Playbook Instruments',
    defaultValue: 'XAUUSD, EURUSD, GBPUSD',
    unit: 'symbols',
    inputType: 'symbols',
    severity: 'strict',
    desc: 'Restrict order executions strictly to your approved watchlist of mastered instruments.',
  },
  {
    type: 'custom_boolean',
    category: 'entry',
    name: 'Custom Playbook Rule',
    defaultValue: 'true',
    unit: 'boolean',
    inputType: 'boolean',
    severity: 'strict',
    desc: 'Custom entry or exit criterion defined for your specific strategy checklist.',
  },
];

// ─── SPECIALIZED VALUE CONTROL COMPONENT ──────────────────────────────────────

interface RuleValueControlProps {
  preset: RulePreset;
  value: string;
  onChange: (val: string) => void;
  compact?: boolean;
}

function RuleValueControl({ preset, value, onChange, compact }: RuleValueControlProps) {
  const [customSymbol, setCustomSymbol] = useState('');

  // 1. SESSIONS INPUT
  if (preset.inputType === 'sessions') {
    const availableSessions = [
      { id: 'Asian', label: 'Asian Session', hours: '00:00 - 09:00 UTC' },
      { id: 'London', label: 'London Session', hours: '08:00 - 16:30 UTC' },
      { id: 'New York', label: 'New York Session', hours: '13:00 - 21:00 UTC' },
    ];

    const currentSessions = (value || '')
      .split(',')
      .map(s => s.trim().toLowerCase())
      .filter(Boolean);

    const toggleSession = (sessionId: string) => {
      const lower = sessionId.toLowerCase();
      let updated: string[];
      if (currentSessions.includes(lower)) {
        updated = currentSessions.filter(s => s !== lower);
      } else {
        updated = [...currentSessions, lower];
      }
      // Re-map to proper title case
      const formatted = updated
        .map(u => {
          const match = availableSessions.find(s => s.id.toLowerCase() === u);
          return match ? match.id : u;
        })
        .join(', ');
      onChange(formatted || 'London, New York');
    };

    return (
      <div className="space-y-2">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {availableSessions.map(session => {
            const isSelected = currentSessions.includes(session.id.toLowerCase());
            return (
              <button
                type="button"
                key={session.id}
                onClick={() => toggleSession(session.id)}
                className={cn(
                  "p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between",
                  isSelected
                    ? "bg-[#2a2a2a]/20 border-[#2a2a2a] text-white shadow-[0_0_10px_rgba(255,255,255,0.1)]"
                    : "bg-black/30 border-white/10 text-slate-400 hover:text-slate-300 hover:border-white/20"
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold font-mono tracking-wide">{session.id}</span>
                  <div className={cn(
                    "w-4 h-4 rounded-full flex items-center justify-center text-[10px]",
                    isSelected ? "bg-[#2a2a2a] text-white" : "border border-white/20 text-transparent"
                  )}>
                    ✓
                  </div>
                </div>
                <span className="text-[10px] font-mono text-slate-400">{session.hours}</span>
              </button>
            );
          })}
        </div>
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 px-1">
          <span>Active: <strong className="text-emerald-400">{value || 'None'}</strong></span>
        </div>
      </div>
    );
  }

  // 2. SYMBOLS INPUT
  if (preset.inputType === 'symbols') {
    const popularSymbols = ['XAUUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'US30', 'NAS100', 'BTCUSD', 'ETHUSD'];
    const activeSymbols = (value || '')
      .split(',')
      .map(s => s.trim().toUpperCase())
      .filter(Boolean);

    const toggleSymbol = (sym: string) => {
      const upper = sym.toUpperCase();
      let updated: string[];
      if (activeSymbols.includes(upper)) {
        updated = activeSymbols.filter(s => s !== upper);
      } else {
        updated = [...activeSymbols, upper];
      }
      onChange(updated.join(', '));
    };

    const handleAddCustom = (e: React.FormEvent) => {
      e.preventDefault();
      if (!customSymbol.trim()) return;
      const clean = customSymbol.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (clean && !activeSymbols.includes(clean)) {
        onChange([...activeSymbols, clean].join(', '));
      }
      setCustomSymbol('');
    };

    const removeSymbol = (sym: string) => {
      const updated = activeSymbols.filter(s => s !== sym);
      onChange(updated.join(', '));
    };

    return (
      <div className="space-y-2.5">
        {/* Active badges */}
        <div className="flex flex-wrap items-center gap-1.5 min-h-[34px] p-2 bg-black/40 border border-white/10 rounded-xl">
          {activeSymbols.length > 0 ? (
            activeSymbols.map(sym => (
              <span
                key={sym}
                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-[#2a2a2a]/20 border border-[#2a2a2a]/40 text-emerald-300 font-mono text-xs font-semibold"
              >
                {sym}
                <button
                  type="button"
                  onClick={() => removeSymbol(sym)}
                  className="text-emerald-300/70 hover:text-red-400 cursor-pointer text-xs leading-none"
                >
                  ×
                </button>
              </span>
            ))
          ) : (
            <span className="text-xs text-slate-500 font-mono italic">No symbols selected. Add below.</span>
          )}
        </div>

        {/* Quick popular chips */}
        <div>
          <span className="text-[11px] text-slate-400 font-mono block mb-1">Quick Select Popular:</span>
          <div className="flex flex-wrap gap-1.5">
            {popularSymbols.map(sym => {
              const active = activeSymbols.includes(sym);
              return (
                <button
                  type="button"
                  key={sym}
                  onClick={() => toggleSymbol(sym)}
                  className={cn(
                    "px-2 py-1 rounded-md text-xs font-mono transition-all cursor-pointer border",
                    active
                      ? "bg-[#2a2a2a] border-[#2a2a2a] text-white"
                      : "bg-black/30 border-white/10 text-slate-400 hover:text-white hover:border-white/20"
                  )}
                >
                  {sym}
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom symbol input */}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Add custom symbol (e.g. AUDUSD)"
            value={customSymbol}
            onChange={(e) => setCustomSymbol(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddCustom(e);
              }
            }}
            className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-slate-400 font-mono focus:outline-none focus:border-[#2a2a2a]"
          />
          <button
            type="button"
            onClick={handleAddCustom}
            className="px-3 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-xs font-semibold text-white border border-white/10 cursor-pointer font-mono"
          >
            + Add
          </button>
        </div>
      </div>
    );
  }

  // 3. BOOLEAN INPUT
  if (preset.inputType === 'boolean') {
    const isEnforced = value === 'true' || value === 'enforced' || value === 'Enforced';
    return (
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onChange('true')}
            className={cn(
              "py-2.5 px-3 rounded-xl border font-mono text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2",
              isEnforced
                ? "bg-[#2a2a2a]/25 border-[#2a2a2a] text-white shadow-[0_0_12px_rgba(255,255,255,0.1)]"
                : "bg-black/30 border-white/10 text-slate-400 hover:text-white"
            )}
          >
            <Check className="w-4 h-4 text-emerald-400" />
            <span>Strictly Enforced (Active)</span>
          </button>
          <button
            type="button"
            onClick={() => onChange('false')}
            className={cn(
              "py-2.5 px-3 rounded-xl border font-mono text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2",
              !isEnforced
                ? "bg-white/[0.08] border-white/20 text-slate-300"
                : "bg-black/30 border-white/10 text-slate-500 hover:text-slate-400"
            )}
          >
            <X className="w-4 h-4 text-slate-400" />
            <span>Permitted / Disabled</span>
          </button>
        </div>
        <p className="text-[11px] text-slate-400 font-mono">
          {isEnforced 
            ? 'Execution will be blocked or flagged as high risk if breached.' 
            : 'Rule inactive; trades will not trigger violations for this parameter.'}
        </p>
      </div>
    );
  }

  // 4. RATIO INPUT (1 : X.X)
  if (preset.inputType === 'ratio') {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="px-3 py-2 bg-black/50 border border-white/10 rounded-xl text-slate-400 font-mono font-bold text-sm">
            1 :
          </div>
          <input
            type="number"
            step="any"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm text-white font-mono font-bold focus:outline-none focus:border-[#2a2a2a]"
          />
          <span className="text-xs font-mono text-slate-400 px-2">Reward/Risk</span>
        </div>
        {preset.chips && (
          <div className="flex items-center gap-1.5 pt-1">
            <span className="text-[11px] text-slate-400 font-mono">Presets:</span>
            {preset.chips.map(chip => (
              <button
                type="button"
                key={chip}
                onClick={() => onChange(chip)}
                className={cn(
                  "px-2 py-0.5 rounded-md text-xs font-mono cursor-pointer border",
                  value === chip
                    ? "bg-[#2a2a2a] border-[#2a2a2a] text-white"
                    : "bg-black/30 border-white/10 text-slate-400 hover:text-white"
                )}
              >
                1:{chip}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // 5. STEPPER INPUT (Integer counts)
  if (preset.inputType === 'stepper') {
    const currentInt = parseInt(value, 10) || 1;
    const handleStep = (delta: number) => {
      const next = Math.max(1, currentInt + delta);
      onChange(String(next));
    };

    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleStep(-1)}
            className="w-10 h-10 rounded-xl bg-black/40 border border-white/10 hover:border-white/25 flex items-center justify-center text-white font-mono text-lg font-bold cursor-pointer hover:bg-white/[0.06] transition-colors"
          >
            -
          </button>
          <div className="relative flex-1">
            <input
              type="number"
              step="any"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-center text-base font-bold text-white font-mono focus:outline-none focus:border-[#2a2a2a]"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400 pointer-events-none">
              {preset.unit}
            </span>
          </div>
          <button
            type="button"
            onClick={() => handleStep(1)}
            className="w-10 h-10 rounded-xl bg-black/40 border border-white/10 hover:border-white/25 flex items-center justify-center text-white font-mono text-lg font-bold cursor-pointer hover:bg-white/[0.06] transition-colors"
          >
            +
          </button>
        </div>
        {preset.chips && (
          <div className="flex items-center gap-1.5 pt-1">
            <span className="text-[11px] text-slate-400 font-mono">Quick Pick:</span>
            {preset.chips.map(chip => (
              <button
                type="button"
                key={chip}
                onClick={() => onChange(chip)}
                className={cn(
                  "px-2 py-0.5 rounded-md text-xs font-mono cursor-pointer border",
                  value === chip
                    ? "bg-[#2a2a2a] border-[#2a2a2a] text-white"
                    : "bg-black/30 border-white/10 text-slate-400 hover:text-white"
                )}
              >
                {chip} {preset.unit.split('/')[0]}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // 6. DEFAULT NUMBER INPUT (% or minutes or lots)
  return (
    <div className="space-y-2">
      <div className="relative">
        <input
          type="number"
          step="any"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm text-white font-mono font-bold focus:outline-none focus:border-[#2a2a2a] pr-20"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded bg-white/[0.08] text-xs font-mono text-emerald-300 font-semibold pointer-events-none">
          {preset.unit}
        </span>
      </div>
      {preset.chips && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] text-slate-400 font-mono">Presets:</span>
          {preset.chips.map(chip => (
            <button
              type="button"
              key={chip}
              onClick={() => onChange(chip)}
              className={cn(
                "px-2 py-0.5 rounded-md text-xs font-mono cursor-pointer border",
                value === chip
                  ? "bg-[#2a2a2a] border-[#2a2a2a] text-white"
                  : "bg-black/30 border-white/10 text-slate-400 hover:text-white"
              )}
            >
              {chip}{preset.unit === '%' ? '%' : ` ${preset.unit}`}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function RulesPage() {
  const [activeTab, setActiveTab] = useState<'risk' | 'entry' | 'behavior' | 'timing'>('risk');
  const [rules, setRules] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Add Rule Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedPresetType, setSelectedPresetType] = useState<string>('max_trades_per_day');
  const [newRuleName, setNewRuleName] = useState('');
  const [newRuleDesc, setNewRuleDesc] = useState('');
  const [newRuleValue, setNewRuleValue] = useState('');
  const [newRuleUnit, setNewRuleUnit] = useState('');
  const [newRuleSeverity, setNewRuleSeverity] = useState<'critical' | 'strict' | 'advisory'>('strict');

  // Edit Rule Modal
  const [editingRule, setEditingRule] = useState<any | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editSeverity, setEditSeverity] = useState<'critical' | 'strict' | 'advisory'>('strict');

  // Playbook Assistant State
  const [showPlaybookAssistant, setShowPlaybookAssistant] = useState(false);
  const [playbookValues, setPlaybookValues] = useState<Record<string, string>>(() => {
    const defaults: Record<string, string> = {};
    RULE_PRESETS.forEach(p => {
      defaults[p.type] = p.defaultValue;
    });
    return defaults;
  });
  const [isDeploying, setIsDeploying] = useState(false);
  const [isReanalyzing, setIsReanalyzing] = useState(false);

  const fetchRules = async () => {
    setIsLoading(true);
    setIsReanalyzing(true);
    try {
      const [rulesRes, statsRes] = await Promise.all([
        fetch('/api/rules', { cache: 'no-store' }).then(r => r.json()),
        fetch('/api/dashboard/stats', { cache: 'no-store' }).then(r => r.json())
      ]);
      if (Array.isArray(rulesRes)) setRules(rulesRes);
      if (statsRes && !statsRes.error) setStats(statsRes);
    } catch (e) {
      console.warn('Error fetching rules and stats:', e);
    } finally {
      setIsLoading(false);
      setIsReanalyzing(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const openAddModal = (presetType?: string) => {
    const targetType = presetType || (
      activeTab === 'risk' ? 'max_risk' :
      activeTab === 'behavior' ? 'cooldown_after_loss' :
      activeTab === 'timing' ? 'max_trades_per_day' : 'min_risk_reward'
    );
    const preset = RULE_PRESETS.find(p => p.type === targetType) || RULE_PRESETS[0];
    setSelectedPresetType(preset.type);
    setNewRuleName(preset.name);
    setNewRuleDesc(preset.desc);
    setNewRuleValue(preset.defaultValue);
    setNewRuleUnit(preset.unit);
    setNewRuleSeverity(preset.severity);
    setShowAddModal(true);
  };

  const handlePresetSelect = (presetType: string) => {
    const preset = RULE_PRESETS.find(p => p.type === presetType);
    if (!preset) return;
    setSelectedPresetType(preset.type);
    setNewRuleName(preset.name);
    setNewRuleDesc(preset.desc);
    setNewRuleValue(preset.defaultValue);
    setNewRuleUnit(preset.unit);
    setNewRuleSeverity(preset.severity);
    setActiveTab(preset.category);
  };

  const openEditModal = (rule: any) => {
    setEditingRule(rule);
    setEditValue(rule.value || '');
    setEditSeverity(rule.severity || 'strict');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRule) return;

    try {
      setIsReanalyzing(true);
      await fetch('/api/rules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingRule.id,
          value: editValue,
          severity: editSeverity,
        })
      });

      setEditingRule(null);
      await fetchRules();
    } catch (err) {
      console.error(err);
      setIsReanalyzing(false);
    }
  };

  const toggleRuleActive = async (id: string, currentActive: boolean) => {
    // Optimistically update rule state immediately
    setRules(prev => prev.map(r => r.id === id ? { ...r, isActive: !currentActive } : r));
    setIsReanalyzing(true);
    try {
      await fetch('/api/rules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isActive: !currentActive })
      });
      await fetchRules();
    } catch (e) {
      console.error(e);
      await fetchRules();
    }
  };

  const deleteRule = async (id: string) => {
    // Optimistically remove from state immediately
    setRules(prev => prev.filter(r => r.id !== id));
    setIsReanalyzing(true);
    try {
      await fetch(`/api/rules?id=${id}`, { method: 'DELETE' });
      await fetchRules();
    } catch (e) {
      console.error(e);
      await fetchRules();
    }
  };

  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleName.trim()) return;

    try {
      await fetch('/api/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newRuleName,
          description: newRuleDesc,
          category: activeTab,
          severity: newRuleSeverity,
          ruleType: selectedPresetType,
          value: newRuleValue,
          unit: newRuleUnit,
          isActive: true
        })
      });

      setShowAddModal(false);
      fetchRules();
    } catch (err) {
      console.error(err);
    }
  };

  // Bulk Deploy All 14 Rules
  const handleDeployAllPlaybook = async () => {
    setIsDeploying(true);
    try {
      // First clean existing rules to prevent duplicates if user is re-initializing
      if (rules.length > 0) {
        await fetch('/api/rules?clearAll=true', { method: 'DELETE' });
      }

      // Filter out custom_boolean from default 14 suite
      const official14 = RULE_PRESETS.filter(p => p.type !== 'custom_boolean');
      const payload = official14.map(p => ({
        name: p.name,
        description: p.desc,
        category: p.category,
        ruleType: p.type,
        value: playbookValues[p.type] !== undefined ? playbookValues[p.type] : p.defaultValue,
        unit: p.unit,
        severity: p.severity,
        isActive: true
      }));

      await fetch('/api/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      setShowPlaybookAssistant(false);
      fetchRules();
    } catch (err) {
      console.error('Error deploying playbook:', err);
    } finally {
      setIsDeploying(false);
    }
  };

  const filteredRules = rules.filter(r => (r.category || 'risk').toLowerCase() === activeTab);
  const activeCount = rules.filter(r => r.isActive !== false).length;
  const selectedPresetObj = RULE_PRESETS.find(p => p.type === selectedPresetType) || RULE_PRESETS[0];

  return (
    <div className="flex flex-col gap-6 max-w-[1600px] mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-[#2a2a2a] animate-pulse" />
            <span className="text-xs font-semibold uppercase tracking-wider text-[#2a2a2a]">Execution Guardrails</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Trading Playbook & Rules</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure your personal trading playbook rules with precision value inputs for live MT5 pre-trade checks and automated audit.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button 
            onClick={() => setShowPlaybookAssistant(!showPlaybookAssistant)}
            variant="outline"
            className="border-[#2a2a2a]/40 bg-[#2a2a2a]/10 hover:bg-[#2a2a2a]/20 text-emerald-300 font-semibold text-xs px-3.5 py-2 rounded-xl flex items-center gap-2 cursor-pointer transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#2a2a2a]" />
            <span>Playbook Preset Suite (14 Presets)</span>
          </Button>

          <Button 
            onClick={() => openAddModal()}
            className="bg-[#2a2a2a] hover:bg-[#333333] text-white font-semibold text-xs px-4 py-2 rounded-xl flex items-center gap-2 shadow-lg cursor-pointer transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Rule</span>
          </Button>
        </div>
      </div>

      {/* Overview Stats Strip */}
      <Card className="p-5 md:p-6 hover:border-neutral-700 transition-all">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5 divide-y md:divide-y-0 md:divide-x divide-white/[0.08]">
          <div className="flex flex-col gap-1.5 pr-2">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Rules Followed</span>
            <span className="text-2xl lg:text-3xl font-bold font-mono tracking-tight text-emerald-400">
              {stats?.behaviorAudit ? `${stats.behaviorAudit.ruleAdherenceRate}%` : (rules.length === 0 ? 'N/A' : '100%')}
            </span>
            <span className="text-xs font-mono text-slate-300">
              {stats?.stats?.totalTrades ?? 0} Total Trades
            </span>
          </div>

          <div className="flex flex-col gap-1.5 pt-3 md:pt-0 md:px-5">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Active Rules</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl lg:text-3xl font-bold font-mono tracking-tight text-white">
                {activeCount}
              </span>
              <span className="text-sm font-mono text-slate-400">/ {rules.length} Active</span>
            </div>
            <span className="text-xs font-mono text-slate-300">
              {rules.length === 0 ? 'No rules set' : activeCount === rules.length ? 'All rules on' : `${rules.length - activeCount} off`}
            </span>
          </div>

          <div className="flex flex-col gap-1.5 pt-3 md:pt-0 md:px-5">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Mistakes</span>
            <span className={cn(
              "text-base font-bold font-mono truncate",
              (stats?.riskMetrics?.ruleViolations || 0) > 0 ? "text-rose-400" : "text-emerald-400"
            )}>
              {stats?.riskMetrics?.ruleViolations ? `${stats.riskMetrics.ruleViolations} Mistakes` : '0 Mistakes'}
            </span>
            <span className="text-xs font-mono text-slate-300">
              {stats?.riskMetrics?.ruleViolations ? 'See in Mistakes page' : 'Clean trading'}
            </span>
          </div>

          <div className="flex flex-col gap-1.5 pt-3 md:pt-0 md:pl-5">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Protection</span>
            <span className="text-base font-bold font-mono text-[#2a2a2a]">Active</span>
            <span className="text-xs font-mono text-slate-300">Checks rules before trades</span>
          </div>
        </div>
      </Card>

      {/* Live Re-Analysis Status Indicator */}
      {isReanalyzing && (
        <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-[#2a2a2a]/15 border border-[#2a2a2a]/30 text-xs text-emerald-300 font-mono animate-in fade-in duration-150">
          <div className="w-3.5 h-3.5 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin shrink-0" />
          <span>Updating trade analysis with active rules...</span>
        </div>
      )}

      {/* Playbook Setup Assistant (Shown if 0 rules OR if toggled) */}
      {(rules.length === 0 || showPlaybookAssistant) && (
        <Card className="p-6 border border-[#2a2a2a]/40 bg-gradient-to-br from-[#2a2a2a]/10 via-[#0B0E12] to-black shadow-2xl relative overflow-hidden">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-white/10">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="px-2 py-0.5 rounded bg-[#2a2a2a]/30 border border-[#2a2a2a]/50 text-emerald-300 text-[11px] font-mono font-bold uppercase tracking-wider">
                  Playbook Starter Pack
                </span>
                <span className="text-xs font-mono text-slate-400">All 14 Rules Ready to Deploy</span>
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                Complete 14-Rule Guardrail Suite
              </h2>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl">
                Tune your thresholds below with specialized value inputs. Deploying will immediately calibrate the behavioral analysis engine against your MT5 trades and activate live terminal protection.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <Button
                onClick={handleDeployAllPlaybook}
                disabled={isDeploying}
                className="bg-[#2a2a2a] hover:bg-[#333333] text-white font-bold text-sm px-6 py-3 rounded-xl shadow-[0_0_20px_rgba(74,115,180,0.4)] cursor-pointer flex items-center gap-2"
              >
                {isDeploying ? (
                  <>
                    <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    <span>Deploying Guardrails...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 fill-white" />
                    <span>Deploy All 14 Rules ({rules.length > 0 ? 'Reset & Deploy' : 'Save & Enforce'})</span>
                  </>
                )}
              </Button>
              {rules.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowPlaybookAssistant(false)}
                  className="p-2 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* Categorized Rules Configuration Matrix */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-6">
            {(['risk', 'timing', 'behavior', 'entry'] as const).map(categoryKey => {
              const catPresets = RULE_PRESETS.filter(p => p.category === categoryKey && p.type !== 'custom_boolean');
              const catTitle = categoryKey === 'risk' ? '1. Risk Limits' :
                               categoryKey === 'timing' ? '2. Session Timing' :
                               categoryKey === 'behavior' ? '3. Behavior & Tilt' : '4. Entry Discipline';
              const CatIcon = categoryKey === 'risk' ? Shield :
                              categoryKey === 'timing' ? Clock :
                              categoryKey === 'behavior' ? AlertTriangle : CheckSquare;

              return (
                <div key={categoryKey} className="flex flex-col gap-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-white/[0.08]">
                    <CatIcon className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-white">{catTitle}</span>
                  </div>

                  <div className="space-y-4">
                    {catPresets.map(preset => {
                      const curVal = playbookValues[preset.type] !== undefined ? playbookValues[preset.type] : preset.defaultValue;
                      return (
                        <div 
                          key={preset.type} 
                          className="p-3.5 rounded-xl bg-black/40 border border-white/[0.08] hover:border-neutral-700 transition-all space-y-2.5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="text-xs font-bold text-white tracking-tight">{preset.name}</h4>
                              <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{preset.desc}</p>
                            </div>
                            <span className={cn(
                              "text-[9px] font-mono font-bold px-1.5 py-0.5 rounded shrink-0",
                              preset.severity === 'critical' ? "text-red-400 bg-red-500/10 border border-red-500/20" : "text-emerald-400 bg-neutral-800/50 border border-neutral-800"
                            )}>
                              {preset.severity.toUpperCase()}
                            </span>
                          </div>

                          <RuleValueControl
                            preset={preset}
                            value={curVal}
                            compact
                            onChange={(val) => {
                              setPlaybookValues(prev => ({ ...prev, [preset.type]: val }));
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Category Tabs */}
      <div className="flex items-center gap-2.5 border-b border-white/10 pb-3 overflow-x-auto">
        {[
          { key: 'risk', label: 'Risk Limits', icon: Shield, count: rules.filter(r => (r.category || '').toLowerCase() === 'risk').length },
          { key: 'timing', label: 'Session Timing', icon: Clock, count: rules.filter(r => (r.category || '').toLowerCase() === 'timing').length },
          { key: 'behavior', label: 'Behavior & Tilt', icon: AlertTriangle, count: rules.filter(r => (r.category || '').toLowerCase() === 'behavior').length },
          { key: 'entry', label: 'Entry Criteria', icon: CheckSquare, count: rules.filter(r => (r.category || 'entry').toLowerCase() === 'entry').length },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer whitespace-nowrap",
              activeTab === tab.key
                ? "bg-[#2a2a2a] text-white shadow-[0_0_12px_rgba(255,255,255,0.1)]"
                : "bg-black/20 text-slate-400 hover:text-white hover:bg-white/[0.06] border border-white/[0.08]"
            )}
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.label}</span>
            <span className={cn(
              "text-xs font-mono px-2 py-0.5 rounded-full font-bold",
              activeTab === tab.key ? "bg-white/20 text-white" : "bg-white/[0.08] text-slate-400"
            )}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Active Rules Grid */}
      {filteredRules.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredRules.map((rule) => {
            const matchedPreset = RULE_PRESETS.find(p => p.type === rule.ruleType);
            const isBool = rule.unit === 'boolean' || rule.unit === 'enforced' || rule.value === 'true' || rule.value === 'false';

            return (
              <Card 
                key={rule.id}
                className={cn(
                  "p-5 md:p-6 transition-all flex flex-col justify-between hover:border-neutral-700",
                  rule.isActive !== false ? "border-white/10" : "border-white/[0.06] opacity-50"
                )}
              >
                <div>
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 shrink-0">
                        <CheckCircle2 className={cn("w-5 h-5", rule.isActive !== false ? "text-emerald-400" : "text-slate-400")} />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className={cn(
                            "text-base font-bold text-white tracking-wide", 
                            rule.isActive === false && "line-through text-slate-400"
                          )}>
                            {rule.name}
                          </h3>
                          {rule.value && (
                            <Badge className="bg-[#2a2a2a]/15 border border-[#2a2a2a]/30 text-emerald-300 font-mono text-xs px-2.5 py-0.5">
                              {isBool ? (rule.value === 'true' ? 'Enforced' : 'Disabled') : `${rule.value} ${rule.unit || ''}`}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2.5 mt-1.5">
                          <Badge 
                            variant="outline"
                            className={cn(
                              "text-xs font-mono font-bold px-2 py-0.5 rounded",
                              rule.severity === 'critical' 
                                ? "border-red-500/40 text-red-400 bg-red-500/10" 
                                : rule.severity === 'strict' 
                                ? "border-neutral-700 text-emerald-400 bg-neutral-800/50" 
                                : "border-white/20 text-slate-200 bg-white/[0.06]"
                            )}
                          >
                            {(rule.severity || 'STRICT').toUpperCase()}
                          </Badge>
                          <span className="text-xs font-mono text-slate-300">
                            Status: <strong className={rule.isActive !== false ? "text-emerald-400 font-bold" : "text-slate-400"}>{rule.isActive !== false ? "Active" : "Disabled"}</strong>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Active Toggle Switch */}
                    <button
                      type="button"
                      onClick={() => toggleRuleActive(rule.id, rule.isActive !== false)}
                      className={cn(
                        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                        rule.isActive !== false ? "bg-[#2a2a2a]" : "bg-white/20"
                      )}
                      title={rule.isActive !== false ? "Deactivate Rule" : "Activate Rule"}
                    >
                      <span
                        className={cn(
                          "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out",
                          rule.isActive !== false ? "translate-x-4" : "translate-x-0"
                        )}
                      />
                    </button>
                  </div>

                  <p className="text-sm text-slate-300 leading-relaxed mt-2.5">
                    {rule.description || "Custom trading guardrail rule."}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-4 mt-4 border-t border-white/[0.08] text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEditModal(rule)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-[#2a2a2a]/20 border border-white/10 hover:border-[#2a2a2a]/40 text-emerald-300 transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit Value</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-[11px]">Enforced in Terminal Check</span>
                    <button 
                      onClick={() => deleteRule(rule.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                      title="Remove Rule"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="p-10 text-center flex flex-col items-center justify-center border-dashed border-white/10 bg-black/20 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-[#2a2a2a]/10 border border-[#2a2a2a]/30 flex items-center justify-center text-[#2a2a2a] shadow-[0_0_15px_rgba(255,255,255,0.1)]">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div className="max-w-md space-y-1.5">
            <h3 className="text-base font-bold text-white">No {activeTab.toUpperCase()} Rules Configured</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Define your personal execution rules for {activeTab}. BiasX will audit your trade history and pre-check live orders against them.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              onClick={() => openAddModal()}
              className="bg-[#2a2a2a] hover:bg-[#333333] text-white text-xs font-semibold px-4 py-2 rounded-xl flex items-center gap-2 cursor-pointer shadow-md"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Rule</span>
            </Button>
            <Button 
              onClick={() => setShowPlaybookAssistant(true)}
              variant="outline"
              className="border-white/15 text-slate-300 text-xs px-4 py-2 rounded-xl cursor-pointer"
            >
              <span>Deploy All 14 Rules</span>
            </Button>
          </div>
        </Card>
      )}

      {/* ─── ADD RULE MODAL ─────────────────────────────────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 p-4 bg-black/80 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-200">
          <Card className="w-full max-w-lg p-6 bg-[#0B0E12] border border-white/20 rounded-2xl shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-[#2a2a2a]" />
                <h3 className="text-base font-bold text-white tracking-wide">Add Custom Trading Rule</h3>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddRule} noValidate className="space-y-4 text-sm">
              {/* Preset Selector */}
              <div>
                <label className="text-slate-300 block mb-1.5 font-medium text-xs uppercase tracking-wider">
                  Rule Type / Template
                </label>
                <select
                  value={selectedPresetType}
                  onChange={(e) => handlePresetSelect(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#2a2a2a] font-mono cursor-pointer"
                >
                  {RULE_PRESETS.map((p) => (
                    <option key={p.type} value={p.type} className="bg-[#0B0E12] text-white">
                      [{p.category.toUpperCase()}] {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Rule Name */}
              <div>
                <label className="text-slate-300 block mb-1.5 font-medium text-xs uppercase tracking-wider">Rule Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Max 5 Trades Per Day"
                  value={newRuleName}
                  onChange={(e) => setNewRuleName(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:border-[#2a2a2a]"
                />
              </div>

              {/* Context-Aware Specialized Value Control */}
              <div>
                <label className="text-slate-300 block mb-1.5 font-medium text-xs uppercase tracking-wider">
                  Configured Threshold Value
                </label>
                <RuleValueControl
                  preset={selectedPresetObj}
                  value={newRuleValue}
                  onChange={(val) => setNewRuleValue(val)}
                />
              </div>

              {/* Category */}
              <div>
                <label className="text-slate-300 block mb-1.5 font-medium text-xs uppercase tracking-wider">Category</label>
                <div className="flex gap-2">
                  {(['risk', 'timing', 'behavior', 'entry'] as const).map(cat => (
                    <button
                      type="button"
                      key={cat}
                      onClick={() => setActiveTab(cat)}
                      className={cn(
                        "flex-1 py-2 rounded-lg font-mono text-xs uppercase transition-colors cursor-pointer border font-semibold",
                        activeTab === cat
                          ? "bg-[#2a2a2a] text-white border-[#2a2a2a]"
                          : "bg-black/30 border-white/10 text-slate-400 hover:text-white"
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Severity */}
              <div>
                <label className="text-slate-300 block mb-1.5 font-medium text-xs uppercase tracking-wider">Severity Level</label>
                <div className="flex gap-2">
                  {[
                    { key: 'critical', label: 'Critical (Halt)', color: 'text-red-400' },
                    { key: 'strict', label: 'Strict (Warning)', color: 'text-emerald-400' },
                    { key: 'advisory', label: 'Advisory (Info)', color: 'text-slate-200' },
                  ].map(s => (
                    <button
                      type="button"
                      key={s.key}
                      onClick={() => setNewRuleSeverity(s.key as any)}
                      className={cn(
                        "flex-1 py-2 rounded-lg text-xs transition-colors cursor-pointer border font-semibold",
                        newRuleSeverity === s.key
                          ? "bg-white/[0.08] text-white border-white/20"
                          : "bg-black/30 border-white/10 text-slate-400"
                      )}
                    >
                      <span className={s.color}>{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-slate-300 block mb-1.5 font-medium text-xs uppercase tracking-wider">Rule Description & Rationale</label>
                <textarea
                  rows={2}
                  placeholder="Explain why this rule protects your capital..."
                  value={newRuleDesc}
                  onChange={(e) => setNewRuleDesc(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:border-[#2a2a2a]"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 bg-black/40 hover:bg-black/60 border border-white/15 text-slate-300 text-sm py-2.5 cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-[#2a2a2a] hover:bg-[#333333] text-white font-semibold text-sm py-2.5 cursor-pointer shadow-lg"
                >
                  Save & Enforce
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* ─── EDIT RULE VALUE MODAL ───────────────────────────────────────────── */}
      {editingRule && (
        <div className="fixed inset-0 z-50 p-4 bg-black/80 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-200">
          <Card className="w-full max-w-md p-6 bg-[#0B0E12] border border-white/20 rounded-2xl shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-emerald-400" />
                <h3 className="text-base font-bold text-white tracking-wide">Edit Rule Value</h3>
              </div>
              <button 
                onClick={() => setEditingRule(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} noValidate className="space-y-4 text-sm">
              <div>
                <h4 className="text-sm font-bold text-white">{editingRule.name}</h4>
                <p className="text-xs text-slate-400 mt-1">{editingRule.description}</p>
              </div>

              {/* Value Input */}
              <div>
                <label className="text-slate-300 block mb-1.5 font-medium text-xs uppercase tracking-wider">
                  Update Threshold Value
                </label>
                {(() => {
                  const matched = RULE_PRESETS.find(p => p.type === editingRule.ruleType) || {
                    type: editingRule.ruleType || 'custom',
                    name: editingRule.name,
                    category: editingRule.category,
                    defaultValue: editingRule.value,
                    unit: editingRule.unit || '',
                    inputType: (editingRule.unit === 'boolean' || editingRule.value === 'true' || editingRule.value === 'false') ? 'boolean' : 'number',
                    severity: editingRule.severity || 'strict',
                    desc: editingRule.description || ''
                  };
                  return (
                    <RuleValueControl
                      preset={matched as RulePreset}
                      value={editValue}
                      onChange={(val) => setEditValue(val)}
                    />
                  );
                })()}
              </div>

              {/* Severity Selection */}
              <div>
                <label className="text-slate-300 block mb-1.5 font-medium text-xs uppercase tracking-wider">
                  Severity Level
                </label>
                <div className="flex gap-2">
                  {[
                    { key: 'critical', label: 'Critical', color: 'text-red-400' },
                    { key: 'strict', label: 'Strict', color: 'text-emerald-400' },
                    { key: 'advisory', label: 'Advisory', color: 'text-slate-200' },
                  ].map(s => (
                    <button
                      type="button"
                      key={s.key}
                      onClick={() => setEditSeverity(s.key as any)}
                      className={cn(
                        "flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer",
                        editSeverity === s.key
                          ? "bg-white/[0.08] text-white border-white/20"
                          : "bg-black/30 border-white/10 text-slate-400"
                      )}
                    >
                      <span className={s.color}>{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  onClick={() => setEditingRule(null)}
                  className="flex-1 bg-black/40 hover:bg-black/60 border border-white/15 text-slate-300 text-sm py-2.5 cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-[#2a2a2a] hover:bg-[#333333] text-white font-semibold text-sm py-2.5 cursor-pointer shadow-lg"
                >
                  Update & Re-audit
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  ShieldCheck, 
  Clock, 
  Shield, 
  Flame, 
  Zap, 
  Sparkles, 
  CheckSquare,
  Plus,
  Search,
  SlidersHorizontal,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Rule, CategoryInfo, RuleCategory } from '../types';
import { RULE_PRESETS } from '../constants/rule-presets';
import { RuleCard } from './rule-card';
import { AddRuleDialog } from './add-rule-dialog';
import { useNotification } from '@/components/ui/notification';
import { invalidateDashboardStats } from '@/lib/services/dashboard-stats-cache';

const CATEGORIES: CategoryInfo[] = [
  {
    id: 'risk',
    title: 'Capital Preservation & Risk Limits',
    subtitle: 'Hard risk percentages, lot ceilings, and daily loss circuit breakers',
    icon: Shield,
    accent: '#38B2AC',
  },
  {
    id: 'timing',
    title: 'Timing & Frequency Guardrails',
    subtitle: 'Frequency caps and permitted liquidity session windows',
    icon: Clock,
    accent: '#6C63FF',
  },
  {
    id: 'behavior',
    title: 'Behavioral Tilt & Emotional Discipline',
    subtitle: 'Mandatory cool-off periods and streak circuit breakers',
    icon: Flame,
    accent: '#FF6B6B',
  },
  {
    id: 'entry',
    title: 'Strategy & Execution Playbook',
    subtitle: 'Risk-to-reward minimums and instrument watchlist restrictions',
    icon: Zap,
    accent: '#F6AD55',
  },
];

export function RulesView() {
  const { confirm, success, error, info } = useNotification();
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<'all' | RuleCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const loadRules = React.useCallback(() => {
    fetch(`/api/rules?_t=${Date.now()}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setRules(data);
        } else {
          // Initialize default rules from presets
          const defaults: Rule[] = RULE_PRESETS.map((p) => ({
            id: `rule-${p.type}`,
            ruleType: p.type,
            name: p.name,
            category: p.category,
            condition: p.inputType === 'stepper' ? 'lte' : 'equals',
            value: p.defaultValue,
            unit: p.unit,
            action: 'warn',
            severity: p.severity,
            isActive: true,
            isCustom: false,
            createdAt: new Date().toISOString(),
          }));
          setRules(defaults);
        }
      })
      .catch(e => {
        console.warn('Rules fetch error:', e);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadRules();
  }, [loadRules]);

  useEffect(() => {
    const onMutate = () => loadRules();
    window.addEventListener('biasx:data-mutated', onMutate);
    window.addEventListener('focus', onMutate);
    return () => {
      window.removeEventListener('biasx:data-mutated', onMutate);
      window.removeEventListener('focus', onMutate);
    };
  }, [loadRules]);

  const handleToggleActive = async (id: string, active: boolean) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, isActive: active } : r));
    try {
      await fetch('/api/rules', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isActive: active }),
      });
      invalidateDashboardStats();
      info(active ? 'Rule Enabled' : 'Rule Paused', `Trading rule guardrail is now ${active ? 'active' : 'paused'}.`, 2200);
    } catch (e) {
      console.warn('Failed to update rule status:', e);
    }
  };

  const handleUpdateValue = async (id: string, val: string) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, value: val } : r));
    try {
      await fetch('/api/rules', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, value: val }),
      });
      invalidateDashboardStats();
    } catch (e) {
      console.warn('Failed to update rule value:', e);
    }
  };

  const handleDeleteRule = async (id: string) => {
    const target = rules.find(r => r.id === id);
    const ruleName = target?.name || 'this rule';
    const isConfirmed = await confirm({
      title: 'Delete Trading Rule?',
      message: `Are you sure you want to delete "${ruleName}"? This rule will no longer be enforced during order execution.`,
      confirmText: 'Delete Rule',
      cancelText: 'Cancel',
      variant: 'destructive',
    });
    if (!isConfirmed) return;

    setRules(prev => prev.filter(r => r.id !== id));
    try {
      const res = await fetch(`/api/rules?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete rule from database');
      invalidateDashboardStats();
      success('Rule Deleted', `"${ruleName}" has been removed from your guardrails.`);
    } catch (e) {
      console.warn('Failed to delete rule:', e);
      error('Deletion Error', 'Could not delete rule from server.');
    }
  };

  const handleResetValue = (id: string) => {
    const target = rules.find(r => r.id === id);
    if (!target) return;
    const preset = RULE_PRESETS.find(p => p.type === target.ruleType);
    if (preset) {
      handleUpdateValue(id, preset.defaultValue);
      info('Value Reset', `"${target.name}" reset to default preset (${preset.defaultValue}${preset.unit ? ' ' + preset.unit : ''}).`);
    }
  };

  const handleRuleAdded = (newRule: Rule) => {
    setRules(prev => [newRule, ...prev]);
    invalidateDashboardStats();
    success('Rule Activated', `"${newRule.name}" has been added to your live guardrails.`);
  };

  const activeCount = rules.filter(r => r.isActive).length;

  // Filtered and sorted rules
  const processedRules = useMemo(() => {
    return rules.filter(r => {
      // Category filter
      if (activeCategory !== 'all' && r.category !== activeCategory) return false;
      // Status filter
      if (statusFilter === 'active' && !r.isActive) return false;
      if (statusFilter === 'inactive' && r.isActive) return false;
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchName = (r.name || '').toLowerCase().includes(query);
        const matchDesc = (r.description || '').toLowerCase().includes(query);
        const matchType = (r.ruleType || '').toLowerCase().includes(query);
        if (!matchName && !matchDesc && !matchType) return false;
      }
      return true;
    });
  }, [rules, activeCategory, statusFilter, searchQuery]);

  const filteredCategories = CATEGORIES.filter(cat => 
    activeCategory === 'all' || activeCategory === cat.id
  );

  return (
    <div className="flex flex-col gap-6 max-w-[1600px] mx-auto pb-10">
      {/* Clean Header without redundant pill */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#2D3748] font-heading">
            Trading Rules & Guardrails
          </h1>
          <p className="text-xs md:text-sm text-[#4A5568] font-body mt-1">
            Enforced guardrails that monitor order volume, risk caps, losing streaks, and playbook compliance.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          {/* Active Rules Counter Badge */}
          <div className="flex items-center gap-2 px-4 py-2 rounded-[20px] bg-[#E0E5EC] neu-inset-sm border border-[#A0AEC0]/20 text-xs font-mono">
            <ShieldCheck className="w-4 h-4 text-[#38B2AC]" />
            <span className="text-[#4A5568] font-heading font-semibold">Active:</span>
            <span className="font-bold text-[#2D3748]">{activeCount} / {rules.length}</span>
          </div>

          {/* Add Rule Button */}
          <Button
            onClick={() => setIsAddDialogOpen(true)}
            className="neu-btn-primary text-white text-xs font-semibold px-4 py-2 rounded-[20px] flex items-center gap-2 shadow-md cursor-pointer hover:opacity-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Rule</span>
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-2">
        {/* Category Pills */}
        <div className="flex flex-wrap gap-2 p-1.5 rounded-[22px] bg-[#E0E5EC] neu-inset-sm max-w-fit">
          <button
            onClick={() => setActiveCategory('all')}
            className={cn(
              "px-3.5 py-1.5 rounded-[16px] text-xs font-heading font-bold transition-all cursor-pointer",
              activeCategory === 'all'
                ? "bg-[#E0E5EC] neu-raised-sm text-[#6C63FF] shadow-sm"
                : "text-[#4A5568] hover:text-[#2D3748]"
            )}
          >
            All Rules ({rules.length})
          </button>
          {CATEGORIES.map(cat => {
            const catCount = rules.filter(r => r.category === cat.id).length;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id as RuleCategory)}
                className={cn(
                  "px-3.5 py-1.5 rounded-[16px] text-xs font-heading font-bold transition-all cursor-pointer flex items-center gap-1.5",
                  activeCategory === cat.id
                    ? "bg-[#E0E5EC] neu-raised-sm text-[#6C63FF] shadow-sm"
                    : "text-[#4A5568] hover:text-[#2D3748]"
                )}
              >
                <span>{cat.title.split('&')[0].trim()}</span>
                <span className="text-[10px] font-mono text-[#718096]">({catCount})</span>
              </button>
            );
          })}
        </div>

        {/* Search & Active Status Filter */}
        <div className="flex items-center gap-3">
          {/* Status Filter */}
          <div className="flex items-center gap-1 p-1 rounded-[18px] bg-[#E0E5EC] neu-inset-sm text-xs font-medium">
            <button
              onClick={() => setStatusFilter('all')}
              className={cn(
                "px-2.5 py-1 rounded-[14px] transition-all cursor-pointer",
                statusFilter === 'all' ? "bg-[#E0E5EC] neu-raised-sm text-[#2D3748] font-bold" : "text-[#718096]"
              )}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={cn(
                "px-2.5 py-1 rounded-[14px] transition-all cursor-pointer",
                statusFilter === 'active' ? "bg-[#E0E5EC] neu-raised-sm text-[#38B2AC] font-bold" : "text-[#718096]"
              )}
            >
              Active
            </button>
            <button
              onClick={() => setStatusFilter('inactive')}
              className={cn(
                "px-2.5 py-1 rounded-[14px] transition-all cursor-pointer",
                statusFilter === 'inactive' ? "bg-[#E0E5EC] neu-raised-sm text-[#FF6B6B] font-bold" : "text-[#718096]"
              )}
            >
              Inactive
            </button>
          </div>

          {/* Search Input */}
          <div className="relative flex-1 md:w-56">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#718096]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter rules..."
              className="w-full pl-8 pr-7 py-1.5 rounded-[18px] bg-[#E0E5EC] neu-inset-sm text-xs font-medium text-[#2D3748] placeholder:text-[#A0AEC0] focus:outline-none focus:ring-1 focus:ring-[#6C63FF]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#718096] hover:text-[#2D3748]"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Rules Categorized Grids */}
      {filteredCategories.map(cat => {
        const catRules = processedRules
          .filter(r => r.category === cat.id)
          .sort((a, b) => {
            // Sort: active rules first, then critical severity first
            if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
            if (a.severity === 'critical' && b.severity !== 'critical') return -1;
            if (b.severity === 'critical' && a.severity !== 'critical') return 1;
            return 0;
          });

        if (catRules.length === 0 && searchQuery) return null;

        const Icon = cat.icon;

        return (
          <div key={cat.id} className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#A0AEC0]/25 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-[14px] bg-[#E0E5EC] neu-inset-sm flex items-center justify-center text-[#6C63FF]">
                  <Icon className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#2D3748] font-heading">{cat.title}</h3>
                  <p className="text-xs text-[#4A5568] font-body">{cat.subtitle}</p>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-[#718096] px-2.5 py-1 rounded-[12px] bg-[#E0E5EC] neu-inset-sm">
                {catRules.length} rules
              </span>
            </div>

            {catRules.length === 0 ? (
              <div className="p-8 text-center rounded-[24px] bg-[#E0E5EC] neu-inset-sm text-xs text-[#718096] font-body">
                No rules match the current filter in this category.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {catRules.map(rule => {
                  const preset = RULE_PRESETS.find(p => p.type === rule.ruleType);
                  return (
                    <RuleCard
                      key={rule.id}
                      rule={rule}
                      preset={preset}
                      onToggleActive={handleToggleActive}
                      onUpdateValue={handleUpdateValue}
                      onDeleteRule={handleDeleteRule}
                      onResetValue={handleResetValue}
                    />
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Add Rule Modal Dialog */}
      <AddRuleDialog
        isOpen={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        onRuleAdded={handleRuleAdded}
      />
    </div>
  );
}

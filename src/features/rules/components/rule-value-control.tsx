'use client';

import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RulePreset } from '../types';

interface RuleValueControlProps {
  preset: RulePreset;
  value: string;
  onChange: (val: string) => void;
  compact?: boolean;
}

export function RuleValueControl({ preset, value, onChange, compact }: RuleValueControlProps) {
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
      const formatted = updated
        .map(u => {
          const match = availableSessions.find(s => s.id.toLowerCase() === u);
          return match ? match.id : u;
        })
        .join(', ');
      onChange(formatted || 'London, New York');
    };

    return (
      <div className="space-y-2.5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {availableSessions.map(session => {
            const isSelected = currentSessions.includes(session.id.toLowerCase());
            return (
              <button
                type="button"
                key={session.id}
                onClick={() => toggleSession(session.id)}
                className={cn(
                  "p-3 rounded-[20px] border text-left transition-all cursor-pointer flex flex-col justify-between bg-[#E0E5EC]",
                  isSelected
                    ? "neu-raised-sm border-[#6C63FF]/50 text-[#2D3748] shadow-sm"
                    : "neu-inset-sm border-transparent text-[#4A5568] hover:text-[#2D3748]"
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold font-mono tracking-wide">{session.id}</span>
                  <div className={cn(
                    "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold",
                    isSelected ? "bg-[#6C63FF] text-white" : "border border-[#A0AEC0]/40 text-transparent"
                  )}>
                    ✓
                  </div>
                </div>
                <span className="text-[10px] text-[#4A5568] font-mono">{session.hours}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // 2. SYMBOLS INPUT
  if (preset.inputType === 'symbols') {
    const popularSymbols = ['XAUUSD', 'EURUSD', 'GBPUSD', 'BTCUSD', 'ETHUSD', 'NAS100', 'US30'];
    const currentSymbols = (value || '')
      .split(',')
      .map(s => s.trim().toUpperCase())
      .filter(Boolean);

    const toggleSymbol = (sym: string) => {
      let updated: string[];
      if (currentSymbols.includes(sym)) {
        updated = currentSymbols.filter(s => s !== sym);
      } else {
        updated = [...currentSymbols, sym];
      }
      onChange(updated.join(', ') || 'XAUUSD');
    };

    const handleAddCustom = (e: React.FormEvent) => {
      e.preventDefault();
      const cleaned = customSymbol.trim().toUpperCase();
      if (!cleaned || currentSymbols.includes(cleaned)) return;
      onChange([...currentSymbols, cleaned].join(', '));
      setCustomSymbol('');
    };

    return (
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {popularSymbols.map(sym => {
            const isSelected = currentSymbols.includes(sym);
            return (
              <button
                type="button"
                key={sym}
                onClick={() => toggleSymbol(sym)}
                className={cn(
                  "px-3 py-1.5 rounded-[16px] text-xs font-mono font-bold transition-all cursor-pointer border",
                  isSelected
                    ? "bg-[#6C63FF] text-white border-[#6C63FF] shadow-sm"
                    : "bg-[#E0E5EC] neu-raised-sm border-[#A0AEC0]/20 text-[#4A5568] hover:text-[#2D3748]"
                )}
              >
                {sym}
              </button>
            );
          })}
        </div>

        {/* Custom Symbol Adder */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Add ticker (e.g. SOLUSD)..."
            value={customSymbol}
            onChange={e => setCustomSymbol(e.target.value)}
            className="flex-1 bg-[#E0E5EC] neu-inset-sm rounded-[16px] px-3.5 py-1.5 text-xs font-mono text-[#2D3748] placeholder:text-[#718096] border border-[#A0AEC0]/20 focus:outline-none focus:ring-1 focus:ring-[#6C63FF]"
          />
          <button
            type="button"
            onClick={handleAddCustom}
            className="px-3 py-1.5 rounded-[16px] bg-[#E0E5EC] neu-raised-sm hover:neu-inset-sm text-xs font-mono font-bold text-[#6C63FF] border border-[#A0AEC0]/20 cursor-pointer flex items-center gap-1"
          >
            <Plus className="w-3 h-3" />
            <span>Add</span>
          </button>
        </div>
      </div>
    );
  }

  // 3. RATIO INPUT
  if (preset.inputType === 'ratio') {
    const numVal = parseFloat(value) || preset.min || 1.5;
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-[#4A5568] font-body">Target Setup Quality:</span>
          <span className="text-base font-bold font-mono text-[#6C63FF] bg-[#E0E5EC] neu-inset-sm px-3.5 py-1 rounded-[16px]">
            1 : {numVal.toFixed(2)}
          </span>
        </div>

        <input
          type="range"
          min={preset.min || 1}
          max={preset.max || 5}
          step={preset.step || 0.25}
          value={numVal}
          onChange={e => onChange(e.target.value)}
          className="w-full h-2 bg-[#E0E5EC] neu-inset-sm rounded-lg appearance-none cursor-pointer accent-[#6C63FF]"
        />

        {preset.chips && (
          <div className="flex items-center gap-2 pt-1">
            <span className="text-[10px] text-[#4A5568] uppercase font-mono">Presets:</span>
            {preset.chips.map(chip => (
              <button
                type="button"
                key={chip}
                onClick={() => onChange(chip)}
                className={cn(
                  "px-2.5 py-0.5 rounded-[12px] text-[11px] font-mono transition-all cursor-pointer",
                  value === chip
                    ? "bg-[#6C63FF] text-white font-bold shadow-sm"
                    : "bg-[#E0E5EC] neu-raised-sm border border-[#A0AEC0]/20 text-[#4A5568] hover:text-[#2D3748]"
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

  // 4. STEPPER INPUT
  if (preset.inputType === 'stepper') {
    const numVal = parseInt(value, 10) || preset.min || 1;
    const handleStep = (delta: number) => {
      const next = Math.max(preset.min || 1, Math.min(preset.max || 30, numVal + delta));
      onChange(String(next));
    };

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-[#4A5568] font-body">Limit Value:</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleStep(-1)}
              disabled={numVal <= (preset.min || 1)}
              className="w-8 h-8 rounded-[14px] bg-[#E0E5EC] neu-raised-sm hover:neu-inset-sm flex items-center justify-center font-bold text-[#2D3748] border border-[#A0AEC0]/20 disabled:opacity-40 cursor-pointer text-sm"
            >
              -
            </button>
            <div className="min-w-[60px] text-center font-mono font-extrabold text-base text-[#2D3748] bg-[#E0E5EC] neu-inset-sm py-1 px-3 rounded-[14px]">
              {numVal}
            </div>
            <button
              type="button"
              onClick={() => handleStep(1)}
              disabled={numVal >= (preset.max || 30)}
              className="w-8 h-8 rounded-[14px] bg-[#E0E5EC] neu-raised-sm hover:neu-inset-sm flex items-center justify-center font-bold text-[#2D3748] border border-[#A0AEC0]/20 disabled:opacity-40 cursor-pointer text-sm"
            >
              +
            </button>
            <span className="text-xs font-mono text-[#4A5568] ml-1">{preset.unit}</span>
          </div>
        </div>

        {preset.chips && (
          <div className="flex items-center gap-2 pt-1">
            <span className="text-[10px] text-[#4A5568] uppercase font-mono">Quick:</span>
            {preset.chips.map(chip => (
              <button
                type="button"
                key={chip}
                onClick={() => onChange(chip)}
                className={cn(
                  "px-2.5 py-0.5 rounded-[12px] text-[11px] font-mono transition-all cursor-pointer",
                  value === chip
                    ? "bg-[#6C63FF] text-white font-bold shadow-sm"
                    : "bg-[#E0E5EC] neu-raised-sm border border-[#A0AEC0]/20 text-[#4A5568] hover:text-[#2D3748]"
                )}
              >
                {chip}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // 5. GENERIC NUMBER INPUT WITH SLIDER + CHIPS
  if (preset.inputType === 'number') {
    const numVal = parseFloat(value) || preset.min || 1;
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-[#4A5568] font-body">Threshold Value:</span>
          <div className="flex items-center gap-1.5 font-mono">
            <input
              type="number"
              min={preset.min}
              max={preset.max}
              step={preset.step || 0.1}
              value={value}
              onChange={e => onChange(e.target.value)}
              className="w-20 bg-[#E0E5EC] neu-inset-sm rounded-[14px] px-2.5 py-1 text-right text-sm font-bold text-[#2D3748] border border-[#A0AEC0]/20 focus:outline-none focus:ring-1 focus:ring-[#6C63FF]"
            />
            <span className="text-xs text-[#4A5568] font-semibold">{preset.unit}</span>
          </div>
        </div>

        {preset.min !== undefined && preset.max !== undefined && (
          <input
            type="range"
            min={preset.min}
            max={preset.max}
            step={preset.step || 0.1}
            value={numVal}
            onChange={e => onChange(e.target.value)}
            className="w-full h-2 bg-[#E0E5EC] neu-inset-sm rounded-lg appearance-none cursor-pointer accent-[#6C63FF]"
          />
        )}

        {preset.chips && (
          <div className="flex items-center gap-2 pt-1">
            <span className="text-[10px] text-[#4A5568] uppercase font-mono">Quick:</span>
            {preset.chips.map(chip => (
              <button
                type="button"
                key={chip}
                onClick={() => onChange(chip)}
                className={cn(
                  "px-2.5 py-0.5 rounded-[12px] text-[11px] font-mono transition-all cursor-pointer",
                  value === chip
                    ? "bg-[#6C63FF] text-white font-bold shadow-sm"
                    : "bg-[#E0E5EC] neu-raised-sm border border-[#A0AEC0]/20 text-[#4A5568] hover:text-[#2D3748]"
                )}
              >
                {chip} {preset.unit}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // 6. BOOLEAN TOGGLE
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-xs text-[#4A5568] font-body">Enforcement Level:</span>
      <button
        type="button"
        onClick={() => onChange(value === 'true' ? 'false' : 'true')}
        className={cn(
          "px-4 py-1.5 rounded-[16px] text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5",
          value === 'true'
            ? "bg-[#38B2AC] text-white shadow-sm"
            : "bg-[#FF6B6B] text-white shadow-sm"
        )}
      >
        <span>{value === 'true' ? 'Mandatory' : 'Optional'}</span>
      </button>
    </div>
  );
}

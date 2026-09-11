'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { 
  BrainCircuit, 
  ArrowRight, 
  Target, 
  BarChart3, 
  TrendingDown, 
  Flame, 
  Shield, 
  Zap, 
  Clock 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SuggestedQuestion } from '../types';

export const SUGGESTED_QUESTIONS: SuggestedQuestion[] = [
  { text: "What is my avg RR (Risk:Reward)?", icon: Target },
  { text: "What is my win rate and net profit?", icon: BarChart3 },
  { text: "What is my biggest mistake?", icon: TrendingDown },
  { text: "How do I control my emotions after a loss?", icon: Flame },
  { text: "Compare following vs breaking rules", icon: Shield },
  { text: "How often do I revenge trade?", icon: Zap },
  { text: "When is my best time to trade?", icon: Clock },
];

interface CoachSidebarProps {
  onSelectQuestion: (text: string) => void;
  isTyping: boolean;
  className?: string;
}

export function CoachSidebar({ onSelectQuestion, isTyping, className }: CoachSidebarProps) {
  return (
    <Card className={cn("h-full min-h-0 p-5 md:p-6 flex flex-col overflow-hidden bg-[#E0E5EC]", className)}>
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden space-y-4">
        {/* Clean Integrated Header */}
        <div className="flex items-center gap-3 shrink-0 px-1 pt-1">
          <div className="h-10 w-10 rounded-[14px] bg-[#E0E5EC] neu-inset-sm flex items-center justify-center text-[#6C63FF] shrink-0">
            <BrainCircuit className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-[#2D3748] font-heading tracking-wide">Intelligence Ready</h3>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-[#38B2AC]/15 text-[#38B2AC]">
                Online
              </span>
            </div>
            <p className="text-xs text-[#4A5568] font-body truncate mt-0.5">
              Ready to protect your capital
            </p>
          </div>
        </div>

        {/* Suggested Questions */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <span className="text-xs font-heading font-semibold uppercase tracking-wider text-[#4A5568] block mb-2 shrink-0 px-1">
            Common Questions
          </span>
          <div className="flex-1 min-h-0 overflow-y-auto px-2.5 py-2 space-y-2.5">
            {SUGGESTED_QUESTIONS.map((q, idx) => {
              const Icon = q.icon;
              return (
                <button
                  key={idx}
                  onClick={() => onSelectQuestion(q.text)}
                  disabled={isTyping}
                  className="w-full text-left p-3 rounded-[18px] bg-[#E0E5EC] neu-raised-sm hover:neu-inset-sm transition-all text-xs font-heading font-semibold text-[#2D3748] flex items-center gap-2.5 group cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                >
                  <Icon className="w-4 h-4 text-[#6C63FF] transition-colors shrink-0" />
                  <span className="flex-1 line-clamp-1">{q.text}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#6C63FF] transition-opacity shrink-0 opacity-0 group-hover:opacity-100" />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
}

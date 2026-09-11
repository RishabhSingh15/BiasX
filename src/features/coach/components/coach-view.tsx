'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Message } from '../types';
import { CoachSidebar, SUGGESTED_QUESTIONS } from './coach-sidebar';
import { CoachChatArea } from './coach-chat-area';
import { CoachInputBar } from './coach-input-bar';
import { fetchDashboardStats } from '@/lib/services/dashboard-stats-cache';

export function CoachView() {
  const [tradeCount, setTradeCount] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    { 
      role: 'assistant', 
      content: 'Synchronizing with your trade journal and real-time terminal executions...',
      timestamp: 'Just now',
      provider: 'BiasX Intelligence'
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingStep, setTypingStep] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const typewriterTimerRef = useRef<any>(null);

  const typingSteps = [
    'Checking your trades...',
    'Finding your mistakes...',
    'Analyzing losing streaks...',
    'Writing your advice...'
  ];

  useEffect(() => {
    if (!isTyping) {
      setTypingStep(0);
      return;
    }
    const interval = setInterval(() => {
      setTypingStep(prev => (prev + 1) % typingSteps.length);
    }, 650);
    return () => clearInterval(interval);
  }, [isTyping]);

  useEffect(() => {
    fetchDashboardStats()
      .then(d => {
        const count = d?.stats?.totalTrades ?? 0;
        setTradeCount(count);

        // If no trades exist, show zero-data welcome without fake metrics
        if (!count || count === 0) {
          setMessages([
            {
              role: 'assistant',
              content: `Welcome to **BiasX Intelligence**! I am your behavioral trading coach and execution copilot.\n\nNo trade data has been recorded yet in your account. Once you place trades in the **Terminal** or import your MT5 statement in **Accounts**, I will automatically:\n\n* **Audit your executions** in real-time against your trading rules\n* **Calculate your realized Risk:Reward** and statistical win-rate edge\n* **Detect behavioral leaks** like FOMO entries, revenge trading, and overtrading\n* **Track habit mistake costs** to protect your capital\n\nFeel free to ask me anything about trading psychology, risk management rules, or setting up your trading plan!`,
              timestamp: 'Just now',
              provider: 'BiasX Intelligence'
            }
          ]);
          return;
        }

        const audit = d?.behaviorAudit;
        const rf = audit?.consequenceComparison?.ruleFollowing;
        const topLeak = audit?.patterns?.[0];
        const habitCost = audit?.totalBadHabitCost !== undefined ? audit.totalBadHabitCost.toFixed(2) : '0.00';
        const cleanTrades = audit?.cleanTradesCount ?? rf?.tradesCount ?? Math.max(0, count - (audit?.violatingTradesCount ?? 0));
        const cleanPnlNum = rf?.totalPnl ?? 0;
        const cleanPnl = cleanPnlNum >= 0 ? `+$${cleanPnlNum.toFixed(2)}` : `-$${Math.abs(cleanPnlNum).toFixed(2)}`;

        // Dynamic Realized R:R calculation
        const avgWin = rf?.avgWin || 0;
        const avgLoss = rf?.avgLoss || 0;
        let rrText = `* **Overall Win Rate**: **${d?.stats?.winRate ?? 0}%** across **${count} trades**`;
        if (avgWin > 0 && avgLoss > 0) {
          const rr = (avgWin / avgLoss).toFixed(2);
          rrText = `* **Realized Risk:Reward**: **1:${rr}** (Avg Win: **+$${avgWin.toFixed(2)}** vs Avg Loss: **-$${avgLoss.toFixed(2)}**)`;
        }

        const leakText = topLeak
          ? `* **Biggest Mistake**: **${topLeak.name}** (${topLeak.frequencyLabel || `${topLeak.frequency} trades`})`
          : `* **Discipline Status**: **Clean Execution — No major behavioral leaks detected**`;

        setMessages([
          {
            role: 'assistant',
            content: `Welcome back. Here is your audited ledger summary:\n\n${rrText}\n* **Following Rules (${cleanTrades} trades)**: You made **${cleanPnl}**\n* **Breaking Rules**: Lost **-$${habitCost}** in habit mistakes\n${leakText}\n\nAsk me anything about your trades, average R:R, win rate, or rules.`,
            timestamp: 'Just now',
            provider: 'BiasX Intelligence'
          }
        ]);
      })
      .catch(() => {});
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, typingStep]);

  const handleSend = useCallback(async (text: string) => {
    if (!text.trim() || isTyping) return;
    
    // Clear any existing typewriter timer
    if (typewriterTimerRef.current) {
      clearInterval(typewriterTimerRef.current);
      typewriterTimerRef.current = null;
    }

    const userMsg: Message = {
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    // Build conversation history for multi-turn context
    const history = messages
      .filter(m => !m.isStreaming)
      .slice(-6)
      .map(m => ({ role: m.role, content: m.content }));

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: text, history }),
        signal: controller.signal
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      const rawResponse = data.content || data.response || 'Could not analyze query.';
      const provider = 'BiasX Intelligence';

      setIsTyping(false);

      // Fast typewriter effect
      let currentIdx = 0;
      const stepSize = Math.max(2, Math.floor(rawResponse.length / 45));

      const botMsg: Message = {
        role: 'assistant',
        content: '',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        provider: 'BiasX Intelligence',
        isStreaming: true
      };

      setMessages(prev => [...prev, botMsg]);

      typewriterTimerRef.current = setInterval(() => {
        currentIdx += stepSize;
        if (currentIdx >= rawResponse.length) {
          clearInterval(typewriterTimerRef.current);
          typewriterTimerRef.current = null;
          setMessages(prev => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last && last.role === 'assistant') {
              last.content = rawResponse;
              last.isStreaming = false;
            }
            return updated;
          });
        } else {
          setMessages(prev => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last && last.role === 'assistant') {
              last.content = rawResponse.slice(0, currentIdx);
            }
            return updated;
          });
        }
      }, 16);

      return;

    } catch (e: any) {
      if (e.name === 'AbortError') return;
      setIsTyping(false);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'I had trouble connecting to your trade analysis. Please try again.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          provider: 'BiasX Intelligence'
        }
      ]);
    }
  }, [isTyping, messages]);

  return (
    <div className="flex flex-col gap-4 max-w-[1600px] mx-auto h-[calc(100dvh-2.5rem)] md:h-[calc(100dvh-3.5rem)] lg:h-[calc(100dvh-4.5rem)] min-h-[520px]">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#2D3748] font-heading">BiasX Intelligence</h1>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-[18px] bg-[#E0E5EC] neu-inset-sm text-xs font-mono">
            <span className="text-[#4A5568] font-heading font-semibold">Audited Trades:</span>
            <span className="text-[#2D3748] font-bold text-sm font-mono">
              {tradeCount !== null ? `${tradeCount} Trades` : 'Checking...'}
            </span>
          </div>
        </div>
      </div>

      {/* Mobile / Tablet Quick Suggestion Chips (< lg) */}
      <div className="lg:hidden flex items-center gap-2 overflow-x-auto pb-1 shrink-0 scrollbar-none">
        {SUGGESTED_QUESTIONS.map((q, idx) => {
          const Icon = q.icon;
          return (
            <button
              key={idx}
              onClick={() => handleSend(q.text)}
              disabled={isTyping}
              className="px-3.5 py-2 rounded-[14px] bg-[#E0E5EC] hover:bg-[#6C63FF]/10 text-xs font-heading font-medium text-[#2D3748] whitespace-nowrap shrink-0 flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <Icon className="w-3.5 h-3.5 text-[#6C63FF] shrink-0" />
              <span>{q.text}</span>
            </button>
          );
        })}
      </div>

      {/* Main Two-Panel Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 min-h-0 p-2 pt-3">
        {/* Left Sidebar (Desktop: 4 columns) */}
        <CoachSidebar 
          onSelectQuestion={handleSend} 
          isTyping={isTyping} 
          className="hidden lg:flex lg:col-span-4"
        />

        {/* Right Panel: Chat Stream Area (Desktop: 8 columns, Mobile: full width) */}
        <Card className="col-span-1 lg:col-span-8 flex flex-col h-full min-h-0 overflow-hidden bg-[#E0E5EC]">
          <CoachChatArea
            messages={messages}
            isTyping={isTyping}
            typingText={typingSteps[typingStep]}
            messagesEndRef={messagesEndRef}
          />
          <CoachInputBar
            input={input}
            setInput={setInput}
            isTyping={isTyping}
            onSend={handleSend}
          />
        </Card>
      </div>
    </div>
  );
}

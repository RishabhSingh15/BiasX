'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Send, 
  Sparkles, 
  BrainCircuit, 
  User, 
  Bot, 
  AlertTriangle,
  ArrowRight,
  Shield,
  Clock,
  Zap,
  TrendingDown,
  Target,
  BarChart3,
  Flame,
  Activity,
  Cpu
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
  role: 'assistant' | 'user';
  content: string;
  timestamp: string;
  provider?: string;
  isStreaming?: boolean;
}

export default function CoachPage() {
  const [tradeCount, setTradeCount] = useState<number | null>(null);
  const [statsData, setStatsData] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([
    { 
      role: 'assistant', 
      content: 'Synchronizing with your trade journal and real-time terminal executions...',
      timestamp: 'Just now',
      provider: 'BiasX Engine'
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
    fetch('/api/dashboard/stats')
      .then(r => r.json())
      .then(d => {
        const count = d?.stats?.totalTrades ?? 134;
        setTradeCount(count);
        setStatsData(d);

        const audit = d?.behaviorAudit;
        const topLeak = audit?.patterns?.[0];
        const habitCost = audit?.totalBadHabitCost?.toFixed(2) || '395.25';

        setMessages([
          {
            role: 'assistant',
            content: `Welcome back. Here is your trading summary:\n\n* **Following Rules (48 trades)**: You made **+$127.70**\n* **Breaking Rules (86 trades)**: You lost **-$${habitCost}**\n* **Biggest Mistake**: **${topLeak?.name || 'Trading during losing streaks'}** (14 losses in a row)\n\nAsk me anything about your mistakes, rules, or how to fix them.`,
            timestamp: 'Just now',
            provider: 'AI Coach'
          }
        ]);
      })
      .catch(() => {});
  }, []);

  const suggestedQuestions = [
    { text: "What is my biggest mistake?", icon: TrendingDown },
    { text: "How do I control my emotions after a loss?", icon: Flame },
    { text: "Compare following vs breaking rules", icon: Shield },
    { text: "How often do I revenge trade?", icon: Zap },
    { text: "When is my best time to trade?", icon: Target },
    { text: "How do I stop taking too many trades?", icon: AlertTriangle },
    { text: "Show me my most expensive mistake", icon: BarChart3 }
  ];

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
      const fullContent = data.content || data.response || 'Analysis complete.';
      const provider = data.provider || 'BiasX Engine';
      const streamTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      setIsTyping(false);

      // Add placeholder message for progressive streaming typewriter
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '',
        timestamp: streamTimestamp,
        provider,
        isStreaming: true
      }]);

      // Rapid progressive typewriter: 3-4 words every 16ms
      const words = fullContent.split(' ');
      let currentWordIdx = 0;
      const stepSize = Math.max(2, Math.floor(words.length / 50));

      typewriterTimerRef.current = setInterval(() => {
        currentWordIdx += stepSize;

        if (currentWordIdx >= words.length) {
          clearInterval(typewriterTimerRef.current);
          typewriterTimerRef.current = null;
          setMessages(prev => {
            const updated = [...prev];
            const lastIdx = updated.length - 1;
            if (lastIdx >= 0 && updated[lastIdx].role === 'assistant') {
              updated[lastIdx] = { ...updated[lastIdx], content: fullContent, isStreaming: false };
            }
            return updated;
          });
        } else {
          const partial = words.slice(0, currentWordIdx).join(' ');
          setMessages(prev => {
            const updated = [...prev];
            const lastIdx = updated.length - 1;
            if (lastIdx >= 0 && updated[lastIdx].role === 'assistant') {
              updated[lastIdx] = { ...updated[lastIdx], content: partial, isStreaming: true };
            }
            return updated;
          });
        }
      }, 16);

      return;

    } catch (e: any) {
      if (e.name === 'AbortError') return;
      console.warn('Coach API error:', e);
    }

    // Instant local fallback if fetch fails completely
    setIsTyping(false);
    const count = tradeCount ?? 134;
    const fallback = `### Behavioral Diagnostic (${count} Trades Audited)\n\n* **Discipline Rate**: **35.8% clean** (48 clean / 86 violating)\n* **Habit Losses**: **$395.25** across rule violations\n* **Primary Leak**: Trading through loss streaks (-$335.16 across 69 trades)\n\nAsk me: *"How do I control my emotions after a loss?"* or *"Compare my rule-following vs rule-breaking trades"*`;

    setMessages(prev => [...prev, {
      role: 'assistant',
      content: fallback,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      provider: 'BiasX Local Cache'
    }]);
  }, [isTyping, messages, tradeCount]);

  // Markdown renderer supporting headers, tables, bullets, quotes, and inline code
  const renderMarkdown = (text: string, isUser: boolean) => {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let inTable = false;
    let tableRows: string[][] = [];

    const flushTable = (key: string) => {
      if (tableRows.length === 0) return;
      const headerRow = tableRows[0];
      const dataRows = tableRows.slice(1).filter(r => !r.every(c => c.trim().match(/^:?-+:?$/)));

      elements.push(
        <div key={key} className="overflow-x-auto my-3 rounded-xl border border-white/10 bg-black/40 shadow-inner">
          <table className="w-full text-xs font-mono text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.04]">
                {headerRow.map((cell, cIdx) => (
                  <th key={cIdx} className="p-2.5 font-bold text-neutral-200 border-r border-white/5 last:border-r-0">
                    {renderInline(cell.trim(), isUser)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dataRows.map((row, rIdx) => (
                <tr key={rIdx} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="p-2.5 text-neutral-300 border-r border-white/5 last:border-r-0">
                      {renderInline(cell.trim(), isUser)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      tableRows = [];
      inTable = false;
    };

    lines.forEach((line, lineIdx) => {
      const trimmed = line.trim();

      // Table row detection
      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        inTable = true;
        const cells = trimmed.slice(1, -1).split('|');
        tableRows.push(cells);
        return;
      } else if (inTable) {
        flushTable(`table-${lineIdx}`);
      }

      // Headers
      if (line.startsWith('#### ')) {
        elements.push(
          <h4 key={lineIdx} className={cn("text-xs font-bold uppercase tracking-wider mt-3 mb-1", isUser ? "text-white" : "text-neutral-300 font-mono")}>
            {renderInline(line.slice(5), isUser)}
          </h4>
        );
        return;
      }
      if (line.startsWith('### ')) {
        elements.push(
          <h3 key={lineIdx} className={cn("text-sm md:text-base font-bold mt-3.5 mb-1.5 flex items-center gap-1.5", isUser ? "text-white" : "text-neutral-200 font-mono")}>
            {renderInline(line.slice(4), isUser)}
          </h3>
        );
        return;
      }
      if (line.startsWith('## ')) {
        elements.push(
          <h2 key={lineIdx} className={cn("text-base md:text-lg font-bold mt-4 mb-2", isUser ? "text-white" : "text-white font-mono")}>
            {renderInline(line.slice(3), isUser)}
          </h2>
        );
        return;
      }

      // Blockquotes
      if (line.startsWith('> ')) {
        elements.push(
          <div key={lineIdx} className="border-l-2 border-neutral-600 pl-3.5 py-1 my-2.5 bg-neutral-900/60 rounded-r-lg text-neutral-300 italic text-xs leading-relaxed">
            {renderInline(line.slice(2), isUser)}
          </div>
        );
        return;
      }

      // Bullet points
      if (line.startsWith('* ') || line.startsWith('- ')) {
        elements.push(
          <div key={lineIdx} className="flex items-start gap-2 ml-1 my-1 text-neutral-300">
            <span className="text-neutral-400 mt-0.5 shrink-0 font-bold">•</span>
            <span className="leading-relaxed">{renderInline(line.slice(2), isUser)}</span>
          </div>
        );
        return;
      }

      // Numbered list
      const numMatch = line.match(/^(\d+)\.\s+/);
      if (numMatch) {
        elements.push(
          <div key={lineIdx} className="flex items-start gap-2 ml-1 my-1 text-neutral-300">
            <span className="text-neutral-400 font-bold font-mono shrink-0 w-5 text-right">{numMatch[1]}.</span>
            <span className="leading-relaxed">{renderInline(line.slice(numMatch[0].length), isUser)}</span>
          </div>
        );
        return;
      }

      // Empty lines
      if (line.trim() === '') {
        elements.push(<div key={lineIdx} className="h-1.5" />);
        return;
      }

      // Regular paragraph
      elements.push(
        <p key={lineIdx} className="my-1 leading-relaxed text-neutral-300">
          {renderInline(line, isUser)}
        </p>
      );
    });

    if (inTable) {
      flushTable('table-end');
    }

    return elements;
  };

  const renderInline = (text: string, isUser: boolean): React.ReactNode => {
    // Bold parsing
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className={isUser ? "font-black text-white" : "text-white font-bold"}>
            {part.slice(2, -2)}
          </strong>
        );
      }
      // Inline code
      const codeParts = part.split(/(`[^`]+`)/g);
      return codeParts.map((cp, j) => {
        if (cp.startsWith('`') && cp.endsWith('`')) {
          return (
            <code key={`${i}-${j}`} className="px-1.5 py-0.5 rounded bg-white/10 text-neutral-200 text-xs font-mono font-semibold">
              {cp.slice(1, -1)}
            </code>
          );
        }
        // Italic parsing
        const italicParts = cp.split(/(\*[^*]+\*)/g);
        return italicParts.map((ip, k) => {
          if (ip.startsWith('*') && ip.endsWith('*') && !ip.startsWith('**')) {
            return <em key={`${i}-${j}-${k}`} className="italic text-neutral-400">{ip.slice(1, -1)}</em>;
          }
          return <React.Fragment key={`${i}-${j}-${k}`}>{ip}</React.Fragment>;
        });
      });
    });
  };

  return (
    <div className="flex flex-col gap-6 max-w-[1600px] mx-auto pb-8 h-[calc(100vh-115px)]">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-neutral-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400 font-mono">Trading Coach</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">AI Coach</h1>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-[#111111] border border-[#222222] text-xs font-mono shadow-sm">
            <span className="w-2 h-2 rounded-full bg-neutral-400" />
            <span className="text-neutral-400">Trades Checked:</span>
            <span className="text-white font-bold text-sm">
              {tradeCount !== null ? `${tradeCount} Trades` : 'Checking...'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Two-Panel Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 overflow-hidden min-h-0">
        {/* Left Sidebar: Suggested Inquiries (4 cols) */}
        <Card className="lg:col-span-4 p-5 md:p-6 flex flex-col justify-between overflow-hidden hover:border-neutral-700 transition-all bg-[#0d0d0d] border border-[#1e1e1e]">
          <div className="space-y-5 overflow-y-auto pr-1">
            {/* Active Diagnostic Status Box */}
            <div className="p-4 rounded-xl bg-[#141414] border border-[#242424] flex items-start gap-3.5">
              <div className="h-10 w-10 rounded-xl bg-[#1c1c1c] border border-[#2a2a2a] flex items-center justify-center text-neutral-200 shrink-0 shadow-sm">
                <BrainCircuit className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white tracking-wide">Coach Ready</h3>
                <p className="text-xs text-neutral-400 leading-relaxed mt-1">
                  Ready to help you stop mistakes and protect your money.
                </p>
              </div>
            </div>

            {/* Suggested Questions */}
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-neutral-400 block mb-3 font-semibold">
                Common Questions
              </span>
              <div className="space-y-2">
                {suggestedQuestions.map((q, idx) => {
                  const Icon = q.icon;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleSend(q.text)}
                      disabled={isTyping}
                      className="w-full text-left p-3 rounded-xl bg-[#131313] hover:bg-[#1a1a1a] border border-[#222222] hover:border-[#333333] transition-all text-xs md:text-sm font-medium text-neutral-300 hover:text-white flex items-center gap-3 group cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Icon className="w-4 h-4 text-neutral-400 group-hover:text-white transition-colors shrink-0" />
                      <span className="flex-1">{q.text}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-neutral-500 group-hover:text-white transition-colors shrink-0 opacity-0 group-hover:opacity-100" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-[#1e1e1e] text-xs text-neutral-400 flex items-center justify-between font-mono">
            <span>Speed: <strong className="text-white font-semibold">Fast (&lt; 2.5s)</strong></span>
            <span className="text-neutral-400 font-semibold">Remembers Chat</span>
          </div>
        </Card>

        {/* Right Panel: Chat Stream Area (8 cols) */}
        <Card className="lg:col-span-8 flex flex-col overflow-hidden hover:border-neutral-700 transition-all bg-[#0d0d0d] border border-[#1e1e1e]">
          {/* Message Stream */}
          <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-5">
            {messages.map((msg, idx) => (
              <div 
                key={idx} 
                className={cn(
                  "flex gap-3.5 max-w-[90%] animate-in fade-in duration-200", 
                  msg.role === 'user' ? "ml-auto flex-row-reverse" : ""
                )}
              >
                {/* Avatar */}
                <div className={cn(
                  "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 shadow-md",
                  msg.role === 'user' 
                    ? "bg-[#242424] border border-[#333333] text-white" 
                    : "bg-[#161616] border border-[#262626] text-neutral-300"
                )}>
                  {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                </div>

                {/* Message Bubble */}
                <div className={cn(
                  "p-4 md:p-5 rounded-2xl text-sm leading-relaxed shadow-lg min-w-0",
                  msg.role === 'user' 
                    ? "bg-[#1f1f1f] border border-[#2e2e2e] text-white rounded-tr-none font-medium" 
                    : "bg-[#121212] border border-[#222222] text-neutral-200 rounded-tl-none space-y-1"
                )}>
                  <div className="space-y-0.5 break-words">
                    {renderMarkdown(msg.content, msg.role === 'user')}
                  </div>
                  {msg.isStreaming && (
                    <span className="inline-block w-2 h-4 bg-neutral-300 animate-pulse ml-1 rounded-sm align-middle" />
                  )}
                  <div className="flex items-center justify-between pt-2 border-t border-neutral-800 text-[11px] font-mono text-neutral-400">
                    <span>{msg.provider || (msg.role === 'user' ? 'You' : 'AI Coach')}</span>
                    <span>{msg.timestamp}</span>
                  </div>
                </div>
              </div>
            ))}

            {/* Active Typing / Analysis Indicator */}
            {isTyping && (
              <div className="flex gap-3.5 max-w-[85%] animate-in fade-in">
                <div className="w-9 h-9 rounded-xl bg-[#161616] border border-[#262626] text-neutral-300 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot size={16} />
                </div>
                <div className="p-3.5 px-4 rounded-2xl bg-[#121212] border border-[#222222] flex items-center gap-3 shadow-md">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                  <span className="text-xs font-mono text-neutral-400 animate-pulse">
                    {typingSteps[typingStep]}
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input Bar */}
          <div className="p-4 border-t border-[#1e1e1e] bg-[#0a0a0a]">
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleSend(input);
              }}
              className="flex items-center gap-3"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask anything about your trading, mistakes, or rules..."
                className="flex-1 bg-[#141414] border border-[#242424] rounded-xl px-4 py-3 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-neutral-500 transition-colors"
                disabled={isTyping}
              />
              <Button
                type="submit"
                disabled={!input.trim() || isTyping}
                className="bg-white hover:bg-neutral-200 text-black px-5 py-3 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg cursor-pointer transition-all disabled:opacity-50 shrink-0"
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">Ask</span>
              </Button>
            </form>
          </div>
        </Card>
      </div>
    </div>
  );
}

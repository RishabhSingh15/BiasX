'use client';

import React from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CoachInputBarProps {
  input: string;
  setInput: (val: string) => void;
  isTyping: boolean;
  onSend: (text: string) => void;
}

export function CoachInputBar({
  input,
  setInput,
  isTyping,
  onSend,
}: CoachInputBarProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSend(input);
  };

  return (
    <div className="p-4 md:p-5 bg-[#E0E5EC] shrink-0">
      <form onSubmit={handleSubmit} className="flex items-center gap-2 bg-[#E0E5EC] neu-inset rounded-[24px] p-1.5 pl-5">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask anything about your trading, mistakes, or rules..."
          className="flex-1 bg-transparent border-0 outline-none text-sm text-[#2D3748] placeholder:text-[#718096] font-body"
          disabled={isTyping}
        />
        <Button
          type="submit"
          disabled={!input.trim() || isTyping}
          className="neu-btn-primary text-white h-10 px-5 rounded-[20px] font-heading font-bold text-xs flex items-center gap-2 shadow-md cursor-pointer transition-all disabled:opacity-50 shrink-0"
        >
          <Send className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Ask</span>
        </Button>
      </form>
    </div>
  );
}

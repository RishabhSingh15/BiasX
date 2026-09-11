'use client';

import React from 'react';
import { User, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Message } from '../types';
import { renderCoachMarkdown } from './coach-markdown';

interface CoachMessageItemProps {
  msg: Message;
}

export function CoachMessageItem({ msg }: CoachMessageItemProps) {
  const isUser = msg.role === 'user';

  return (
    <div 
      className={cn(
        "flex gap-3.5 max-w-[95%] md:max-w-[85%] animate-in fade-in duration-200", 
        isUser ? "ml-auto flex-row-reverse" : ""
      )}
    >
      {/* Avatar */}
      <div className={cn(
        "w-9 h-9 rounded-[14px] flex items-center justify-center shrink-0 mt-0.5",
        isUser 
          ? "bg-[#6C63FF] text-white shadow-md" 
          : "bg-[#E0E5EC] neu-inset-sm text-[#6C63FF]"
      )}>
        {isUser ? <User size={16} /> : <Bot size={16} />}
      </div>

      {/* Message Card Bubble */}
      <div className={cn(
        "p-4 md:p-5 rounded-[22px] text-sm leading-relaxed min-w-0 max-w-full font-body overflow-hidden",
        isUser 
          ? "bg-[#6C63FF] text-white font-medium shadow-md" 
          : "bg-[#E0E5EC] neu-raised-sm text-[#2D3748] space-y-1"
      )}>
        <div className="space-y-0.5 break-words overflow-x-auto">
          {renderCoachMarkdown(msg.content, isUser)}
        </div>
        {msg.isStreaming && (
          <span className="inline-block w-2 h-4 bg-[#6C63FF] animate-pulse ml-1 rounded-sm align-middle" />
        )}
        <div className={cn(
          "flex items-center justify-between pt-2 text-xs font-mono",
          isUser ? "border-t border-white/20 text-white/80" : "text-[#718096]"
        )}>
          <span>{isUser ? 'You' : 'BiasX Intelligence'}</span>
          <span>{msg.timestamp}</span>
        </div>
      </div>
    </div>
  );
}

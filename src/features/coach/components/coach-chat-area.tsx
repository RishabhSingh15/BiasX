'use client';

import React from 'react';
import { Bot } from 'lucide-react';
import { Message } from '../types';
import { CoachMessageItem } from './coach-message-item';

interface CoachChatAreaProps {
  messages: Message[];
  isTyping: boolean;
  typingText: string;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}

export function CoachChatArea({
  messages,
  isTyping,
  typingText,
  messagesEndRef,
}: CoachChatAreaProps) {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6 space-y-4 bg-[#E0E5EC]">
      {messages.map((msg, idx) => (
        <CoachMessageItem key={idx} msg={msg} />
      ))}

      {/* Active Typing / Analysis Indicator - Clean & Borderless */}
      {isTyping && (
        <div className="flex items-center gap-3.5 pl-1 animate-in fade-in duration-150">
          <div className="w-8 h-8 rounded-[12px] bg-[#6C63FF]/15 text-[#6C63FF] flex items-center justify-center shrink-0">
            <Bot size={17} />
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#4A5568]">
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-[#6C63FF] rounded-full animate-bounce" />
              <span className="w-1.5 h-1.5 bg-[#6C63FF] rounded-full animate-bounce [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 bg-[#6C63FF] rounded-full animate-bounce [animation-delay:0.4s]" />
            </div>
            <span className="font-medium animate-pulse">{typingText}</span>
          </div>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}

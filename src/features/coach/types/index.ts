import { LucideIcon } from 'lucide-react';

export interface Message {
  role: 'assistant' | 'user';
  content: string;
  timestamp: string;
  provider?: string;
  isStreaming?: boolean;
}

export interface SuggestedQuestion {
  text: string;
  icon: LucideIcon;
}

'use client';

import React from 'react';

interface MiniCandleSparklineProps {
  isPositive?: boolean;
  neutral?: boolean;
}

export function MiniCandleSparkline({ isPositive = true, neutral = false }: MiniCandleSparklineProps) {
  const color = neutral ? '#A0AEC0' : (isPositive ? '#38B2AC' : '#FF6B6B');
  return (
    <svg className="w-16 h-10 shrink-0" viewBox="0 0 64 40" fill="none">
      <line x1="8" y1="16" x2="8" y2="34" stroke={color} strokeWidth="1.2" opacity="0.7" />
      <rect x="5.5" y="20" width="5" height="9" fill={color} rx="1" />
      
      <line x1="20" y1="10" x2="20" y2="30" stroke={color} strokeWidth="1.2" opacity="0.7" />
      <rect x="17.5" y="15" width="5" height="10" fill={color} rx="1" />
      
      <line x1="32" y1="6" x2="32" y2="28" stroke={color} strokeWidth="1.2" opacity="0.7" />
      <rect x="29.5" y="10" width="5" height="12" fill={color} rx="1" />
      
      <line x1="44" y1="14" x2="44" y2="34" stroke={color} strokeWidth="1.2" opacity="0.7" />
      <rect x="41.5" y="18" width="5" height="9" fill={color} rx="1" />
      
      <line x1="56" y1="4" x2="56" y2="24" stroke={color} strokeWidth="1.2" opacity="0.7" />
      <rect x="53.5" y="6" width="5" height="13" fill={color} rx="1" />
    </svg>
  );
}

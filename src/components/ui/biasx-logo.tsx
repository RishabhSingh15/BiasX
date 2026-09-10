import React from 'react';
import { cn } from '@/lib/utils';

interface BiasXLogoProps {
  className?: string;
  size?: number;
  showGlow?: boolean;
}

export function BiasXLogo({ className, size = 26, showGlow = false }: BiasXLogoProps) {
  return (
    <svg 
      viewBox="0 0 100 100" 
      width={size} 
      height={size} 
      className={cn(
        "shrink-0 transition-transform duration-300", 
        showGlow && "filter drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]",
        className
      )}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Deep Dusky Charcoal Facet 1 */}
        <linearGradient id="bx-dusky-dark" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#222222" />
          <stop offset="100%" stopColor="#444444" />
        </linearGradient>

        {/* Dusky Metallic Platinum Facet 2 */}
        <linearGradient id="bx-dusky-light" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#444444" />
          <stop offset="50%" stopColor="#888888" />
          <stop offset="100%" stopColor="#CCCCCC" />
        </linearGradient>

        {/* Pure Diamond White / Platinum Facet 3 */}
        <linearGradient id="bx-white" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="60%" stopColor="#E2E8F0" />
          <stop offset="100%" stopColor="#94A3B8" />
        </linearGradient>
      </defs>

      {/* 1. Ascending Vector Blade (Left Facet - Charcoal) */}
      <path 
        d="M 16 84 L 26 84 L 74 16 L 64 16 Z" 
        fill="url(#bx-dusky-dark)" 
      />

      {/* 2. Ascending Vector Blade (Right Facet - Platinum) */}
      <path 
        d="M 26 84 L 36 84 L 84 16 L 74 16 Z" 
        fill="url(#bx-dusky-light)" 
      />

      {/* 3. Descending Shield Blade - Top Segment (Pure White) */}
      <path 
        d="M 16 16 L 36 16 L 47 27 L 37 37 Z" 
        fill="url(#bx-white)" 
      />

      {/* 4. Descending Shield Blade - Bottom Segment (Pure White) */}
      <path 
        d="M 53 53 L 63 43 L 84 84 L 64 84 Z" 
        fill="url(#bx-white)" 
      />

      {/* 5. Center Equilibrium Dot */}
      <circle 
        cx="50" 
        cy="50" 
        r="3" 
        fill="#FFFFFF" 
        className="filter drop-shadow-[0_0_4px_#FFFFFF]" 
      />
    </svg>
  );
}

export default BiasXLogo;

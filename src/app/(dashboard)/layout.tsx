'use client';

import React from 'react';
import { Sidebar } from '@/components/layout/sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex h-screen overflow-hidden bg-[#050608]">
      {/* Option 1: Minimalist Dark Celestial Crescent on Pitch Black */}
      <div 
        className="pointer-events-none absolute inset-0 bg-cover bg-no-repeat opacity-100"
        style={{ 
          backgroundImage: "url('/active-bg.jpg')",
          backgroundPosition: "center 28%",
          backgroundSize: "cover",
          filter: "brightness(1.25) contrast(1.15)"
        }}
      />

      {/* Main App Content with subtle rounded outer container framing */}
      <div className="relative z-10 flex h-full w-full overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, ExternalLink, CheckCircle2, ShieldCheck } from 'lucide-react';

export function SettingsView() {
  const [geminiKey, setGeminiKey] = useState('');
  const [groqKey, setGroqKey] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  const handleSaveAIKeys = () => {
    if (typeof window !== 'undefined') {
      if (geminiKey) localStorage.setItem('biasx_gemini_key', geminiKey);
      if (groqKey) localStorage.setItem('biasx_groq_key', groqKey);
    }
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto w-full pb-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-heading font-extrabold tracking-tight text-[#2D3748]">Settings</h1>
      </div>

      {/* AI Model Configuration Card */}
      <Card className="rounded-[32px] neu-raised bg-[#E0E5EC] border-0 p-2">
        <CardHeader className="p-6 md:p-8 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-[20px] bg-[#E0E5EC] neu-inset-sm flex items-center justify-center text-[#6C63FF]">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <CardTitle className="text-lg font-heading font-bold text-[#2D3748]">AI Cross-Check & Coach Engine</CardTitle>
                <CardDescription className="text-xs text-[#4A5568] font-body mt-0.5">
                  High-capacity free tier models with zero credit expiration.
                </CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="text-xs font-mono font-semibold border-[#38B2AC]/30 text-[#38B2AC] bg-[#38B2AC]/10 rounded-[14px] px-3 py-1">
              Free Tier Active
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-6 md:p-8 pt-0 space-y-5">
          {/* Option 1: Google Gemini */}
          <div className="p-5 rounded-[24px] bg-[#E0E5EC] neu-inset space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-sm font-heading font-bold text-[#2D3748] flex items-center gap-2">
                  Google Gemini 2.0 Flash
                  <span className="text-[10px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-[#38B2AC]/15 border border-[#38B2AC]/30 text-[#38B2AC]">
                    Recommended (1,500 req/day FREE)
                  </span>
                </span>
                <p className="text-xs text-[#4A5568] font-body mt-1">
                  100% free with no credit card required. Fast sub-second reasoning for terminal cross-checking.
                </p>
              </div>
              <a 
                href="https://aistudio.google.com/" 
                target="_blank" 
                rel="noreferrer"
                className="text-xs font-semibold text-[#6C63FF] hover:text-[#584edb] flex items-center gap-1.5 whitespace-nowrap self-start sm:self-auto"
              >
                <span>Get Free Key</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
            <div className="flex items-center gap-2">
              <input 
                type="password" 
                placeholder="Paste GEMINI_API_KEY (e.g. AIzaSy...)" 
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                className="flex-1 bg-[#E0E5EC] neu-inset-deep rounded-[18px] px-4 py-2.5 text-xs font-mono text-[#2D3748] placeholder:text-[#718096] focus:outline-none focus:ring-2 focus:ring-[#6C63FF] border-0"
              />
            </div>
          </div>

          {/* Option 2: Groq */}
          <div className="p-5 rounded-[24px] bg-[#E0E5EC] neu-inset space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-sm font-heading font-bold text-[#2D3748] flex items-center gap-2">
                  Groq Cloud (Llama 3.3 70B)
                  <span className="text-[10px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-[#6C63FF]/15 border border-[#6C63FF]/30 text-[#6C63FF]">
                    Alternative Free Tier
                  </span>
                </span>
                <p className="text-xs text-[#4A5568] font-body mt-1">
                  Ultra-fast open weights inference with free generous daily limits.
                </p>
              </div>
              <a 
                href="https://console.groq.com/" 
                target="_blank" 
                rel="noreferrer"
                className="text-xs font-semibold text-[#6C63FF] hover:text-[#584edb] flex items-center gap-1.5 whitespace-nowrap self-start sm:self-auto"
              >
                <span>Get Groq Key</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
            <div className="flex items-center gap-2">
              <input 
                type="password" 
                placeholder="Paste GROQ_API_KEY (e.g. gsk_...)" 
                value={groqKey}
                onChange={(e) => setGroqKey(e.target.value)}
                className="flex-1 bg-[#E0E5EC] neu-inset-deep rounded-[18px] px-4 py-2.5 text-xs font-mono text-[#2D3748] placeholder:text-[#718096] focus:outline-none focus:ring-2 focus:ring-[#6C63FF] border-0"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <div className="flex items-center gap-2 text-xs text-[#4A5568]">
              <ShieldCheck className="w-4 h-4 text-[#38B2AC] shrink-0" />
              <span>Keys are stored locally. Built-in fallback runs if keys are not provided.</span>
            </div>
            <Button 
              onClick={handleSaveAIKeys}
              className="neu-btn-primary text-white text-xs font-semibold px-5 py-2.5 rounded-[20px] cursor-pointer"
            >
              {isSaved ? (
                <span className="flex items-center gap-1.5 text-white">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#38B2AC]" /> Saved!
                </span>
              ) : (
                'Save AI Configuration'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Profile Card */}
      <Card className="rounded-[32px] neu-raised bg-[#E0E5EC] border-0 p-2">
        <CardHeader className="p-6 md:p-8 pb-4">
          <CardTitle className="text-lg font-heading font-bold text-[#2D3748]">Profile</CardTitle>
          <CardDescription className="text-xs text-[#4A5568] font-body">Your personal trader identity.</CardDescription>
        </CardHeader>
        <CardContent className="p-6 md:p-8 pt-0 space-y-5">
          <div className="grid gap-2">
            <label className="text-xs font-bold text-[#4A5568] uppercase tracking-wider">Trader Name</label>
            <input 
              type="text" 
              defaultValue="Alex Trader" 
              className="bg-[#E0E5EC] neu-inset-deep rounded-[20px] px-4 py-3 text-sm font-semibold text-[#2D3748] focus:outline-none focus:ring-2 focus:ring-[#6C63FF] border-0" 
            />
          </div>
          <div className="grid gap-2">
            <label className="text-xs font-bold text-[#4A5568] uppercase tracking-wider">Email</label>
            <input 
              type="email" 
              defaultValue="alex@example.com" 
              disabled 
              className="bg-[#E0E5EC] neu-inset rounded-[20px] px-4 py-3 text-sm text-[#4A5568] opacity-70 cursor-not-allowed border-0" 
            />
          </div>
          <Button className="neu-btn-primary text-white text-xs font-semibold px-5 py-2.5 rounded-[20px] cursor-pointer">
            Save Profile
          </Button>
        </CardContent>
      </Card>

      {/* Trading Preferences */}
      <Card className="rounded-[32px] neu-raised bg-[#E0E5EC] border-0 p-2">
        <CardHeader className="p-6 md:p-8 pb-4">
          <CardTitle className="text-lg font-heading font-bold text-[#2D3748]">Trading Preferences</CardTitle>
          <CardDescription className="text-xs text-[#4A5568] font-body">Default settings for the trading terminal.</CardDescription>
        </CardHeader>
        <CardContent className="p-6 md:p-8 pt-0 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="grid gap-2">
              <label className="text-xs font-bold text-[#4A5568] uppercase tracking-wider">Default Timeframe</label>
              <select 
                defaultValue="15m"
                className="bg-[#E0E5EC] neu-inset-deep rounded-[20px] px-4 py-3 text-sm font-semibold text-[#2D3748] focus:outline-none focus:ring-2 focus:ring-[#6C63FF] border-0 cursor-pointer"
              >
                <option value="1m">1m</option>
                <option value="5m">5m</option>
                <option value="15m">15m</option>
                <option value="1H">1H</option>
              </select>
            </div>
            <div className="grid gap-2">
              <label className="text-xs font-bold text-[#4A5568] uppercase tracking-wider">Default Risk %</label>
              <input 
                type="number" 
                step="0.1" 
                defaultValue="1.0" 
                className="bg-[#E0E5EC] neu-inset-deep rounded-[20px] px-4 py-3 text-sm font-mono font-semibold text-[#2D3748] focus:outline-none focus:ring-2 focus:ring-[#6C63FF] border-0" 
              />
            </div>
          </div>
          <Button variant="secondary" className="neu-btn-secondary bg-[#E0E5EC] text-[#2D3748] hover:text-[#6C63FF] text-xs font-semibold px-5 py-2.5 rounded-[20px] cursor-pointer border-0">
            Update Preferences
          </Button>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="rounded-[32px] neu-raised bg-[#E0E5EC] border border-[#FF6B6B]/20 p-2">
        <CardHeader className="p-6 md:p-8 pb-4">
          <CardTitle className="text-lg font-heading font-bold text-[#FF6B6B]">Danger Zone</CardTitle>
          <CardDescription className="text-xs text-[#4A5568] font-body">Irreversible actions related to your account ledger.</CardDescription>
        </CardHeader>
        <CardContent className="p-6 md:p-8 pt-0 flex flex-col sm:flex-row gap-4">
          <Button variant="outline" className="flex-1 bg-[#E0E5EC] neu-raised-sm hover:neu-inset-sm border-0 text-[#2D3748] text-xs font-semibold py-2.5 rounded-[20px]">
            Export Complete Trade Ledger
          </Button>
          <Button variant="destructive" className="flex-1 bg-[#FF6B6B]/15 hover:bg-[#FF6B6B]/25 border border-[#FF6B6B]/30 text-[#FF6B6B] text-xs font-semibold py-2.5 rounded-[20px]">
            Reset Historical Data
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

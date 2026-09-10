'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, ExternalLink, CheckCircle2, ShieldCheck, Key } from 'lucide-react';

export default function SettingsPage() {
  const [geminiKey, setGeminiKey] = useState('');
  const [groqKey, setGroqKey] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  const handleSaveAIKeys = () => {
    // Store in localStorage for client-side persistence or inform user
    if (typeof window !== 'undefined') {
      if (geminiKey) localStorage.setItem('biasx_gemini_key', geminiKey);
      if (groqKey) localStorage.setItem('biasx_groq_key', groqKey);
    }
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="flex flex-col gap-6 p-4 max-w-3xl mx-auto w-full">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Settings</h1>
      </div>

      {/* AI Model Configuration Card (Zero Credit Issues) */}
      <Card className="border-white/10 bg-black/20 backdrop-blur-[2px]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#2a2a2a]/15 border border-[#2a2a2a]/30 flex items-center justify-center text-[#2a2a2a]">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <CardTitle className="text-lg text-white">AI Cross-Check & Coach Engine</CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  High-capacity free tier models with zero credit expiration.
                </CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="text-xs font-mono border-neutral-700 text-emerald-400 bg-neutral-800/50">
              Free Tier Active
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Option 1: Google Gemini */}
          <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-bold text-white flex items-center gap-2">
                  Google Gemini 2.0 Flash
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-neutral-800/60 border border-neutral-700 text-emerald-300">
                    Recommended (1,500 req/day FREE)
                  </span>
                </span>
                <p className="text-xs text-slate-400 mt-0.5">
                  100% free with no credit card required. Fast sub-second reasoning for terminal cross-checking.
                </p>
              </div>
              <a 
                href="https://aistudio.google.com/" 
                target="_blank" 
                rel="noreferrer"
                className="text-xs text-[#2a2a2a] hover:text-emerald-300 flex items-center gap-1 font-medium whitespace-nowrap ml-2"
              >
                <span>Get Free Key</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="flex items-center gap-2">
              <input 
                type="password" 
                placeholder="Paste GEMINI_API_KEY (e.g. AIzaSy...)" 
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                className="flex-1 bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-xs font-mono text-white placeholder:text-white/30 focus:outline-none focus:border-[#2a2a2a]"
              />
            </div>
          </div>

          {/* Option 2: Groq */}
          <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-bold text-white flex items-center gap-2">
                  Groq Cloud (Llama 3.3 70B)
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-slate-300">
                    Alternative Free Tier
                  </span>
                </span>
                <p className="text-xs text-slate-400 mt-0.5">
                  Ultra-fast open weights inference with free generous daily limits.
                </p>
              </div>
              <a 
                href="https://console.groq.com/" 
                target="_blank" 
                rel="noreferrer"
                className="text-xs text-[#2a2a2a] hover:text-emerald-300 flex items-center gap-1 font-medium whitespace-nowrap ml-2"
              >
                <span>Get Groq Key</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="flex items-center gap-2">
              <input 
                type="password" 
                placeholder="Paste GROQ_API_KEY (e.g. gsk_...)" 
                value={groqKey}
                onChange={(e) => setGroqKey(e.target.value)}
                className="flex-1 bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-xs font-mono text-white placeholder:text-white/30 focus:outline-none focus:border-[#2a2a2a]"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <ShieldCheck className="w-4 h-4 text-[#2a2a2a]" />
              <span>Keys are stored locally. Built-in fallback runs if keys are not provided.</span>
            </div>
            <Button 
              onClick={handleSaveAIKeys}
              className="bg-[#2a2a2a] hover:bg-[#333333] text-white text-xs font-semibold px-4 py-2 rounded-xl cursor-pointer shadow-md"
            >
              {isSaved ? (
                <span className="flex items-center gap-1.5 text-neutral-200">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Saved!
                </span>
              ) : (
                'Save AI Configuration'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Profile Card */}
      <Card className="border-white/10 bg-black/20 backdrop-blur-[2px]">
        <CardHeader>
          <CardTitle className="text-lg text-white">Profile</CardTitle>
          <CardDescription className="text-xs text-slate-400">Your personal trader identity.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <label className="text-xs font-medium text-slate-400">Trader Name</label>
            <input type="text" defaultValue="Alex Trader" className="bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#2a2a2a]" />
          </div>
          <div className="grid gap-2">
            <label className="text-xs font-medium text-slate-400">Email</label>
            <input type="email" defaultValue="alex@example.com" disabled className="bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm text-white/50 opacity-70 cursor-not-allowed" />
          </div>
          <Button className="bg-[#2a2a2a] hover:bg-[#333333] text-white text-xs font-semibold px-4 py-2 rounded-xl cursor-pointer">
            Save Profile
          </Button>
        </CardContent>
      </Card>

      {/* Trading Preferences */}
      <Card className="border-white/10 bg-black/20 backdrop-blur-[2px]">
        <CardHeader>
          <CardTitle className="text-lg text-white">Trading Preferences</CardTitle>
          <CardDescription className="text-xs text-slate-400">Default settings for the trading terminal.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <label className="text-xs font-medium text-slate-400">Default Timeframe</label>
              <select className="bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#2a2a2a]">
                <option value="1m">1m</option>
                <option value="5m">5m</option>
                <option value="15m" selected>15m</option>
                <option value="1H">1H</option>
              </select>
            </div>
            <div className="grid gap-2">
              <label className="text-xs font-medium text-slate-400">Default Risk %</label>
              <input type="number" step="0.1" defaultValue="1.0" className="bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-[#2a2a2a]" />
            </div>
          </div>
          <Button variant="secondary" className="bg-white/10 hover:bg-white/15 text-white text-xs font-semibold px-4 py-2 rounded-xl cursor-pointer border border-white/10">
            Update Preferences
          </Button>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-500/30 bg-red-500/[0.04]">
        <CardHeader>
          <CardTitle className="text-lg text-red-400">Danger Zone</CardTitle>
          <CardDescription className="text-xs text-slate-400">Irreversible actions related to your account ledger.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-4">
          <Button variant="outline" className="flex-1 bg-black/20 border-white/15 text-white hover:bg-white/10 text-xs">
            Export Complete Trade Ledger
          </Button>
          <Button variant="destructive" className="flex-1 bg-red-500/20 border border-red-500/40 text-red-300 hover:bg-red-500/30 text-xs">
            Reset Historical Data
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

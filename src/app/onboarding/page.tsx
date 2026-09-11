'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, ArrowRight, BrainCircuit, Upload, PlayCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const totalSteps = 4;

  const handleNext = () => {
    if (step === 3) {
      setIsLoading(true);
      setTimeout(() => {
        setIsLoading(false);
        setStep(4);
      }, 2000);
    } else if (step === 4) {
      router.push('/dashboard');
    } else {
      setStep(prev => prev + 1);
    }
  };

  return (
    <div className="min-h-screen bg-[#E0E5EC] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        
        {/* Progress Bar */}
        <div className="flex gap-2.5 mb-8 w-full">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div 
              key={i} 
              className={cn(
                "h-2 flex-1 rounded-full neu-inset-sm transition-all duration-500",
                i + 1 <= step ? "bg-[#6C63FF]" : "bg-[#A0AEC0]/30"
              )}
            />
          ))}
        </div>

        <Card className="w-full bg-[#E0E5EC] rounded-[32px] neu-raised border-0 overflow-hidden relative p-2 md:p-4">
          <CardContent className="p-8 md:p-12">
            
            {step === 1 && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-[#E0E5EC] neu-inset-sm text-[#6C63FF] rounded-[24px] flex items-center justify-center mb-6">
                  <BrainCircuit size={32} />
                </div>
                <h1 className="text-3xl md:text-4xl font-heading font-extrabold tracking-tight text-[#3D4852] mb-3">Welcome to BiasX</h1>
                <p className="text-[#6B7280] font-body mb-8 max-w-md leading-relaxed text-sm md:text-base">
                  The first trading terminal built to protect you from yourself. We combine execution with real-time behavioral analytics to enforce your discipline.
                </p>
                <Button size="lg" onClick={handleNext} className="neu-btn-primary text-white font-bold px-8 py-3 rounded-[22px] cursor-pointer">
                  Get Started <ArrowRight className="ml-2" size={18} />
                </Button>
              </div>
            )}

            {step === 2 && (
              <div className="animate-in fade-in slide-in-from-right-8 duration-300">
                <h2 className="text-2xl font-heading font-extrabold text-[#3D4852] mb-1">Connect Data Source</h2>
                <p className="text-[#6B7280] font-body text-sm mb-6">To analyze your behavior, we need some trading history.</p>
                
                <div className="grid gap-4">
                  <div className="border-2 border-[#6C63FF] bg-[#E0E5EC] neu-inset rounded-[24px] p-6 cursor-pointer flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#6C63FF]/15 text-[#6C63FF] rounded-[18px] flex items-center justify-center shrink-0">
                      <PlayCircle size={24} />
                    </div>
                    <div>
                      <h3 className="font-heading font-bold text-[#3D4852]">Use Demo Data</h3>
                      <p className="text-xs text-[#6B7280] font-body">Pre-loaded with 342 trades for testing</p>
                    </div>
                    <CheckCircle2 className="ml-auto text-[#38B2AC]" size={24} />
                  </div>

                  <div className="bg-[#E0E5EC] neu-raised rounded-[24px] p-6 cursor-pointer flex items-center gap-4 hover:neu-inset transition-all opacity-80">
                    <div className="w-12 h-12 bg-[#E0E5EC] neu-inset-sm text-[#6B7280] rounded-[18px] flex items-center justify-center shrink-0">
                      <Upload size={24} />
                    </div>
                    <div>
                      <h3 className="font-heading font-bold text-[#3D4852]">Import CSV</h3>
                      <p className="text-xs text-[#6B7280] font-body">Upload history from any broker</p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center mt-8">
                  <Button variant="ghost" onClick={() => setStep(1)} className="bg-[#E0E5EC] neu-raised-sm hover:neu-inset-sm text-[#6B7280] hover:text-[#3D4852] rounded-[18px] px-5">Back</Button>
                  <Button onClick={handleNext} className="neu-btn-primary text-white font-bold px-8 py-2.5 rounded-[20px] cursor-pointer">Continue</Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="animate-in fade-in slide-in-from-right-8 duration-300">
                <h2 className="text-2xl font-heading font-extrabold text-[#3D4852] mb-1">Define Core Rules</h2>
                <p className="text-[#6B7280] font-body text-sm mb-6">Set your baseline risk parameters. You can adjust these later.</p>
                
                <div className="space-y-5">
                  <div>
                    <label className="text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-1.5 block">Maximum Risk Per Trade (%)</label>
                    <input type="number" defaultValue="1.0" step="0.1" className="w-full bg-[#E0E5EC] neu-inset-deep border-0 rounded-[20px] px-4 py-3 text-sm font-mono text-[#3D4852] focus:outline-none focus:ring-2 focus:ring-[#6C63FF]" />
                    <p className="text-xs text-[#6B7280] font-body mt-1">If a trade exceeds this, the AI will warn you.</p>
                  </div>
                  
                  <div>
                    <label className="text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-1.5 block">Maximum Daily Loss (%)</label>
                    <input type="number" defaultValue="2.0" step="0.1" className="w-full bg-[#E0E5EC] neu-inset-deep border-0 rounded-[20px] px-4 py-3 text-sm font-mono text-[#3D4852] focus:outline-none focus:ring-2 focus:ring-[#6C63FF]" />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-1.5 block">Max Trades Per Day</label>
                    <input type="number" defaultValue="3" className="w-full bg-[#E0E5EC] neu-inset-deep border-0 rounded-[20px] px-4 py-3 text-sm font-mono text-[#3D4852] focus:outline-none focus:ring-2 focus:ring-[#6C63FF]" />
                  </div>
                </div>

                <div className="flex justify-between items-center mt-8">
                  <Button variant="ghost" onClick={() => setStep(2)} disabled={isLoading} className="bg-[#E0E5EC] neu-raised-sm hover:neu-inset-sm text-[#6B7280] hover:text-[#3D4852] rounded-[18px] px-5">Back</Button>
                  <Button onClick={handleNext} disabled={isLoading} className="neu-btn-primary text-white font-bold px-8 py-2.5 rounded-[20px] w-32 cursor-pointer">
                    {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" /> : "Analyze"}
                  </Button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="animate-in fade-in zoom-in-95 duration-500 flex flex-col items-center text-center">
                <div className="relative mb-8 mt-4">
                  <div className="w-36 h-36 rounded-full bg-[#E0E5EC] neu-inset flex items-center justify-center p-3">
                    <div className="w-full h-full rounded-full bg-[#E0E5EC] neu-raised flex flex-col items-center justify-center border-4 border-[#38B2AC]">
                      <span className="text-3xl font-black font-mono text-[#3D4852]">67</span>
                      <span className="text-[10px] font-bold text-[#38B2AC] uppercase tracking-wider">Score</span>
                    </div>
                  </div>
                </div>
                
                <h2 className="text-2xl font-heading font-extrabold text-[#3D4852] mb-2">Analysis Complete</h2>
                <p className="text-[#6B7280] font-body mb-8 max-w-md text-sm leading-relaxed">
                  We&apos;ve processed 342 historical trades. Your baseline behavioral score is <strong className="text-[#3D4852] font-bold">67/100</strong>. Your main weakness is FOMO entries. 
                </p>
                
                <Button size="lg" onClick={handleNext} className="neu-btn-primary text-white font-bold px-8 py-3 rounded-[22px] w-full sm:w-auto cursor-pointer">
                  Enter Trading Terminal <ArrowRight className="ml-2" size={18} />
                </Button>
              </div>
            )}

          </CardContent>
        </Card>
      </div>
    </div>
  );
}

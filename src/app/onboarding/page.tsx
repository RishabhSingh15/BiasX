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
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        
        {/* Progress Bar */}
        <div className="flex gap-2 mb-8 w-full">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div 
              key={i} 
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors duration-500",
                i + 1 <= step ? "bg-primary" : "bg-muted"
              )}
            />
          ))}
        </div>

        <Card className="w-full bg-card/50 border-border/50 shadow-2xl backdrop-blur-sm overflow-hidden relative">
          {/* Background Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-primary/10 blur-[100px] pointer-events-none" />
          
          <CardContent className="p-8 md:p-12">
            
            {step === 1 && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-6">
                  <BrainCircuit size={32} />
                </div>
                <h1 className="text-3xl font-bold tracking-tight mb-4">Welcome to BiasX</h1>
                <p className="text-muted-foreground mb-8 max-w-md leading-relaxed">
                  The first trading terminal built to protect you from yourself. We combine execution with real-time behavioral analytics to enforce your discipline.
                </p>
                <Button size="lg" onClick={handleNext} className="w-full sm:w-auto font-bold px-8">
                  Get Started <ArrowRight className="ml-2" size={18} />
                </Button>
              </div>
            )}

            {step === 2 && (
              <div className="animate-in fade-in slide-in-from-right-8 duration-300">
                <h2 className="text-2xl font-bold mb-2">Connect Data Source</h2>
                <p className="text-muted-foreground mb-6">To analyze your behavior, we need some trading history.</p>
                
                <div className="grid gap-4">
                  <div className="border-2 border-primary bg-primary/5 rounded-xl p-6 cursor-pointer flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary/20 text-primary rounded-full flex items-center justify-center shrink-0">
                      <PlayCircle size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold">Use Demo Data</h3>
                      <p className="text-sm text-muted-foreground">Pre-loaded with 342 trades for testing</p>
                    </div>
                    <CheckCircle2 className="ml-auto text-primary" size={24} />
                  </div>

                  <div className="border border-border bg-card rounded-xl p-6 cursor-pointer flex items-center gap-4 hover:border-primary/50 transition-colors opacity-70">
                    <div className="w-12 h-12 bg-muted text-muted-foreground rounded-full flex items-center justify-center shrink-0">
                      <Upload size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold">Import CSV</h3>
                      <p className="text-sm text-muted-foreground">Upload history from any broker</p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between mt-8">
                  <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
                  <Button onClick={handleNext} className="font-bold px-8">Continue</Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="animate-in fade-in slide-in-from-right-8 duration-300">
                <h2 className="text-2xl font-bold mb-2">Define Core Rules</h2>
                <p className="text-muted-foreground mb-6">Set your baseline risk parameters. You can adjust these later.</p>
                
                <div className="space-y-5">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">Maximum Risk Per Trade (%)</label>
                    <input type="number" defaultValue="1.0" step="0.1" className="w-full bg-background border border-border rounded-lg px-4 py-3 text-sm font-mono" />
                    <p className="text-xs text-muted-foreground mt-1">If a trade exceeds this, the AI will warn you.</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">Maximum Daily Loss (%)</label>
                    <input type="number" defaultValue="2.0" step="0.1" className="w-full bg-background border border-border rounded-lg px-4 py-3 text-sm font-mono" />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">Max Trades Per Day</label>
                    <input type="number" defaultValue="3" className="w-full bg-background border border-border rounded-lg px-4 py-3 text-sm font-mono" />
                  </div>
                </div>

                <div className="flex justify-between mt-8">
                  <Button variant="ghost" onClick={() => setStep(2)} disabled={isLoading}>Back</Button>
                  <Button onClick={handleNext} disabled={isLoading} className="font-bold px-8 w-32">
                    {isLoading ? <div className="w-5 h-5 border-2 border-background/30 border-t-background rounded-full animate-spin" /> : "Analyze"}
                  </Button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="animate-in fade-in zoom-in-95 duration-500 flex flex-col items-center text-center">
                <div className="relative mb-8 mt-4">
                  <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full" />
                  <div className="relative flex items-center justify-center w-32 h-32 rounded-full border-8 border-emerald-500/20 bg-background">
                    <div className="absolute inset-0 rounded-full border-8 border-emerald-500" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 67%, 0 67%)' }}></div>
                    <div className="text-4xl font-bold font-mono">67</div>
                  </div>
                </div>
                
                <h2 className="text-2xl font-bold mb-2">Analysis Complete</h2>
                <p className="text-muted-foreground mb-8 max-w-md">
                  We've processed 342 historical trades. Your baseline behavioral score is <strong className="text-foreground">67/100</strong>. Your main weakness is FOMO entries. 
                </p>
                
                <Button size="lg" onClick={handleNext} className="w-full font-bold">
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

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Minimize2, Check, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SUPPORTED_SYMBOLS } from '@/components/charts/tradingview-chart';
import { TradeDirection, OrderAnalysisResult } from '../types';
import { SYMBOL_LIST } from '../constants/symbols';
import { useOrderCalculations } from '../hooks/use-order-calculations';
import { OrderPanel } from './order-panel';
import { OrderAnalysisModal } from './order-analysis-modal';

// Dynamically import TradingView chart to avoid SSR issues
const TradingViewChart = dynamic(
  () => import('@/components/charts/tradingview-chart').then(m => m.TradingViewChart),
  { 
    ssr: false, 
    loading: () => (
      <div className="flex-1 h-full min-h-[540px] flex items-center justify-center text-[#6B7280] font-mono text-sm bg-[#E0E5EC] neu-inset rounded-[32px] border border-[#A0AEC0]/20">
        <div className="flex items-center gap-2.5">
          <div className="h-4 w-4 rounded-full border-2 border-[#6C63FF] border-t-transparent animate-spin" />
          <span>Loading Chart...</span>
        </div>
      </div>
    ) 
  }
);

export function TerminalView() {
  const [accountBalance, setAccountBalance] = useState(2137.24);
  const [selectedSymbol, setSelectedSymbol] = useState('XAU/USD');
  const [direction, setDirection] = useState<TradeDirection>('BUY');
  const [lots, setLots] = useState('0.05');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isExecutingOrder, setIsExecutingOrder] = useState(false);
  const [orderNotification, setOrderNotification] = useState<{ 
    type: 'success' | 'error'; 
    title: string; 
    message: string; 
    pnl?: number 
  } | null>(null);

  const cfg = SUPPORTED_SYMBOLS[selectedSymbol] || SUPPORTED_SYMBOLS['XAU/USD'];
  const decimals = cfg.decimals;

  // Prices: direct user inputs stored as strings to prevent browser number-input leading zero quirks
  const [entryPrice, setEntryPrice] = useState<string>(String(cfg.defaultPrice));
  const [stopLoss, setStopLoss] = useState<string>(
    (cfg.defaultPrice * 0.992).toFixed(decimals)
  );
  const [takeProfit, setTakeProfit] = useState<string>(
    (cfg.defaultPrice * 1.020).toFixed(decimals)
  );

  const [analysisResult, setAnalysisResult] = useState<OrderAnalysisResult | null>(null);
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeRules, setActiveRules] = useState<any[]>([]);

  // Load user rules to dynamically configure risk limits and checks
  useEffect(() => {
    fetch('/api/rules', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d)) setActiveRules(d);
      })
      .catch(() => {});
  }, []);

  const maxRiskRule = activeRules.find((r: any) => r.isActive && (r.ruleType === 'max_risk' || r.ruleType === 'max_risk_per_trade'));
  const maxRiskLimit = maxRiskRule?.value ? parseFloat(maxRiskRule.value) : 1.0;

  // Synchronize with real account balance from API
  useEffect(() => {
    fetch('/api/dashboard/stats')
      .then(r => r.json())
      .then(d => {
        if (d?.account?.balance) {
          setAccountBalance(d.account.balance);
        }
      })
      .catch(() => {});
  }, []);

  // Recalculate default SL/TP when symbol or direction changes
  const applyDefaultSlTp = useCallback((basePrice: number, dir: TradeDirection, dec: number) => {
    if (!basePrice || isNaN(basePrice) || basePrice <= 0) return;
    if (dir === 'BUY') {
      setStopLoss((basePrice * 0.992).toFixed(dec));
      setTakeProfit((basePrice * 1.020).toFixed(dec));
    } else {
      setStopLoss((basePrice * 1.008).toFixed(dec));
      setTakeProfit((basePrice * 0.980).toFixed(dec));
    }
  }, []);

  const handleReset = () => {
    setAnalysisResult(null);
    setIsAnalysisModalOpen(false);
  };

  // Handle symbol change
  const handleSelectSymbol = (symbol: string) => {
    setSelectedSymbol(symbol);
    const symCfg = SUPPORTED_SYMBOLS[symbol] || SUPPORTED_SYMBOLS['XAU/USD'];
    const p = symCfg.defaultPrice;
    setEntryPrice(String(p));
    applyDefaultSlTp(p, direction, symCfg.decimals);
    setShowSearchDropdown(false);
    setSearchQuery('');
    handleReset();
  };

  // Handle direction toggle
  const handleDirectionChange = (newDir: TradeDirection) => {
    setDirection(newDir);
    const currentPrice = parseFloat(entryPrice) || cfg.defaultPrice;
    applyDefaultSlTp(currentPrice, newDir, decimals);
    handleReset();
  };

  // Order calculations hook
  const calc = useOrderCalculations({
    selectedSymbol,
    direction,
    lots,
    entryPrice,
    stopLoss,
    takeProfit,
    accountBalance,
    maxRiskLimit,
  });

  const {
    numLots,
    dollarRisk,
    dollarProfit,
    riskPct,
    slPricePct,
    tpPricePct,
    rrRatio,
    isRiskSafe,
    maxAllowedRiskDollar,
    isSlValid,
    isTpValid,
    slPriceDiff,
    tpPriceDiff,
  } = calc;

  // Handle ESC key to exit maximized mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMaximized) {
        setIsMaximized(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMaximized]);

  const handleCheckRules = async () => {
    setIsAnalyzing(true);
    try {
      const res = await fetch('/api/trade/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: selectedSymbol,
          direction: direction.toLowerCase(),
          entryPrice: parseFloat(entryPrice) || 0,
          stopLoss: parseFloat(stopLoss) || 0,
          takeProfit: parseFloat(takeProfit) || 0,
          positionSize: dollarRisk,
          quantity: numLots,
          riskPercentage: Number(riskPct.toFixed(2)),
          riskReward: parseFloat(rrRatio) || (dollarRisk > 0 ? Number((dollarProfit / dollarRisk).toFixed(2)) : 1.5)
        })
      });

      if (res.ok) {
        const data = await res.json();
        
        // Extract real rule results evaluated by the Behavioral Analysis Engine
        const engineRules = data.ruleResults?.results || [];
        const dynamicRulesList = engineRules.length > 0
          ? engineRules.map((r: any) => ({
              name: `${r.ruleName || 'Rule'}: ${r.actualValue || 'Active'}${r.expectedValue ? ` (Cap: ${r.expectedValue})` : ''}`,
              passed: r.passed,
              desc: r.message || r.evidence || (r.passed ? 'Compliant with trading plan' : 'Violates trading rule'),
              impact: r.severity === 'critical' ? 'high' : 'medium'
            }))
          : [
              { name: `Risk ≤ ${maxRiskLimit}% (${riskPct.toFixed(2)}% account)`, passed: isRiskSafe },
              { name: `Risk/Reward ≥ 1:1.5 (1:${rrRatio})`, passed: parseFloat(rrRatio) >= 1.5 },
              { name: `Stop Loss Placed (${slPricePct}% price move)`, passed: isSlValid && slPriceDiff > 0 },
              { name: `Take Profit Placed (${tpPricePct}% target move)`, passed: isTpValid && tpPriceDiff > 0 },
            ];

        // Overall status: honor engine status (BLOCK, HIGH RISK, CAUTION, SAFE)
        const anyBreach = engineRules.some((r: any) => !r.passed) || (riskPct > maxRiskLimit) || !isSlValid;
        const status: 'SAFE' | 'CAUTION' | 'HIGH RISK' | 'BLOCK' = data.status || (anyBreach ? (riskPct > maxRiskLimit * 1.5 ? 'HIGH RISK' : 'CAUTION') : 'SAFE');

        const dynamicMessage = data.aiExplanation || (data.why && data.why.length > 0 ? data.why.join('. ') : (
          anyBreach
            ? `Your setup breaches active guardrails. Risk: ${riskPct.toFixed(2)}% ($${dollarRisk.toFixed(2)}) against ${maxRiskLimit}% max allowance.`
            : `Setup complies with all active trading rules. You are risking ${riskPct.toFixed(2)}% ($${dollarRisk.toFixed(2)}) for 1:${rrRatio} potential return ($${dollarProfit.toFixed(2)}).`
        ));

        setAnalysisResult({
          analysisId: data.analysisId,
          status,
          title: status === 'SAFE' 
            ? 'Playbook Guardrails Passed' 
            : status === 'BLOCK'
            ? 'Trading Blocked: Circuit Breaker Triggered'
            : status === 'HIGH RISK'
            ? 'Critical Risk: Severe Guardrail Breach'
            : 'Caution: Parameter Adjustment Advised',
          message: dynamicMessage,
          behaviorDetected: data.behaviorDetected,
          rules: dynamicRulesList,
          consequences: data.consequences,
          protocol: data.protocol,
          historicalStats: data.similarityResult ? {
            totalSimilar: data.similarityResult.totalSimilar,
            winRate: Number((data.similarityResult.aggregateWinRate * 100).toFixed(1)),
            avgPnl: data.similarityResult.avgPnl
          } : undefined,
          keyTakeaway: data.keyTakeaway,
          canProceed: data.canProceed,
          recommendedLots: data.recommendedLots,
          recommendedTP: data.recommendedTP
        });
        setIsAnalysisModalOpen(true);
        setIsAnalyzing(false);
        return;
      }
    } catch (e) {
      console.warn('Analysis error:', e);
    }

    // Direct local check fallback
    const passedRR = parseFloat(rrRatio) >= 1.5;
    const passedSL = isSlValid && slPriceDiff > 0;
    const allPassed = isRiskSafe && passedRR && passedSL;
    const isVeryRisky = riskPct > maxRiskLimit * 1.5 || !isSlValid;
    const fallbackStatus: 'SAFE' | 'CAUTION' | 'HIGH RISK' = allPassed 
      ? 'SAFE' 
      : isVeryRisky 
      ? 'HIGH RISK' 
      : 'CAUTION';

    const fallbackConsequences = !allPassed ? [
      ...(!isRiskSafe ? [{
        title: 'Capital at Risk Exceeds Rule Cap',
        detail: `Risking ${riskPct.toFixed(2)}% ($${dollarRisk.toFixed(2)}) is ${(riskPct / maxRiskLimit).toFixed(1)}x higher than your ${maxRiskLimit}% personal limit ($${maxAllowedRiskDollar.toFixed(2)}). An unexpected adverse candle puts $${(dollarRisk - maxAllowedRiskDollar).toFixed(2)} of unplanned equity at risk.`,
        impact: 'high' as const,
        stat: `+$${(dollarRisk - maxAllowedRiskDollar).toFixed(2)} Excess Risk`
      }] : []),
      ...(!passedRR ? [{
        title: 'Unfavorable Risk-to-Reward Ratio',
        detail: `At 1:${rrRatio}, potential reward is smaller than your required threshold (1:1.5). You will need an unsustainable win rate to stay profitable.`,
        impact: 'medium' as const,
        stat: `1:${rrRatio} R:R`
      }] : []),
      {
        title: 'Rule Violation Drawdown Risk',
        detail: 'Bypassing active risk rules exposes your account to accelerated drawdowns and breaks execution discipline.',
        impact: 'medium' as const,
        stat: 'High Drawdown Risk'
      }
    ] : undefined;

    const fallbackProtocol = !allPassed ? [
      `1. Reduce lot size from ${numLots} to ${Math.max(0.01, Number((numLots * (maxRiskLimit / Math.max(0.1, riskPct))).toFixed(2)))} lots to cap dollar risk at $${maxAllowedRiskDollar.toFixed(2)}.`,
      `2. Calibrate Take Profit and Stop Loss to target a minimum 1:1.5 Risk-to-Reward ratio.`,
      `3. Wait 15 minutes before executing if returning from a recent loss to prevent emotional revenge trading.`
    ] : undefined;

    setAnalysisResult({
      status: fallbackStatus,
      title: allPassed 
        ? 'Playbook Guardrails Passed' 
        : isVeryRisky 
        ? 'Critical Risk: Severe Guardrail Breach'
        : 'Caution: Parameter Adjustment Advised',
      message: !isRiskSafe
        ? `Your risk is ${riskPct.toFixed(2)}% ($${dollarRisk.toFixed(2)}), above your ${maxRiskLimit}% limit ($${maxAllowedRiskDollar.toFixed(2)}). Lower your lot size.`
        : !isSlValid
          ? `Stop-loss is placed on the wrong side for a ${direction} trade.`
          : 'Setup follows all rules. Ready to trade.',
      rules: [
        { name: `Risk ≤ ${maxRiskLimit}% (${riskPct.toFixed(2)}% account)`, passed: isRiskSafe },
        { name: `Risk/Reward ≥ 1:1.5 (1:${rrRatio})`, passed: passedRR },
        { name: `Stop Loss Placed (${slPricePct}% price move)`, passed: passedSL },
        { name: `Take Profit Placed (${tpPricePct}% target move)`, passed: isTpValid && tpPriceDiff > 0 },
      ],
      consequences: fallbackConsequences,
      protocol: fallbackProtocol
    });
    setIsAnalysisModalOpen(true);
    setIsAnalyzing(false);
  };

  const filteredSymbols = SYMBOL_LIST.filter(s => 
    s.symbol.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handlePlaceOrder = async (decision: 'proceeded' | 'overridden') => {
    setIsExecutingOrder(true);
    try {
      const res = await fetch('/api/trade/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysisId: analysisResult?.analysisId,
          decision,
          tradeParams: {
            symbol: selectedSymbol,
            direction,
            entryPrice: parseFloat(entryPrice) || 0,
            stopLoss: parseFloat(stopLoss) || 0,
            takeProfit: parseFloat(takeProfit) || 0,
            quantity: calc.numLots,
            positionSize: calc.dollarRisk,
            riskPercentage: Number(calc.riskPct.toFixed(2)),
            riskReward: parseFloat(calc.rrRatio) || (calc.dollarRisk > 0 ? Number((calc.dollarProfit / calc.dollarRisk).toFixed(2)) : 1.5),
            dollarRisk: calc.dollarRisk,
            dollarProfit: calc.dollarProfit,
            contractMultiplier: calc.contractMultiplier
          }
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        if (data.newBalance !== undefined) {
          setAccountBalance(data.newBalance);
        }
        setOrderNotification({
          type: 'success',
          title: decision === 'overridden' ? 'Rule Override Position Logged' : 'Active Position Logged',
          message: data.message || `Order for ${calc.numLots} lots ${selectedSymbol} logged to Trade Journal as an Active Position. Behavioral diagnostic recorded.`,
        });
        setIsAnalysisModalOpen(false);
        handleReset();
        setTimeout(() => setOrderNotification(null), 7000);
      } else {
        setOrderNotification({
          type: 'error',
          title: 'Order Execution Failed',
          message: data.error || 'Could not place trade.'
        });
      }
    } catch (err: any) {
      console.error('Execution error:', err);
      setOrderNotification({
        type: 'error',
        title: 'Order Execution Error',
        message: err?.message || 'Network error executing order.'
      });
    } finally {
      setIsExecutingOrder(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 max-w-[1700px] mx-auto pb-6">
      {/* Clean Top Title Strip */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#2D3748] font-heading">Trading Terminal</h1>
          <p className="text-xs text-[#4A5568] font-body mt-0.5">Clear TradingView chart with disciplined lot & risk calculations</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono bg-[#E0E5EC] neu-raised-sm border border-[#A0AEC0]/20 px-4 py-2 rounded-[18px]">
          <span className="text-[#4A5568] font-heading font-semibold">Balance:</span>
          <strong className="text-[#2D3748] font-bold font-mono">${accountBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
        </div>
      </div>

      {/* Main Workspace: Chart (8 cols) & Order Panel (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[620px]">
        {/* Left: Clean TradingView Chart */}
        <div className="lg:col-span-8 flex flex-col min-h-[580px]">
          <TradingViewChart 
            symbol={selectedSymbol} 
            interval="15m" 
            onMaximizeToggle={() => setIsMaximized(true)}
            isMaximized={false}
          />
        </div>

        {/* Fullscreen Overlay */}
        {isMaximized && (
          <div className="fixed inset-0 z-50 p-4 md:p-6 bg-[#E0E5EC]/95 backdrop-blur-md flex flex-col gap-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-3">
                <span className="text-base font-bold font-heading text-[#2D3748]">Fullscreen Chart &bull; {selectedSymbol}</span>
                <span className="text-xs font-mono text-[#718096]">Press ESC or click close</span>
              </div>
              <button
                onClick={() => setIsMaximized(false)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#E0E5EC] neu-raised-sm rounded-[16px] text-xs font-heading font-bold text-[#4A5568] hover:text-[#2D3748] border border-[#A0AEC0]/20 cursor-pointer transition-all"
              >
                <Minimize2 className="w-3.5 h-3.5" />
                <span>Exit Fullscreen</span>
              </button>
            </div>
            <div className="flex-1 w-full h-full rounded-[24px] overflow-hidden neu-inset p-1">
              <TradingViewChart 
                symbol={selectedSymbol} 
                interval="15m" 
                onMaximizeToggle={() => setIsMaximized(false)}
                isMaximized={true}
              />
            </div>
          </div>
        )}

        {/* Right: Order Entry Panel */}
        <OrderPanel
          selectedSymbol={selectedSymbol}
          filteredSymbols={filteredSymbols}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          showSearchDropdown={showSearchDropdown}
          setShowSearchDropdown={setShowSearchDropdown}
          onSelectSymbol={handleSelectSymbol}
          direction={direction}
          onDirectionChange={handleDirectionChange}
          lots={lots}
          setLots={setLots}
          entryPrice={entryPrice}
          setEntryPrice={setEntryPrice}
          stopLoss={stopLoss}
          setStopLoss={setStopLoss}
          takeProfit={takeProfit}
          setTakeProfit={setTakeProfit}
          calc={calc}
          analysisResult={analysisResult}
          isAnalyzing={isAnalyzing}
          onCheckRules={handleCheckRules}
          onReset={handleReset}
          onOpenAnalysisModal={() => setIsAnalysisModalOpen(true)}
        />
      </div>

      {/* Pop-up Analysis Modal */}
      <OrderAnalysisModal
        isOpen={isAnalysisModalOpen}
        onClose={() => setIsAnalysisModalOpen(false)}
        analysisResult={analysisResult}
        selectedSymbol={selectedSymbol}
        numLots={calc.numLots}
        entryPrice={parseFloat(entryPrice) || 0}
        dollarRisk={calc.dollarRisk}
        riskPct={calc.riskPct}
        isExecuting={isExecutingOrder}
        onApplyProtocol={(safeLots, safeTp) => {
          if (safeLots !== undefined) setLots(String(safeLots));
          if (safeTp !== undefined) setTakeProfit(String(safeTp));
          setIsAnalysisModalOpen(false);
        }}
        onConfirmOrder={handlePlaceOrder}
      />

      {/* Real-Time Order Execution Toast Notification */}
      {orderNotification && (
        <div className={cn(
          "fixed bottom-6 right-6 z-50 p-4 max-w-md rounded-[24px] bg-[#E0E5EC] neu-raised border shadow-2xl flex items-start gap-3.5 animate-in slide-in-from-bottom-5 duration-300",
          orderNotification.type === 'success' ? "border-[#38B2AC]/40" : "border-[#FF6B6B]/40"
        )}>
          <div className={cn(
            "w-9 h-9 rounded-[14px] neu-inset-sm flex items-center justify-center shrink-0",
            orderNotification.type === 'success' ? "text-[#38B2AC]" : "text-[#FF6B6B]"
          )}>
            {orderNotification.type === 'success' ? <Check className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold font-heading text-[#2D3748]">{orderNotification.title}</h4>
              <button 
                onClick={() => setOrderNotification(null)}
                className="text-[#718096] hover:text-[#2D3748] p-1 text-xs cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-[#4A5568] mt-0.5 leading-relaxed">{orderNotification.message}</p>
            {orderNotification.type === 'success' && (
              <div className="mt-2.5 flex items-center gap-2">
                <Link 
                  href="/history"
                  className="inline-flex items-center gap-1 text-xs font-heading font-bold text-[#6C63FF] hover:underline"
                >
                  <span>View in Trade Journal</span>
                  <span>&rarr;</span>
                </Link>
                <span className="text-xs text-[#A0AEC0]">•</span>
                <Link 
                  href="/dashboard"
                  className="inline-flex items-center gap-1 text-xs font-heading font-bold text-[#4A5568] hover:text-[#2D3748]"
                >
                  <span>Dashboard</span>
                </Link>
                <span className="text-xs text-[#A0AEC0]">•</span>
                <Link 
                  href="/behavior"
                  className="inline-flex items-center gap-1 text-xs font-heading font-bold text-[#4A5568] hover:text-[#2D3748]"
                >
                  <span>Behavior</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

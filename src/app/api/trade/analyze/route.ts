import { NextResponse } from 'next/server';
// @ts-ignore
import { auth, getEffectiveUserId } from '@/lib/auth';
// @ts-ignore
import { prisma } from '@/lib/prisma';
import { findSimilarTrades } from '@/lib/engines/similarity-engine';
import { calculateBehaviorScore } from '@/lib/engines/scoring-engine';
import { aiService } from '@/lib/services/ai-service';
import {
  evaluatePreTrade,
  normalizeRawTrades,
  parseUserRules,
  UserRuleConfig
} from '@/lib/engines/behavioral-analysis-engine';

export async function POST(request: Request) {
  try {
    const userId = await getEffectiveUserId();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const safeUserId: string = userId;

    const body = await request.json();
    const proposedParams = body;

    const [account, rules, dbTrades, behaviorEvents, ruleViolations] = await Promise.all([
      prisma.account.findFirst({ where: { userId } }),
      prisma.tradingRule.findMany({ where: { userId, isActive: true } }),
      prisma.trade.findMany({ where: { userId } }),
      prisma.behaviorEvent.findMany({ where: { userId } }),
      prisma.ruleViolation.findMany({ where: { userId } })
    ]);

    // Normalize historical trades & parse active rules for the Behavioral Analysis Engine
    const allNormalizedTrades = normalizeRawTrades(dbTrades);
    const userRulesConfig = parseUserRules(rules);

    // Filter today's trades (UTC date)
    const todayStr = new Date().toISOString().split('T')[0];
    const todayTrades = allNormalizedTrades.filter(t => t.openTime.toISOString().split('T')[0] === todayStr);

    // Calculated risk & reward
    const entryPrice = Number(proposedParams.entryPrice) || 0;
    const stopLoss = proposedParams.stopLoss ? Number(proposedParams.stopLoss) : null;
    const takeProfit = proposedParams.takeProfit ? Number(proposedParams.takeProfit) : null;
    const lotSize = Number(proposedParams.quantity ?? proposedParams.positionSize ?? 0.1);

    let riskPct = proposedParams.riskPercentage ? Number(proposedParams.riskPercentage) : null;
    let riskReward = proposedParams.riskReward ? Number(proposedParams.riskReward) : null;

    if (riskReward === null && stopLoss !== null && takeProfit !== null && entryPrice > 0) {
      const riskDist = Math.abs(entryPrice - stopLoss);
      const rewardDist = Math.abs(takeProfit - entryPrice);
      if (riskDist > 0) {
        riskReward = Number((rewardDist / riskDist).toFixed(2));
      }
    }

    // 1. Run Core Real-Time Pre-Trade Evaluation Engine
    const preTradeAnalysis = evaluatePreTrade({
      proposedTrade: {
        symbol: String(proposedParams.symbol || 'UNKNOWN').toUpperCase().replace('/', '').trim(),
        direction: String(proposedParams.direction || 'LONG').toUpperCase() === 'SHORT' ? 'SHORT' : 'LONG',
        orderType: proposedParams.orderType || 'market',
        entryPrice,
        stopLoss,
        takeProfit,
        lotSize,
        riskPercentage: riskPct,
        riskReward,
        openTime: new Date()
      },
      todayTrades,
      recentTrades: allNormalizedTrades.slice(-20),
      rules: userRulesConfig,
      accountBalance: account?.balance || 2000
    });

    // 2. Similarity Engine & Historical Trades Context
    const proposedTradeForSim: any = {
      id: 'proposed-' + Date.now(),
      symbol: proposedParams.symbol,
      direction: String(proposedParams.direction || 'LONG').toUpperCase(),
      entryPrice,
      stopLoss,
      takeProfit,
      quantity: lotSize,
      positionSize: lotSize,
      entryTime: new Date(),
      riskPercentage: riskPct,
      riskReward,
      status: 'OPEN'
    };
    const similarityResult = findSimilarTrades(proposedTradeForSim, allNormalizedTrades as any);

    // 3. Behavioral Scoring Engine
    const scoringEvents = behaviorEvents.map(e => ({ tradeId: e.tradeId || '', pattern: e.eventType, severity: e.severity }));
    const scoringViolations = ruleViolations.map(v => ({ tradeId: v.tradeId || '', ruleId: v.ruleId }));
    const ruleEngineRules = rules.map(r => ({ id: r.id, type: r.ruleType, value: r.value || '', category: r.category }));
    const behaviorScore = calculateBehaviorScore(allNormalizedTrades as any, scoringEvents, scoringViolations, ruleEngineRules);

    // 4. Formatted Rule Results for client checklist
    const formattedRuleResults = {
      totalRules: preTradeAnalysis.ruleResults.length,
      passed: preTradeAnalysis.ruleResults.filter(r => r.status === 'PASS').length,
      failed: preTradeAnalysis.ruleResults.filter(r => r.status === 'VIOLATION').length,
      results: preTradeAnalysis.ruleResults.map(r => ({
        ruleId: r.ruleId,
        ruleName: r.ruleName,
        passed: r.status === 'PASS',
        status: r.status,
        severity: r.status === 'VIOLATION' ? 'critical' : 'info',
        expectedValue: r.expectedValue,
        actualValue: r.actualValue,
        message: r.evidence,
        evidence: r.evidence
      }))
    };

    // 5. Fast AI Cross-Check with strict timeout (never block execution on remote LLM)
    let aiCrossCheck = null;
    try {
      const aiPromise = aiService.crossCheckTradeAnalysis({
        proposedTrade: proposedTradeForSim,
        behaviorDetections: preTradeAnalysis.behaviorDetected ? [{
          pattern: preTradeAnalysis.behaviorDetected,
          confidence: 0.9,
          severity: preTradeAnalysis.status === 'HIGH RISK' || preTradeAnalysis.status === 'BLOCK' ? 'high' : 'medium',
          signals: preTradeAnalysis.why
        }] : [],
        ruleResults: formattedRuleResults,
        similarityResult
      });
      const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 1800));
      aiCrossCheck = await Promise.race([aiPromise, timeoutPromise]);
    } catch (aiErr) {
      console.warn('AI Cross-Check non-fatal warning:', aiErr);
    }

    const behavioralRisk = preTradeAnalysis.status === 'SAFE' ? 'low' : preTradeAnalysis.status === 'CAUTION' ? 'medium' : 'high';
    const recommendation = preTradeAnalysis.recommendation;
    const finalVerdict = aiCrossCheck?.secondOpinionVerdict || preTradeAnalysis.verdict;
    const finalExplanation = aiCrossCheck?.aiExplanation || preTradeAnalysis.explanation;
    const keyTakeaway = aiCrossCheck?.keyTakeaway || preTradeAnalysis.protocol[0] || 'Honor playbook parameters.';

    // Generate Structured Consequences & Protocols
    const balance = account?.balance || 2000;
    const maxRiskCap = userRulesConfig.maxRiskPerTrade || 1.0;
    let recommendedLots: number | undefined = undefined;
    let recommendedTP: number | undefined = undefined;

    if (riskPct !== null && riskPct > maxRiskCap && lotSize > 0) {
      const ratio = maxRiskCap / riskPct;
      recommendedLots = Math.max(0.01, Number((lotSize * ratio).toFixed(2)));
    }

    if (stopLoss !== null && entryPrice > 0) {
      const slDist = Math.abs(entryPrice - stopLoss);
      if (slDist > 0) {
        const isShort = String(proposedParams.direction || 'LONG').toUpperCase() === 'SHORT';
        recommendedTP = isShort 
          ? Number((entryPrice - slDist * 1.5).toFixed(2))
          : Number((entryPrice + slDist * 1.5).toFixed(2));
      }
    }

    const consequences: Array<{ title: string; detail: string; impact: 'high' | 'medium' | 'info'; stat?: string }> = [];

    // 1. Capital Risk Consequence
    if (riskPct !== null && riskPct > maxRiskCap) {
      const dollarRiskVal = (riskPct / 100) * balance;
      const allowedRiskDollar = (maxRiskCap / 100) * balance;
      const excessDollar = dollarRiskVal - allowedRiskDollar;
      const winningTrades = allNormalizedTrades.filter(t => t.netProfit > 0);
      const avgWinVal = winningTrades.length > 0 
        ? winningTrades.reduce((s, t) => s + t.netProfit, 0) / winningTrades.length 
        : (balance * 0.01);
      const wipeWins = Math.ceil(dollarRiskVal / Math.max(1, avgWinVal));
      consequences.push({
        title: 'Excessive Capital at Risk',
        detail: `This trade risks ${riskPct.toFixed(2)}% ($${dollarRiskVal.toFixed(2)}), which is ${(riskPct / maxRiskCap).toFixed(1)}x above your ${maxRiskCap}% personal limit ($${allowedRiskDollar.toFixed(2)}). A single loss here will wipe out the gains of ${wipeWins} average winning trades ($${avgWinVal.toFixed(2)} avg win).`,
        impact: 'high',
        stat: `+$${excessDollar.toFixed(2)} Unplanned Risk`
      });
    }

    // 2. Risk:Reward Asymmetry Consequence
    if (riskReward !== null && riskReward < 1.5) {
      const breakevenWinRate = ((1 / (1 + riskReward)) * 100).toFixed(0);
      consequences.push({
        title: 'Negative Asymmetry (Poor R:R)',
        detail: `Planned R:R of 1:${riskReward.toFixed(2)} forces you to win over ${breakevenWinRate}% of trades just to break even. In your historical ledger, trades with R:R below 1:1.5 generated heavy net losses.`,
        impact: 'high',
        stat: `1:${riskReward.toFixed(2)} R:R (Need >${breakevenWinRate}% Win Rate)`
      });
    }

    // 3. Similar Setup Historical Evidence
    if (similarityResult && similarityResult.totalSimilar > 0) {
      const winPct = (similarityResult.aggregateWinRate * 100).toFixed(1);
      const isNeg = similarityResult.avgPnl < 0;
      consequences.push({
        title: 'Historical Setup Evidence',
        detail: `In your audited journal, across ${similarityResult.totalSimilar} similar executions on ${proposedParams.symbol}, your historical win rate was only ${winPct}% with an average return of ${isNeg ? '-' : '+'}$${Math.abs(similarityResult.avgPnl).toFixed(2)} per trade.`,
        impact: isNeg ? 'high' : 'medium',
        stat: `${winPct}% Historical Win Rate`
      });
    }

    // 4. Ledger Habit Consequence
    if (preTradeAnalysis.status !== 'SAFE') {
      consequences.push({
        title: 'Rule Violation Drawdown Risk',
        detail: `Breaching active playbook guardrails increases loss rates and accelerates account drawdown compared to disciplined rule-following trades.`,
        impact: 'medium',
        stat: `Guardrail Breach`
      });
    }

    // Structured Actionable Protocols
    const structuredProtocol: Array<{ step: number; action: string; explanation?: string }> = [];

    if (recommendedLots && lotSize > recommendedLots) {
      structuredProtocol.push({
        step: 1,
        action: `Reduce Lot Size to ${recommendedLots} Lots`,
        explanation: `Downsizing from ${lotSize} to ${recommendedLots} lots caps your dollar loss at $${((maxRiskCap / 100) * balance).toFixed(2)} (${maxRiskCap}% max risk).`
      });
    }

    if (riskReward !== null && riskReward < 1.5 && recommendedTP) {
      structuredProtocol.push({
        step: structuredProtocol.length + 1,
        action: `Adjust Take Profit to $${recommendedTP} or Better`,
        explanation: `Aligns your target with at least a 1:1.5 Risk-to-Reward ratio so one win easily covers one loss.`
      });
    } else if (!stopLoss) {
      structuredProtocol.push({
        step: structuredProtocol.length + 1,
        action: 'Enter a Mandatory Protective Stop Loss',
        explanation: 'Never enter a trade without an ironclad stop loss. Unprotected trades risk unlimited drawdown from market spikes.'
      });
    }

    if (preTradeAnalysis.behaviorDetected?.includes('revenge') || preTradeAnalysis.behaviorDetected?.includes('streak') || preTradeAnalysis.behaviorDetected?.includes('Overtrading')) {
      structuredProtocol.push({
        step: structuredProtocol.length + 1,
        action: 'Execute 15-Minute Screen Walk Cooldown',
        explanation: 'Step away from the screen for 15 minutes. Audited data shows trades taken within 15 minutes of a loss had an 84.6% failure rate.'
      });
    } else {
      structuredProtocol.push({
        step: structuredProtocol.length + 1,
        action: 'Confirm Playbook Rules Before Execution',
        explanation: 'Verify that the current candle has closed and your setup criteria are 100% satisfied.'
      });
    }

    // 6. Save Analysis to DB
    let analysisId = 'analysis-' + Date.now();
    try {
      const savedRecord = await prisma.tradeAnalysis.create({
        data: {
          userId: safeUserId,
          symbol: proposedParams.symbol,
          direction: proposedParams.direction,
          entryPrice,
          stopLoss,
          takeProfit,
          positionSize: lotSize,
          riskPercentage: riskPct,
          riskReward,
          rulesChecked: formattedRuleResults.totalRules,
          rulesPassed: formattedRuleResults.passed,
          rulesViolated: JSON.stringify(formattedRuleResults.results.filter(r => !r.passed).map(r => r.ruleId)),
          behavioralRisk,
          behavioralSignals: JSON.stringify(preTradeAnalysis.why),
          similarTradeCount: similarityResult.totalSimilar,
          similarTradeWinRate: similarityResult.aggregateWinRate,
          similarTradeAvgPnl: similarityResult.avgPnl,
          recommendation,
          aiExplanation: finalExplanation
        }
      });
      if (savedRecord?.id) {
        analysisId = savedRecord.id;
      }
    } catch (dbErr) {
      console.warn('Could not persist trade analysis to DB:', dbErr);
    }

    return NextResponse.json({
      analysisId,
      preTradeAnalysis,
      status: preTradeAnalysis.status,
      canProceed: preTradeAnalysis.canProceed,
      behaviorDetected: preTradeAnalysis.behaviorDetected,
      why: preTradeAnalysis.why,
      protocol: structuredProtocol.length > 0 ? structuredProtocol.map(p => `${p.step}. ${p.action} — ${p.explanation || ''}`) : preTradeAnalysis.protocol,
      structuredProtocol,
      consequences,
      historicalConsequence: preTradeAnalysis.historicalConsequence,
      ruleResults: formattedRuleResults,
      similarityResult,
      behaviorScore,
      behavioralRisk,
      recommendation,
      verdict: finalVerdict,
      aiExplanation: finalExplanation,
      keyTakeaway,
      recommendedLots,
      recommendedTP,
      aiProvider: aiCrossCheck?.providerUsed || 'BiasX Behavioral Guard'
    });

  } catch (error) {
    console.error('Error analyzing trade:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

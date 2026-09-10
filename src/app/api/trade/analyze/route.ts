import { NextResponse } from 'next/server';
// @ts-ignore
import { auth } from '@/lib/auth';
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
    const session = await auth();
    let userId = session?.user?.id;
    if (!userId) {
      const demoUser = await prisma.user.findFirst();
      userId = demoUser?.id;
    }

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

    // 5. AI Cross-Check (Explaining engine findings, never inventing stats)
    let aiCrossCheck = null;
    try {
      aiCrossCheck = await aiService.crossCheckTradeAnalysis({
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
    } catch (aiErr) {
      console.warn('AI Cross-Check non-fatal warning:', aiErr);
    }

    const behavioralRisk = preTradeAnalysis.status === 'SAFE' ? 'low' : preTradeAnalysis.status === 'CAUTION' ? 'medium' : 'high';
    const recommendation = preTradeAnalysis.recommendation;
    const finalVerdict = aiCrossCheck?.secondOpinionVerdict || preTradeAnalysis.verdict;
    const finalExplanation = aiCrossCheck?.aiExplanation || preTradeAnalysis.explanation;
    const keyTakeaway = aiCrossCheck?.keyTakeaway || preTradeAnalysis.protocol[0] || 'Honor playbook parameters.';

    // 6. Save Analysis to DB
    let analysisId = 'analysis-' + Date.now();
    try {
      const tradeAnalysis = await prisma.tradeAnalysis.create({
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
      analysisId = tradeAnalysis.id;
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
      protocol: preTradeAnalysis.protocol,
      historicalConsequence: preTradeAnalysis.historicalConsequence,
      ruleResults: formattedRuleResults,
      similarityResult,
      behaviorScore,
      behavioralRisk,
      recommendation,
      verdict: finalVerdict,
      aiExplanation: finalExplanation,
      keyTakeaway,
      aiProvider: aiCrossCheck?.providerUsed || 'BiasX Behavioral Guard'
    });

  } catch (error) {
    console.error('Error analyzing trade:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

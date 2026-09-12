import { NextResponse } from 'next/server';
// @ts-ignore
import { auth, getEffectiveUserId } from '@/lib/auth';
// @ts-ignore
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    const userId = await getEffectiveUserId();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { analysisId, accountId, tradeParams, decision = 'proceeded' } = body;

    if (!tradeParams) {
      return NextResponse.json({ error: 'Missing tradeParams' }, { status: 400 });
    }

    // 1. Resolve Account
    let effectiveAccountId = accountId;
    let account = null;
    if (effectiveAccountId) {
      account = await prisma.account.findUnique({ where: { id: effectiveAccountId } });
    }
    if (!account) {
      account = await prisma.account.findFirst({ where: { userId } });
      effectiveAccountId = account?.id;
    }
    if (!account) {
      account = await prisma.account.create({
        data: {
          userId,
          name: 'MetaTrader 5 Primary Account',
          type: 'live',
          broker: 'MetaTrader 5',
          balance: 2000,
          equity: 2000,
          currency: 'USD',
          isActive: true
        }
      });
      effectiveAccountId = account.id;
    }

    // 2. Fetch and update the analysis record if provided
    let analysis: any = null;
    if (analysisId) {
      try {
        analysis = await prisma.tradeAnalysis.findUnique({ where: { id: analysisId } });
        if (analysis) {
          await prisma.tradeAnalysis.update({
            where: { id: analysisId },
            data: { userDecision: decision }
          });
        }
      } catch (e) {
        console.warn('Could not update trade analysis:', e);
      }
    }

    // If trade was cancelled in analysis
    if (decision === 'cancelled') {
      return NextResponse.json({ success: true, message: 'Trade cancelled based on pre-trade analysis' });
    }

    // 3. Trade Parameters Extraction & Normalization
    const symbol = String(tradeParams.symbol || 'XAUUSD').toUpperCase().replace('/', '').trim();
    const directionStr = String(tradeParams.direction || 'BUY').toUpperCase();
    const isBuy = directionStr === 'BUY' || directionStr === 'LONG';
    const entryPrice = Number(tradeParams.entryPrice) || 2000;
    const stopLoss = tradeParams.stopLoss ? Number(tradeParams.stopLoss) : null;
    const takeProfit = tradeParams.takeProfit ? Number(tradeParams.takeProfit) : null;
    const quantity = Math.max(0.001, Number(tradeParams.quantity || tradeParams.lots || 0.01));
    
    // Contract multiplier (Commodities/Indices vs Crypto vs FX)
    const contractMultiplier = Number(tradeParams.contractMultiplier) || (
      symbol.includes('XAU') ? 100 :
      symbol.includes('BTC') ? 1 :
      symbol.includes('ETH') ? 1 :
      symbol.includes('SOL') ? 1 :
      symbol.includes('SPX') || symbol.includes('US500') ? 50 : 100
    );

    const positionSize = Number(tradeParams.positionSize) || (entryPrice * quantity * contractMultiplier);
    const riskPercentage = tradeParams.riskPercentage ? Number(tradeParams.riskPercentage) : null;
    const riskReward = tradeParams.riskReward ? Number(tradeParams.riskReward) : 2.0;

    // Distances
    const slDist = stopLoss ? Math.abs(entryPrice - stopLoss) : entryPrice * 0.008;
    const tpDist = takeProfit ? Math.abs(takeProfit - entryPrice) : entryPrice * 0.016;

    const dollarRisk = tradeParams.dollarRisk ? Number(tradeParams.dollarRisk) : (slDist * quantity * contractMultiplier);
    const dollarProfit = tradeParams.dollarProfit ? Number(tradeParams.dollarProfit) : (tpDist * quantity * contractMultiplier);

    const isOverridden = decision === 'overridden';
    const fees = Number((0.06 * quantity * 2).toFixed(2));

    // Behavioral Analysis of the Trade Entry
    let notes = 'Clean Execution';
    if (isOverridden) {
      notes = analysis?.behaviorDetected 
        ? `${analysis.behaviorDetected} (Rule Override)`
        : 'Risk Rule Breach (Rule Override)';
    } else if (analysis?.behaviorDetected) {
      notes = analysis.behaviorDetected;
    } else if (!stopLoss) {
      notes = 'Missing Protective Stop-Loss';
    }

    // 4. Persist Trade in Database as an OPEN Position (no exit price, no fabricated P&L)
    const trade = await prisma.trade.create({
      data: {
        userId,
        accountId: effectiveAccountId,
        symbol,
        direction: isBuy ? 'long' : 'short',
        entryPrice,
        exitPrice: null,
        quantity,
        positionSize,
        stopLoss,
        takeProfit,
        entryTime: new Date(),
        exitTime: null,
        pnl: null,
        pnlPercentage: null,
        fees,
        duration: null,
        status: 'open',
        orderType: tradeParams.orderType || 'market',
        riskPercentage,
        riskReward,
        notes,
        isDemo: true
      }
    });

    // 5. Link analysis to trade
    if (analysisId && analysis) {
      await prisma.tradeAnalysis.update({
        where: { id: analysisId },
        data: { tradeId: trade.id }
      }).catch(() => {});
    }

    // 8. Record Rule Violations if overridden or breached
    if (analysis) {
      if (analysis.rulesViolated) {
        try {
          const violatedRuleIds = typeof analysis.rulesViolated === 'string'
            ? JSON.parse(analysis.rulesViolated)
            : analysis.rulesViolated;
          if (Array.isArray(violatedRuleIds) && violatedRuleIds.length > 0) {
            const violations = violatedRuleIds.map((ruleId: string) => ({
              userId,
              tradeId: trade.id,
              ruleId,
              violationType: isOverridden ? 'override' : 'pre_trade',
              acknowledged: true
            }));
            await prisma.ruleViolation.createMany({ data: violations }).catch(() => {});
          }
        } catch (e) {
          console.warn('Error saving rule violations:', e);
        }
      }

      // Record Behavior Events
      if (analysis.behavioralSignals) {
        try {
          const signals = typeof analysis.behavioralSignals === 'string'
            ? JSON.parse(analysis.behavioralSignals)
            : analysis.behavioralSignals;
          if (Array.isArray(signals) && signals.length > 0) {
            const events = signals.map((s: any) => ({
              userId,
              tradeId: trade.id,
              eventType: typeof s === 'string' ? s : (s.pattern || s.name || 'tilt'),
              confidence: typeof s === 'object' && s.confidence ? s.confidence : 0.85,
              severity: typeof s === 'object' && s.severity ? s.severity : (isOverridden ? 'critical' : 'moderate'),
              signals: typeof s === 'string' ? JSON.stringify([s]) : JSON.stringify(s.signals || [s]),
              evidence: typeof s === 'object' ? JSON.stringify(s.evidence || []) : JSON.stringify([s])
            }));
            await prisma.behaviorEvent.createMany({ data: events }).catch(() => {});
          }
        } catch (e) {
          console.warn('Error saving behavior events:', e);
        }
      }
    }

    return NextResponse.json({
      success: true,
      trade,
      status: 'open',
      behaviorDetected: notes,
      message: `Order for ${quantity} lots ${symbol} logged to Trade Journal as an Active Position. Behavioral diagnostic: ${notes}.`
    });

  } catch (error) {
    console.error('Error executing trade:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

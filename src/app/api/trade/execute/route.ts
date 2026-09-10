import { NextResponse } from 'next/server';
// @ts-ignore
import { auth } from '@/lib/auth';
// @ts-ignore
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id as string;

    const { analysisId, accountId, tradeParams, decision } = await request.json();

    if (!analysisId || !accountId || !tradeParams || !decision) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Update the analysis record with user's decision
    await prisma.tradeAnalysis.update({
      where: { id: analysisId },
      data: { userDecision: decision }
    });

    if (decision === 'proceeded' || decision === 'modified') {
      // Create the trade
      const trade = await prisma.trade.create({
        data: {
          userId,
          accountId,
          symbol: tradeParams.symbol,
          direction: tradeParams.direction.toLowerCase(),
          entryPrice: tradeParams.entryPrice,
          quantity: tradeParams.quantity,
          positionSize: tradeParams.positionSize,
          stopLoss: tradeParams.stopLoss || null,
          takeProfit: tradeParams.takeProfit || null,
          entryTime: new Date(),
          status: 'open',
          orderType: tradeParams.orderType || 'market',
          riskPercentage: tradeParams.riskPercentage,
          riskReward: tradeParams.riskReward
        }
      });

      // Fetch the analysis to get rule violations and behavior events
      const analysis = await prisma.tradeAnalysis.findUnique({ where: { id: analysisId } });
      
      if (analysis) {
        // Record Rule Violations
        if (analysis.rulesViolated) {
          const violatedRuleIds = JSON.parse(analysis.rulesViolated);
          if (violatedRuleIds.length > 0) {
            const violations = violatedRuleIds.map((ruleId: string) => ({
              userId,
              tradeId: trade.id,
              ruleId,
              violationType: 'pre_trade',
              acknowledged: true
            }));
            await prisma.ruleViolation.createMany({ data: violations });
          }
        }

        // Record Behavior Events
        if (analysis.behavioralSignals) {
          const signals = JSON.parse(analysis.behavioralSignals);
          if (signals.length > 0) {
            const events = signals.map((s: any) => ({
              userId,
              tradeId: trade.id,
              eventType: s.pattern,
              confidence: s.confidence,
              severity: s.severity,
              signals: JSON.stringify(s.signals),
              evidence: JSON.stringify(s.evidence)
            }));
            await prisma.behaviorEvent.createMany({ data: events });
          }
        }
      }

      return NextResponse.json({ success: true, trade, message: 'Trade executed successfully' });
    }

    return NextResponse.json({ success: true, message: 'Trade cancelled based on analysis' });

  } catch (error) {
    console.error('Error executing trade:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

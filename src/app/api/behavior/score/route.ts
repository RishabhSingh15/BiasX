import { NextResponse } from 'next/server';
// @ts-ignore
import { auth } from '@/lib/auth';
// @ts-ignore
import { prisma } from '@/lib/prisma';
import { calculateBehaviorScore } from '@/lib/engines/scoring-engine';

export async function GET(request: Request) {
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

    const [dbTrades, behaviorEvents, ruleViolations, rules] = await Promise.all([
      prisma.trade.findMany({ where: { userId } }),
      prisma.behaviorEvent.findMany({ where: { userId } }),
      prisma.ruleViolation.findMany({ where: { userId } }),
      prisma.tradingRule.findMany({ where: { userId, isActive: true } })
    ]);

    const allTrades = dbTrades.map((t: any) => ({
      ...t,
      direction: t.direction.toUpperCase(),
      status: t.status.toUpperCase(),
    }));

    const scoringEvents = behaviorEvents.map((e: any) => ({ tradeId: e.tradeId || '', pattern: e.eventType, severity: e.severity }));
    const scoringViolations = ruleViolations.map((v: any) => ({ tradeId: v.tradeId || '', ruleId: v.ruleId }));
    const ruleEngineRules = rules.map((r: any) => ({ id: r.id, type: r.ruleType, value: r.value || '', category: r.category }));

    const score = calculateBehaviorScore(allTrades, scoringEvents, scoringViolations, ruleEngineRules);

    return NextResponse.json(score);
  } catch (error) {
    console.error('Error calculating behavior score:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

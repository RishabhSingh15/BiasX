import { NextResponse } from 'next/server';
// @ts-ignore
import { auth } from '@/lib/auth';
// @ts-ignore
import { prisma } from '@/lib/prisma';

import { auditHistoricalTrades } from '@/lib/engines/audit-engine';

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

    const [trades, rules, account] = await Promise.all([
      prisma.trade.findMany({ where: { userId }, orderBy: { entryTime: 'asc' } }),
      prisma.tradingRule.findMany({ where: { userId, isActive: true } }),
      prisma.account.findFirst({ where: { userId } })
    ]);

    if (trades.length > 0) {
      const audit = auditHistoricalTrades(trades, rules, account?.balance || 2000);
      if (audit.patterns && audit.patterns.length > 0) {
        await prisma.behaviorPattern.deleteMany({ where: { userId } });
        await Promise.all(
          audit.patterns.map((p) =>
            prisma.behaviorPattern.create({
              data: {
                userId,
                patternType: p.category || 'tilt',
                description: p.name + ': ' + p.description,
                frequency: p.frequency || 1,
                avgImpact: p.cost ? -Math.abs(p.cost) : 0,
                confidence: p.confidence === 'high' ? 0.9 : 0.75,
                triggers: JSON.stringify(p.evidence || []),
                consequences: JSON.stringify(p.protocol || [p.consequence || '']),
                firstSeen: new Date(Date.now() - 30 * 86400 * 1000),
                lastSeen: new Date(),
                isActive: true,
              }
            }).catch(() => {})
          )
        );
      }
    }

    const patterns = await prisma.behaviorPattern.findMany({
      where: { userId, isActive: true },
      orderBy: { frequency: 'desc' }
    });

    return NextResponse.json(patterns);
  } catch (error) {
    console.error('Error fetching behavior patterns:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

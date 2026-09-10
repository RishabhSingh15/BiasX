import { NextResponse } from 'next/server';
// @ts-ignore
import { auth } from '@/lib/auth';
// @ts-ignore
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');
    const symbol = searchParams.get('symbol');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const sort = searchParams.get('sort') || 'entryTime';
    const order = searchParams.get('order') || 'desc';

    const skip = limit > 0 ? (page - 1) * limit : 0;

    const where: any = { userId };
    if (accountId) where.accountId = accountId;
    if (symbol) where.symbol = symbol;
    if (status) where.status = status;

    const [trades, total, rules, account] = await Promise.all([
      prisma.trade.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sort]: order },
        include: {
          ruleViolations: true,
          behaviorEvents: true,
        }
      }),
      prisma.trade.count({ where }),
      prisma.tradingRule.findMany({
        where: { userId, isActive: true },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.account.findFirst({ where: { userId } })
    ]);

    // Run audit to get rule violations for each trade
    const startingBalance = (account as any)?.startingBalance || 2000;
    const allUserTrades = await prisma.trade.findMany({
      where: { userId },
      orderBy: { entryTime: 'asc' }
    });
    const audit = auditHistoricalTrades(allUserTrades, rules, startingBalance);
    const violationsMap = audit.tradeViolationsMap || {};

    const enrichedTrades = trades.map(t => ({
      ...t,
      breaches: violationsMap[t.id] || []
    }));

    return NextResponse.json({
      data: enrichedTrades,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching trades:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
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

    await prisma.behaviorEvent.deleteMany({ where: { userId } });
    await prisma.ruleViolation.deleteMany({ where: { userId } });
    await prisma.tradeAnalysis.deleteMany({ where: { userId } });
    const deleted = await prisma.trade.deleteMany({ where: { userId } });

    await prisma.account.updateMany({
      where: { userId },
      data: {
        balance: 2000,
        equity: 2000,
      }
    });

    return NextResponse.json({ success: true, count: deleted.count });
  } catch (error) {
    console.error('Error clearing trades:', error);
    return NextResponse.json({ error: 'Failed to clear trades' }, { status: 500 });
  }
}

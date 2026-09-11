import { NextResponse } from 'next/server';
// @ts-ignore
import { auth, getEffectiveUserId, ensureUserHasAccount } from '@/lib/auth';
// @ts-ignore
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const userId = await getEffectiveUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let accounts = await prisma.account.findMany({
      where: { userId },
      include: {
        _count: {
          select: { trades: true }
        }
      }
    });

    if (accounts.length === 0) {
      const defaultAcc = await ensureUserHasAccount(userId);
      accounts = [{
        ...defaultAcc,
        _count: { trades: 0 }
      }] as any;
    }

    return NextResponse.json(accounts);
  } catch (error) {
    console.error('Error fetching accounts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getEffectiveUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, type, broker, balance, currency } = body;

    const account = await prisma.account.create({
      data: {
        userId,
        name: name || 'New Account',
        type: type || 'demo',
        broker: broker || 'demo',
        balance: balance || 10000,
        equity: balance || 10000,
        currency: currency || 'USD',
      }
    });

    return NextResponse.json(account);
  } catch (error) {
    console.error('Error creating account:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

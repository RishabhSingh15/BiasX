import { NextResponse } from 'next/server';
// @ts-ignore - Assuming auth setup
import { auth } from '@/lib/auth';
// @ts-ignore - Assuming prisma setup
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const accounts = await prisma.account.findMany({
      where: { userId: session.user.id },
      include: {
        _count: {
          select: { trades: true }
        }
      }
    });

    return NextResponse.json(accounts);
  } catch (error) {
    console.error('Error fetching accounts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, type, broker, balance, currency } = body;

    const account = await prisma.account.create({
      data: {
        userId: session.user.id,
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

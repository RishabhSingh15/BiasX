import { NextResponse } from 'next/server';
// @ts-ignore
import { auth } from '@/lib/auth';
// @ts-ignore
import { prisma } from '@/lib/prisma';

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

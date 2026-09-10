import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { seedDemoDataForUser } from '@/lib/services/seed-demo-data';

export async function POST() {
  try {
    let user = await prisma.user.findFirst();
    if (!user) {
      return NextResponse.json({ error: 'No user found' }, { status: 404 });
    }

    const result = await seedDemoDataForUser(user.id);
    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    console.error('Seed API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET() {
  return POST();
}

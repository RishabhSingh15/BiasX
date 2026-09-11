import { NextResponse } from 'next/server';
// @ts-ignore
import { auth, getEffectiveUserId } from '@/lib/auth';
// @ts-ignore
import { prisma } from '@/lib/prisma';
import { ensureUserHasDefaultRules } from '@/lib/services/default-rules';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getUserId() {
  return await getEffectiveUserId();
}

export async function GET(request: Request) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await ensureUserHasDefaultRules(userId);

    const rules = await prisma.tradingRule.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(rules);
  } catch (error) {
    console.error('Error fetching rules:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Support bulk creation
    if (Array.isArray(body) || (body && Array.isArray(body.rules))) {
      const list = Array.isArray(body) ? body : body.rules;
      const created = await Promise.all(
        list.map((r: any) =>
          prisma.tradingRule.create({
            data: {
              userId,
              category: r.category || 'risk',
              name: r.name,
              description: r.description || '',
              ruleType: r.ruleType || 'custom_boolean',
              value: typeof r.value === 'object' ? JSON.stringify(r.value) : String(r.value ?? ''),
              unit: r.unit || '',
              severity: r.severity || 'strict',
              isActive: r.isActive !== undefined ? r.isActive : true
            }
          })
        )
      );
      return NextResponse.json({ count: created.length, rules: created });
    }

    const { category, name, description, ruleType, value, unit, severity, isActive } = body;

    const rule = await prisma.tradingRule.create({
      data: {
        userId,
        category: category || 'risk',
        name,
        description: description || '',
        ruleType: ruleType || 'custom_boolean',
        value: typeof value === 'object' ? JSON.stringify(value) : String(value || ''),
        unit: unit || '',
        severity: severity || 'strict',
        isActive: isActive !== undefined ? isActive : true
      }
    });

    return NextResponse.json(rule);
  } catch (error) {
    console.error('Error creating rule:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, category, name, description, ruleType, value, unit, severity, isActive } = body;

    if (!id) return NextResponse.json({ error: 'Rule ID is required' }, { status: 400 });

    const existingRule = await prisma.tradingRule.findUnique({ where: { id } });
    if (!existingRule || existingRule.userId !== userId) {
      return NextResponse.json({ error: 'Not found or forbidden' }, { status: 404 });
    }

    const updatedRule = await prisma.tradingRule.update({
      where: { id },
      data: {
        category,
        name,
        description,
        ruleType,
        value: value !== undefined ? (typeof value === 'object' ? JSON.stringify(value) : String(value)) : undefined,
        unit,
        severity,
        isActive
      }
    });

    return NextResponse.json(updatedRule);
  } catch (error) {
    console.error('Error updating rule:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, category, name, description, ruleType, value, unit, severity, isActive } = body;

    if (!id && !ruleType) {
      return NextResponse.json({ error: 'Rule ID or ruleType is required' }, { status: 400 });
    }

    let existingRule = id ? await prisma.tradingRule.findUnique({ where: { id } }) : null;

    if (!existingRule && (ruleType || (id && id.startsWith('rule-')))) {
      const targetType = ruleType || id.replace('rule-', '');
      existingRule = await prisma.tradingRule.findFirst({
        where: { userId, ruleType: targetType }
      });
    }

    if (!existingRule) {
      // Upsert: Create rule if it didn't exist yet
      const newRule = await prisma.tradingRule.create({
        data: {
          userId,
          category: category || 'risk',
          name: name || (ruleType ? ruleType.replace(/_/g, ' ') : 'Rule'),
          description: description || '',
          ruleType: ruleType || (id && id.startsWith('rule-') ? id.replace('rule-', '') : 'custom_boolean'),
          value: value !== undefined ? (typeof value === 'object' ? JSON.stringify(value) : String(value)) : '1',
          unit: unit || '',
          severity: severity || 'strict',
          isActive: isActive !== undefined ? isActive : true
        }
      });
      return NextResponse.json(newRule);
    }

    const updatedRule = await prisma.tradingRule.update({
      where: { id: existingRule.id },
      data: {
        category: category !== undefined ? category : undefined,
        name: name !== undefined ? name : undefined,
        description: description !== undefined ? description : undefined,
        ruleType: ruleType !== undefined ? ruleType : undefined,
        value: value !== undefined ? (typeof value === 'object' ? JSON.stringify(value) : String(value)) : undefined,
        unit: unit !== undefined ? unit : undefined,
        severity: severity !== undefined ? severity : undefined,
        isActive: isActive !== undefined ? isActive : undefined
      }
    });

    return NextResponse.json(updatedRule);
  } catch (error) {
    console.error('Error patching rule:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const clearAll = searchParams.get('clearAll');
    const id = searchParams.get('id');

    if (clearAll === 'true') {
      const deleted = await prisma.tradingRule.deleteMany({ where: { userId } });
      return NextResponse.json({ success: true, count: deleted.count });
    }

    if (!id) return NextResponse.json({ error: 'Rule ID is required' }, { status: 400 });

    const existingRule = await prisma.tradingRule.findUnique({ where: { id } });
    if (!existingRule || existingRule.userId !== userId) {
      return NextResponse.json({ error: 'Not found or forbidden' }, { status: 404 });
    }

    await prisma.tradingRule.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting rule:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

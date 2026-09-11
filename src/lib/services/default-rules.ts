import { prisma } from '@/lib/prisma';
import { RULE_PRESETS } from '@/features/rules/constants/rule-presets';

export async function ensureUserHasDefaultRules(userId: string) {
  try {
    const count = await prisma.tradingRule.count({ where: { userId } });
    if (count > 0) return;

    const data = RULE_PRESETS.map((p) => ({
      userId,
      ruleType: p.type,
      category: p.category,
      name: p.name,
      description: p.desc || p.name,
      value: p.defaultValue,
      unit: p.unit || '',
      severity: p.severity || 'critical',
      isActive: true,
    }));

    await prisma.tradingRule.createMany({ data });
  } catch (error) {
    console.error('Error ensuring default rules:', error);
  }
}

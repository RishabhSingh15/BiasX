import { prisma } from '@/lib/prisma';
import { 
  generateDemoAccount, 
  generateDemoTrades, 
  generateDemoRules,
  generateDemoBehaviorEvents,
  generateDemoRuleViolations
} from '@/lib/services/demo-data-generator';
import { calculateBehaviorScore } from '@/lib/engines/scoring-engine';

export async function seedDemoDataForUser(userId: string) {
  console.log(`[Seed] Starting demo data sync for user ${userId}...`);

  // 1. Get or create demo account
  let account = await prisma.account.findFirst({
    where: { userId }
  });

  if (!account) {
    account = await prisma.account.create({
      data: {
        userId,
        ...generateDemoAccount(),
      }
    });
  } else {
    account = await prisma.account.update({
      where: { id: account.id },
      data: {
        balance: 10420,
        equity: 10420,
      }
    });
  }

  // 2. Clean up old user data to prevent duplicate or corrupted totals
  await prisma.$transaction([
    prisma.behaviorPattern.deleteMany({ where: { userId } }),
    prisma.behaviorEvent.deleteMany({ where: { userId } }),
    prisma.ruleViolation.deleteMany({ where: { userId } }),
    prisma.trade.deleteMany({ where: { userId } }),
    prisma.tradingRule.deleteMany({ where: { userId } }),
    prisma.behaviorScore.deleteMany({ where: { userId } }),
  ]);

  // 3. Create fresh demo trading rules
  const demoRules = generateDemoRules();
  const createdRules = [];
  for (const rule of demoRules) {
    const r = await prisma.tradingRule.create({
      data: {
        ...rule,
        userId,
      }
    });
    createdRules.push(r);
  }

  // 4. Generate the 342 calibrated trades
  const demoTrades = generateDemoTrades();
  console.log(`[Seed] Inserting ${demoTrades.length} calibrated trades...`);

  const createdTrades = [];
  for (const trade of demoTrades) {
    const { behaviorType, ...tradeData } = trade as any;
    const t = await prisma.trade.create({
      data: {
        ...tradeData,
        accountId: account.id,
        userId,
      }
    });
    createdTrades.push(t);
  }

  // 5. Generate and insert Behavior Events linked to these trades
  const demoEvents = generateDemoBehaviorEvents(createdTrades, userId);
  console.log(`[Seed] Inserting ${demoEvents.length} behavioral incident records...`);
  await prisma.behaviorEvent.createMany({
    data: demoEvents,
  });

  // 6. Generate and insert Rule Violations linked to trades and rules
  const demoViolations = generateDemoRuleViolations(createdTrades, createdRules, userId);
  console.log(`[Seed] Inserting ${demoViolations.length} rule violation records...`);
  await prisma.ruleViolation.createMany({
    data: demoViolations,
  });

  // 7. Calculate and save initial Behavior Score with all required fields
  const scoreData = calculateBehaviorScore(
    createdTrades.map(t => ({
      ...t,
      direction: t.direction.toUpperCase() as any,
      status: t.status.toUpperCase() as any,
    })),
    demoEvents.map(e => ({ tradeId: e.tradeId, pattern: e.eventType, severity: e.severity as any })),
    demoViolations.map(v => ({ tradeId: v.tradeId || '', ruleId: v.ruleId })),
    createdRules.map(r => ({ id: r.id, type: r.ruleType, value: r.value || '', category: r.category }))
  );

  const startDate = createdTrades[0]?.entryTime || new Date();
  const endDate = createdTrades[createdTrades.length - 1]?.entryTime || new Date();

  await prisma.behaviorScore.create({
    data: {
      userId,
      overallScore: scoreData.overall,
      ruleAdherence: scoreData.ruleAdherence,
      riskDiscipline: scoreData.riskDiscipline,
      fomoControl: scoreData.fomoControl,
      revengeControl: scoreData.revengeControl,
      overtradingControl: scoreData.overtradingControl,
      positionSizing: scoreData.positionSizing,
      consistency: scoreData.consistency,
      stopLossDiscipline: scoreData.stopLossDiscipline,
      period: 'all_time',
      periodStart: startDate,
      periodEnd: endDate,
      tradeCount: createdTrades.length,
    }
  });

  // 8. Create Behavior Patterns for patterns page
  const patternsData = [
    {
      userId,
      patternType: 'fomo_after_move',
      description: 'Buying or selling after rapid price extension without waiting for pullback.',
      frequency: 28,
      avgImpact: -30.18,
      confidence: 0.88,
      triggers: JSON.stringify(['Price move > 1.5% in 15m', 'Volume spike without retest']),
      consequences: JSON.stringify({ winRate: '25.0%', totalLoss: '-$845.00' }),
      isActive: true,
      firstSeen: startDate,
      lastSeen: endDate,
    },
    {
      userId,
      patternType: 'revenge_after_loss',
      description: 'Rapid re-entry within 15 minutes of stop-out with escalated position sizing.',
      frequency: 19,
      avgImpact: -64.76,
      confidence: 0.94,
      triggers: JSON.stringify(['Recent stop-out', 'Time elapsed < 15 min', 'Lot size increase 50%']),
      consequences: JSON.stringify({ winRate: '21.0%', totalLoss: '-$1,230.50' }),
      isActive: true,
      firstSeen: startDate,
      lastSeen: endDate,
    },
    {
      userId,
      patternType: 'risk_increase_after_losses',
      description: 'Increasing risk exposure above 1.5% cap following consecutive losses.',
      frequency: 15,
      avgImpact: -94.67,
      confidence: 0.90,
      triggers: JSON.stringify(['2+ consecutive losses', 'Risk > 1.5%']),
      consequences: JSON.stringify({ winRate: '33.3%', totalLoss: '-$1,420.00' }),
      isActive: true,
      firstSeen: startDate,
      lastSeen: endDate,
    },
    {
      userId,
      patternType: 'stop_loss_violation',
      description: 'Widening or moving stop-loss deeper into negative territory during drawdown.',
      frequency: 22,
      avgImpact: -120.45,
      confidence: 0.96,
      triggers: JSON.stringify(['Adverse price excursion', 'Stop-loss price adjusted further away']),
      consequences: JSON.stringify({ winRate: '0.0%', totalLoss: '-$2,650.00' }),
      isActive: true,
      firstSeen: startDate,
      lastSeen: endDate,
    }
  ];

  for (const p of patternsData) {
    await prisma.behaviorPattern.create({ data: p });
  }

  // 9. Update broker connection stats
  await prisma.brokerConnection.upsert({
    where: { accountId: account.id },
    create: {
      userId,
      accountId: account.id,
      broker: 'demo',
      status: 'connected',
      lastSyncAt: new Date(),
      syncStatus: 'synced',
      totalTrades: createdTrades.length,
    },
    update: {
      lastSyncAt: new Date(),
      syncStatus: 'synced',
      totalTrades: createdTrades.length,
    }
  });

  console.log(`[Seed] Successfully seeded 342 trades, ${demoEvents.length} events, ${demoViolations.length} violations, score ${scoreData.overall}/100!`);
  return {
    tradesCount: createdTrades.length,
    eventsCount: demoEvents.length,
    violationsCount: demoViolations.length,
    patternsCount: patternsData.length,
    overallScore: scoreData.overall,
    balance: account.balance,
  };
}

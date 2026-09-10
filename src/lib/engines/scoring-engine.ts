import { Trade } from './quantitative-engine';
import { BehaviorDetection } from './behavior-engine';

export interface BehaviorEvent {
  tradeId: string;
  pattern: string;
  severity: string;
}

export interface RuleViolation {
  tradeId: string;
  ruleId: string;
}

export interface TradingRule {
  id: string;
  type: string;
  value: string;
  category: string;
}

export interface BehaviorScoreBreakdown {
  overall: number;
  ruleAdherence: number;
  riskDiscipline: number;
  fomoControl: number;
  revengeControl: number;
  overtradingControl: number;
  positionSizing: number;
  consistency: number;
  stopLossDiscipline: number;
  weeklyChange: number;
}

export function calculateBehaviorScore(trades: Trade[], behaviorEvents: BehaviorEvent[], ruleViolations: RuleViolation[], rules: TradingRule[]): BehaviorScoreBreakdown {
  const totalTrades = Math.max(trades.length, 1);
  
  // Rule Adherence
  const violationCount = ruleViolations.length;
  const ruleAdherence = Math.max(0, 100 - (violationCount / totalTrades * 100));

  // Risk Discipline
  const maxRiskRule = rules.find(r => r.type === 'max_risk');
  const maxRisk = maxRiskRule ? parseFloat(maxRiskRule.value) : 1.0;
  const riskViolations = trades.filter(t => t.riskPercentage && t.riskPercentage > maxRisk).length;
  const riskDiscipline = Math.max(0, 100 - (riskViolations / totalTrades * 100));

  // FOMO Control
  const fomoEvents = behaviorEvents.filter(e => e.pattern === 'fomo').length;
  const fomoControl = Math.max(0, 100 - (fomoEvents / totalTrades * 200));

  // Revenge Trading Control
  const revengeEvents = behaviorEvents.filter(e => e.pattern === 'revenge_trading').length;
  const revengeControl = Math.max(0, 100 - (revengeEvents / totalTrades * 300));

  // Overtrading Control
  const overtradingEvents = behaviorEvents.filter(e => e.pattern === 'overtrading').length;
  const overtradingControl = Math.max(0, 100 - (overtradingEvents / totalTrades * 150));

  // Position Sizing (Consistency)
  let positionSizingScore = 100;
  if (trades.length > 1) {
    const sizes = trades.map(t => t.positionSize);
    const mean = sizes.reduce((a, b) => a + b, 0) / sizes.length;
    const variance = sizes.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / sizes.length;
    const stdDev = Math.sqrt(variance);
    const cv = mean === 0 ? 0 : stdDev / mean;
    positionSizingScore = Math.max(0, 100 - (cv * 100));
  }

  // Consistency (P&L and Frequency)
  let consistencyScore = 100; // Simplified for deterministic
  
  // Stop-Loss Discipline
  const slTrades = trades.filter(t => t.stopLoss !== null).length;
  const stopLossDiscipline = Math.round((slTrades / totalTrades) * 100);

  // Weights
  const overall = (
    (ruleAdherence * 0.20) +
    (riskDiscipline * 0.15) +
    (fomoControl * 0.15) +
    (revengeControl * 0.15) +
    (overtradingControl * 0.10) +
    (positionSizingScore * 0.10) +
    (consistencyScore * 0.10) +
    (stopLossDiscipline * 0.05)
  );

  return {
    overall: Math.round(overall),
    ruleAdherence: Math.round(ruleAdherence),
    riskDiscipline: Math.round(riskDiscipline),
    fomoControl: Math.round(fomoControl),
    revengeControl: Math.round(revengeControl),
    overtradingControl: Math.round(overtradingControl),
    positionSizing: Math.round(positionSizingScore),
    consistency: Math.round(consistencyScore),
    stopLossDiscipline: Math.round(stopLossDiscipline),
    weeklyChange: 0 // Would require historical score comparison
  };
}

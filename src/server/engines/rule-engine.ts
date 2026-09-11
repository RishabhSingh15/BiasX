import { Trade } from './quantitative-engine';
import { TradingRule } from './scoring-engine';
import { BehaviorDetection } from './behavior-engine';

export interface RuleCheckResult {
  ruleId: string;
  ruleName: string;
  category: string;
  passed: boolean;
  severity: string;
  actualValue: string;
  ruleValue: string;
  message: string;
}

export interface RuleComplianceResult {
  totalRules: number;
  passed: number;
  failed: number;
  results: RuleCheckResult[];
  overallCompliance: number; // 0-1
}

export function evaluateRules(proposedTrade: Trade, rules: TradingRule[], allTrades: Trade[], behaviorDetections: BehaviorDetection[] = []): RuleComplianceResult {
  const results: RuleCheckResult[] = [];
  let passedCount = 0;

  for (const rule of rules) {
    let passed = true;
    let actualValue = '';
    let message = '';
    
    switch (rule.type) {
      case 'max_risk': {
        const maxRisk = parseFloat(rule.value);
        const actualRisk = proposedTrade.riskPercentage || 0;
        actualValue = `${actualRisk}%`;
        passed = actualRisk <= maxRisk;
        message = passed ? 'Risk within limits' : `Risk exceeds maximum allowed (${maxRisk}%)`;
        break;
      }
      case 'max_trades_per_day': {
        const maxTrades = parseInt(rule.value, 10);
        const todayStr = proposedTrade.entryTime.toISOString().split('T')[0];
        const todayCount = allTrades.filter(t => t.entryTime.toISOString().split('T')[0] === todayStr).length;
        actualValue = `${todayCount + 1}`;
        passed = (todayCount + 1) <= maxTrades;
        message = passed ? 'Daily trade limit respected' : `Exceeds maximum trades per day (${maxTrades})`;
        break;
      }
      case 'allowed_trading_hours': {
        try {
          const hours = JSON.parse(rule.value); // { start: 9, end: 16 }
          const hour = proposedTrade.entryTime.getHours();
          actualValue = `${hour}:00`;
          passed = hour >= hours.start && hour < hours.end;
          message = passed ? 'Within trading hours' : `Outside allowed trading hours (${hours.start}:00 - ${hours.end}:00)`;
        } catch(e) {
          passed = false;
          message = 'Invalid rule configuration';
        }
        break;
      }
      case 'min_risk_reward': {
        const minRR = parseFloat(rule.value);
        const actualRR = proposedTrade.riskReward || 0;
        actualValue = `${actualRR}`;
        passed = actualRR >= minRR;
        message = passed ? 'Meets minimum R:R' : `Risk:Reward below minimum (${minRR})`;
        break;
      }
      case 'max_position_size': {
        const maxSize = parseFloat(rule.value);
        actualValue = `${proposedTrade.positionSize}`;
        passed = proposedTrade.positionSize <= maxSize;
        message = passed ? 'Position size acceptable' : `Position size exceeds maximum (${maxSize})`;
        break;
      }
      case 'stop_loss_required': {
        actualValue = proposedTrade.stopLoss ? 'Set' : 'Not set';
        passed = proposedTrade.stopLoss !== null;
        message = passed ? 'Stop loss provided' : 'Stop loss is required';
        break;
      }
      case 'no_revenge_trading': {
        const hasRevenge = behaviorDetections.some(d => d.pattern === 'revenge_trading' && d.detected);
        actualValue = hasRevenge ? 'Detected' : 'Clear';
        passed = !hasRevenge;
        message = passed ? 'No revenge trading detected' : 'Revenge trading pattern detected';
        break;
      }
      case 'no_fomo': {
        const hasFomo = behaviorDetections.some(d => d.pattern === 'fomo' && d.detected);
        actualValue = hasFomo ? 'Detected' : 'Clear';
        passed = !hasFomo;
        message = passed ? 'No FOMO detected' : 'FOMO pattern detected';
        break;
      }
      default:
        passed = true;
        actualValue = 'N/A';
        message = `Unrecognized rule type: ${rule.type}`;
    }

    if (passed) passedCount++;

    results.push({
      ruleId: rule.id,
      ruleName: rule.category + ' - ' + rule.type, // simplified
      category: rule.category,
      passed,
      severity: passed ? 'low' : 'high',
      actualValue,
      ruleValue: rule.value,
      message
    });
  }

  return {
    totalRules: rules.length,
    passed: passedCount,
    failed: rules.length - passedCount,
    results,
    overallCompliance: rules.length > 0 ? passedCount / rules.length : 1
  };
}

export type RuleCategory = 'risk' | 'entry' | 'behavior' | 'timing';

export interface RulePreset {
  type: string;
  name: string;
  category: RuleCategory;
  defaultValue: string;
  unit: string;
  inputType: 'stepper' | 'number' | 'ratio' | 'sessions' | 'symbols' | 'boolean';
  min?: number;
  max?: number;
  step?: number;
  chips?: string[];
  severity: 'critical' | 'strict' | 'advisory';
  desc: string;
}

export interface Rule {
  id: string;
  ruleType: string;
  name: string;
  description?: string;
  category: string;
  condition: string;
  value: string;
  unit: string;
  action: string;
  severity: string;
  isActive: boolean;
  isCustom: boolean;
  createdAt: string;
}

export interface CategoryInfo {
  id: 'timing' | 'risk' | 'behavior' | 'entry';
  title: string;
  subtitle: string;
  icon: any;
  accent: string;
}

import { RulesView } from '@/features/rules';

export const metadata = {
  title: 'Trading Rules & Guardrails | BiasX',
  description: 'Manage and enforce automated trading guardrails, frequency limits, and behavioral risk thresholds',
};

export default function RulesPage() {
  return <RulesView />;
}

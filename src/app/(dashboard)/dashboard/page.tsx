import { DashboardView } from '@/features/dashboard';

export const metadata = {
  title: 'Trading Dashboard & Performance | BiasX',
  description: 'BehaviorGuard trading dashboard, equity curve, risk limits, and P&L calendar heatmap',
};

export default function DashboardPage() {
  return <DashboardView />;
}

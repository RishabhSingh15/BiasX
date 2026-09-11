import { TerminalView } from '@/features/terminal';

export const metadata = {
  title: 'Trading Terminal | BiasX',
  description: 'Clean TradingView chart with disciplined lot and risk calculations',
};

export default function TerminalPage() {
  return <TerminalView />;
}

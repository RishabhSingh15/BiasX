import { JournalView } from '@/features/journal';

export const metadata = {
  title: 'Trade Journal & Execution Log | BiasX',
  description: 'Audited trade ledger with playbook compliance diagnostics and 6-column execution breakdown',
};

export default function HistoryPage() {
  return <JournalView />;
}

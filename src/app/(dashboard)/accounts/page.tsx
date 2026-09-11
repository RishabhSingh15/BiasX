import { AccountsView } from '@/features/accounts';

export const metadata = {
  title: 'Connected Accounts & Broker Sync | BiasX',
  description: 'Manage trading accounts, import MT5/CSV statements, and audit historical executions',
};

export default function AccountsPage() {
  return <AccountsView />;
}

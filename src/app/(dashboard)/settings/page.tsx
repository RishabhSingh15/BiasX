import { SettingsView } from '@/features/settings';

export const metadata = {
  title: 'Settings & System Configuration | BiasX',
  description: 'Configure AI models, API keys, terminal preferences, and profile settings',
};

export default function SettingsPage() {
  return <SettingsView />;
}

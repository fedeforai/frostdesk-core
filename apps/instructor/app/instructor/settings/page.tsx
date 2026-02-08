import SubscriptionStatusPanel from '@/components/SubscriptionStatusPanel';

export default function SettingsPage() {
  return (
    <main style={{ padding: '1.5rem', maxWidth: '720px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem', color: '#111827' }}>
        Settings
      </h1>
      <SubscriptionStatusPanel />
    </main>
  );
}

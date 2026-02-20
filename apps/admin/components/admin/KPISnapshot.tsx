'use client';

import type { AdminKPISnapshot } from '@/lib/adminApi';

interface KPISnapshotProps {
  snapshot: AdminKPISnapshot;
}

export default function KPISnapshot({ snapshot }: KPISnapshotProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
      <div style={{
        padding: '1rem',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '0.375rem',
        backgroundColor: '#ffffff',
      }}>
        <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Conversations Today
        </div>
        <div style={{ fontSize: '1.5rem', fontWeight: '600', color: 'rgba(226, 232, 240, 0.95)' }}>
          {snapshot.conversations_today.toLocaleString()}
        </div>
      </div>

      <div style={{
        padding: '1rem',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '0.375rem',
        backgroundColor: '#ffffff',
      }}>
        <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          AI Drafts Pending
        </div>
        <div style={{ fontSize: '1.5rem', fontWeight: '600', color: 'rgba(226, 232, 240, 0.95)' }}>
          {snapshot.ai_drafts_pending.toLocaleString()}
        </div>
      </div>

      <div style={{
        padding: '1rem',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '0.375rem',
        backgroundColor: '#ffffff',
      }}>
        <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Human Overrides Today
        </div>
        <div style={{ fontSize: '1.5rem', fontWeight: '600', color: 'rgba(226, 232, 240, 0.95)' }}>
          {snapshot.human_overrides_today.toLocaleString()}
        </div>
      </div>

      <div style={{
        padding: '1rem',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '0.375rem',
        backgroundColor: '#ffffff',
      }}>
        <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Bookings Created Today
        </div>
        <div style={{ fontSize: '1.5rem', fontWeight: '600', color: 'rgba(226, 232, 240, 0.95)' }}>
          {snapshot.bookings_created_today.toLocaleString()}
        </div>
      </div>
    </div>
  );
}

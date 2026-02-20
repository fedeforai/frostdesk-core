'use client';

import type { AdminDashboardMetrics } from '@/lib/adminApi';

interface DashboardPanelProps {
  metrics: AdminDashboardMetrics;
}

export default function DashboardPanel({ metrics }: DashboardPanelProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
      <div style={{
        padding: '1.5rem',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '0.5rem',
        backgroundColor: '#ffffff',
      }}>
        <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
          Total Conversations
        </div>
        <div style={{ fontSize: '2rem', fontWeight: '600', color: 'rgba(226, 232, 240, 0.95)' }}>
          {metrics.total_conversations.toLocaleString()}
        </div>
      </div>

      <div style={{
        padding: '1.5rem',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '0.5rem',
        backgroundColor: '#ffffff',
      }}>
        <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
          Pending AI Drafts
        </div>
        <div style={{ fontSize: '2rem', fontWeight: '600', color: 'rgba(226, 232, 240, 0.95)' }}>
          {metrics.pending_ai_drafts.toLocaleString()}
        </div>
      </div>

      <div style={{
        padding: '1.5rem',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '0.5rem',
        backgroundColor: '#ffffff',
      }}>
        <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
          Active Bookings
        </div>
        <div style={{ fontSize: '2rem', fontWeight: '600', color: 'rgba(226, 232, 240, 0.95)' }}>
          {metrics.active_bookings.toLocaleString()}
        </div>
      </div>

      <div style={{
        padding: '1.5rem',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '0.5rem',
        backgroundColor: '#ffffff',
      }}>
        <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
          Overrides Today
        </div>
        <div style={{ fontSize: '2rem', fontWeight: '600', color: 'rgba(226, 232, 240, 0.95)' }}>
          {metrics.overrides_today.toLocaleString()}
        </div>
      </div>
    </div>
  );
}

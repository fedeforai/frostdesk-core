'use client';

import type { SystemDegradationSignals } from '@/lib/adminApi';

interface SystemDegradationPanelProps {
  snapshot: SystemDegradationSignals;
}

export default function SystemDegradationPanel({ snapshot }: SystemDegradationPanelProps) {
  return (
    <div style={{ 
      border: '1px solid #e5e7eb', 
      borderRadius: '0.5rem', 
      padding: '1.5rem',
      backgroundColor: '#ffffff',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '1.5rem',
        borderBottom: '1px solid #e5e7eb',
        paddingBottom: '0.75rem',
      }}>
        <h2 style={{ 
          fontSize: '1.5rem', 
          fontWeight: '600',
          color: '#111827',
        }}>
          System Degradation Signals
        </h2>
      </div>

      {/* Section 1: Webhook Stability */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ 
          fontSize: '1rem', 
          fontWeight: '600',
          color: '#111827',
          marginBottom: '0.75rem',
        }}>
          Webhook Stability (last 24h)
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0.75rem',
            backgroundColor: '#f9fafb',
            borderRadius: '0.375rem',
            border: '1px solid #e5e7eb',
          }}>
            <span style={{ color: '#111827', fontSize: '0.875rem', fontWeight: '500' }}>
              Inbound Messages
            </span>
            <span style={{ color: '#111827', fontSize: '1rem', fontFamily: 'monospace', fontWeight: '600' }}>
              {snapshot.webhook.inbound_received_24h}
            </span>
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0.75rem',
            backgroundColor: '#f9fafb',
            borderRadius: '0.375rem',
            border: '1px solid #e5e7eb',
          }}>
            <span style={{ color: '#111827', fontSize: '0.875rem', fontWeight: '500' }}>
              Webhook Errors
            </span>
            <span style={{ color: '#111827', fontSize: '1rem', fontFamily: 'monospace', fontWeight: '600' }}>
              {snapshot.webhook.inbound_errors_24h}
            </span>
          </div>
        </div>
      </div>

      {/* Section 2: AI Draft Stability */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ 
          fontSize: '1rem', 
          fontWeight: '600',
          color: '#111827',
          marginBottom: '0.75rem',
        }}>
          AI Draft Stability
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0.75rem',
            backgroundColor: '#f9fafb',
            borderRadius: '0.375rem',
            border: '1px solid #e5e7eb',
          }}>
            <span style={{ color: '#111827', fontSize: '0.875rem', fontWeight: '500' }}>
              Drafts Generated
            </span>
            <span style={{ color: '#111827', fontSize: '1rem', fontFamily: 'monospace', fontWeight: '600' }}>
              {snapshot.ai_drafts.drafts_generated_24h}
            </span>
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0.75rem',
            backgroundColor: '#f9fafb',
            borderRadius: '0.375rem',
            border: '1px solid #e5e7eb',
          }}>
            <span style={{ color: '#111827', fontSize: '0.875rem', fontWeight: '500' }}>
              Draft Errors
            </span>
            <span style={{ color: '#111827', fontSize: '1rem', fontFamily: 'monospace', fontWeight: '600' }}>
              {snapshot.ai_drafts.draft_errors_24h}
            </span>
          </div>
        </div>
      </div>

      {/* Section 3: Escalation Pressure */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ 
          fontSize: '1rem', 
          fontWeight: '600',
          color: '#111827',
          marginBottom: '0.75rem',
        }}>
          Escalation Pressure
        </h3>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0.75rem',
          backgroundColor: '#f9fafb',
          borderRadius: '0.375rem',
          border: '1px solid #e5e7eb',
        }}>
          <span style={{ color: '#111827', fontSize: '0.875rem', fontWeight: '500' }}>
            Escalations Triggered
          </span>
          <span style={{ color: '#111827', fontSize: '1rem', fontFamily: 'monospace', fontWeight: '600' }}>
            {snapshot.escalation.escalations_24h}
          </span>
        </div>
      </div>

      {/* Section 4: Quota Stress */}
      <div>
        <h3 style={{ 
          fontSize: '1rem', 
          fontWeight: '600',
          color: '#111827',
          marginBottom: '0.75rem',
        }}>
          Quota Stress
        </h3>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0.75rem',
          backgroundColor: '#f9fafb',
          borderRadius: '0.375rem',
          border: '1px solid #e5e7eb',
        }}>
          <span style={{ color: '#111827', fontSize: '0.875rem', fontWeight: '500' }}>
            Quota Exceeded Events
          </span>
          <span style={{ color: '#111827', fontSize: '1rem', fontFamily: 'monospace', fontWeight: '600' }}>
            {snapshot.quota.quota_exceeded_24h}
          </span>
        </div>
      </div>
    </div>
  );
}

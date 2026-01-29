'use client';

import type { ConversationObservability } from '../../../packages/shared/src/types/conversationObservability.js';

interface HumanObservabilityPanelProps {
  data: ConversationObservability;
}

export function HumanObservabilityPanel({ data }: HumanObservabilityPanelProps) {
  return (
    <div style={{
      border: '1px solid #e5e7eb',
      borderRadius: '0.5rem',
      padding: '1.5rem',
      backgroundColor: '#ffffff',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
    }}>
      <h3 style={{
        marginBottom: '1rem',
        fontSize: '1.25rem',
        fontWeight: '600',
        color: '#111827',
        borderBottom: '1px solid #e5e7eb',
        paddingBottom: '0.75rem',
      }}>
        System Observability
      </h3>

      <div style={{ marginBottom: '0.5rem' }}>
        <strong>Automation:</strong> {data.automation_enabled ? 'ON' : 'OFF'}
      </div>

      <hr style={{ margin: '1rem 0', border: 'none', borderTop: '1px solid #e5e7eb' }} />

      <div style={{ marginBottom: '0.5rem' }}>
        <strong>Last Intent:</strong> {data.last_intent ?? '—'}
      </div>
      <div style={{ marginBottom: '0.5rem' }}>
        <strong>Confidence:</strong> {data.confidence ?? '—'}
      </div>

      <hr style={{ margin: '1rem 0', border: 'none', borderTop: '1px solid #e5e7eb' }} />

      <div style={{ marginBottom: '0.5rem' }}>
        <strong>Escalated:</strong> {data.handoff_to_human ? 'YES' : 'NO'}
      </div>
      <div style={{ marginBottom: '0.5rem' }}>
        <strong>Reason:</strong> {data.escalation_reason ?? '—'}
      </div>
      <div style={{ marginBottom: '0.5rem' }}>
        <strong>Escalated At:</strong> {data.escalated_at ?? '—'}
      </div>

      <hr style={{ margin: '1rem 0', border: 'none', borderTop: '1px solid #e5e7eb' }} />

      <div style={{ marginBottom: '0.5rem' }}>
        <strong>Turn Count:</strong> {data.turn_count}
      </div>
      <div style={{ marginBottom: '0.5rem' }}>
        <strong>Last Inbound:</strong> {data.last_inbound_at ?? '—'}
      </div>
      <div style={{ marginBottom: '0.5rem' }}>
        <strong>Last Outbound:</strong> {data.last_outbound_at ?? '—'}
      </div>
    </div>
  );
}

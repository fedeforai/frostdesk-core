import type { AIDecision } from '@/lib/adminApi';

interface AIDecisionPanelProps {
  eligible: boolean;
  blockers: Array<
    | 'low_confidence'
    | 'explicit_request'
    | 'negative_sentiment'
    | 'booking_risk'
    | 'policy_block'
    | 'ai_disabled'
  >;
}

const BLOCKER_LABELS: Record<
  | 'low_confidence'
  | 'explicit_request'
  | 'negative_sentiment'
  | 'booking_risk'
  | 'policy_block'
  | 'ai_disabled',
  string
> = {
  low_confidence: 'Low confidence classification',
  explicit_request: 'User explicitly requested a human',
  negative_sentiment: 'Negative sentiment detected',
  booking_risk: 'Booking state risk',
  policy_block: 'Policy or channel restriction',
  ai_disabled: 'AI disabled for this channel',
};

export default function AIDecisionPanel({ eligible, blockers }: AIDecisionPanelProps) {
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
        marginBottom: '1rem',
        borderBottom: '1px solid #e5e7eb',
        paddingBottom: '0.75rem',
      }}>
        <h2 style={{ 
          fontSize: '1.25rem', 
          fontWeight: '600',
          color: '#111827',
        }}>
          AI Reply Decision
        </h2>
        <span style={{
          display: 'inline-block',
          padding: '0.375rem 0.75rem',
          borderRadius: '0.375rem',
          backgroundColor: eligible ? '#d1fae5' : '#fee2e2',
          color: eligible ? '#065f46' : '#991b1b',
          fontSize: '0.875rem',
          fontWeight: '500',
          border: `1px solid ${eligible ? '#a7f3d0' : '#fecaca'}`,
        }}>
          {eligible ? '✅ AI Eligible' : '❌ AI Blocked'}
        </span>
      </div>

      <div>
        {blockers.length === 0 ? (
          <p style={{ color: '#6b7280', padding: '1rem' }}>
            No blocking conditions detected.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {blockers.map((blocker, index) => (
              <div
                key={`${blocker}-${index}`}
                style={{
                  padding: '0.75rem',
                  backgroundColor: '#f9fafb',
                  borderRadius: '0.375rem',
                  border: '1px solid #e5e7eb',
                }}
              >
                <span style={{ color: '#111827', fontSize: '0.875rem' }}>
                  {BLOCKER_LABELS[blocker]}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

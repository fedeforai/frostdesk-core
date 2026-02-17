/**
 * AI Debug Panel — Snapshot Data Block (F2.5.1.1)
 * 
 * Displays raw AI classification snapshot data in read-only format.
 * 
 * WHAT THIS DOES:
 * - Shows relevance classification
 * - Shows intent classification
 * - Displays confidence scores
 * 
 * WHAT THIS DOES NOT DO:
 * - No interpretation
 * - No actions or CTAs
 * - No data fetching
 * - No logic or transformations
 */

interface AIDebugPanelProps {
  relevant: boolean;
  relevance_confidence: number;
  relevance_reason?: string | null;
  intent: string | null;
  intent_confidence: number | null;
  model?: string | null;
}

export default function AIDebugPanel({
  relevant,
  relevance_confidence,
  relevance_reason,
  intent,
  intent_confidence,
  model,
}: AIDebugPanelProps) {
  const formatConfidence = (value: number | null): string => {
    if (value === null) return '—';
    return value.toFixed(2);
  };

  const formatIntent = (value: string | null): string => {
    return value || '—';
  };

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
          color: 'rgba(226, 232, 240, 0.95)',
        }}>
          AI Snapshot
        </h2>
      </div>

      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '1rem',
      }}>
        {/* Relevant */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0.75rem',
          backgroundColor: '#f9fafb',
          borderRadius: '0.375rem',
          border: '1px solid #e5e7eb',
        }}>
          <span style={{ 
            color: '#6b7280', 
            fontSize: '0.875rem',
            fontWeight: '500',
          }}>
            Relevant
          </span>
          <span style={{ 
            color: 'rgba(226, 232, 240, 0.95)', 
            fontSize: '0.875rem',
            fontWeight: '600',
            fontFamily: 'monospace',
          }}>
            {relevant ? 'Yes' : 'No'}
          </span>
        </div>

        {/* Relevance Confidence */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0.75rem',
          backgroundColor: '#f9fafb',
          borderRadius: '0.375rem',
          border: '1px solid #e5e7eb',
        }}>
          <span style={{ 
            color: '#6b7280', 
            fontSize: '0.875rem',
            fontWeight: '500',
          }}>
            Relevance confidence
          </span>
          <span style={{ 
            color: 'rgba(226, 232, 240, 0.95)', 
            fontSize: '0.875rem',
            fontWeight: '600',
            fontFamily: 'monospace',
          }}>
            {formatConfidence(relevance_confidence)}
          </span>
        </div>

        {/* Relevance Reason */}
        {relevance_reason != null && relevance_reason !== '' && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0.75rem',
            backgroundColor: '#f9fafb',
            borderRadius: '0.375rem',
            border: '1px solid #e5e7eb',
          }}>
            <span style={{ 
              color: '#6b7280', 
              fontSize: '0.875rem',
              fontWeight: '500',
            }}>
              Relevance reason
            </span>
            <span style={{ 
              color: 'rgba(226, 232, 240, 0.95)', 
              fontSize: '0.875rem',
              fontWeight: '600',
              fontFamily: 'monospace',
            }}>
              {relevance_reason}
            </span>
          </div>
        )}

        {/* Intent */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0.75rem',
          backgroundColor: '#f9fafb',
          borderRadius: '0.375rem',
          border: '1px solid #e5e7eb',
        }}>
          <span style={{ 
            color: '#6b7280', 
            fontSize: '0.875rem',
            fontWeight: '500',
          }}>
            Intent
          </span>
          <span style={{ 
            color: 'rgba(226, 232, 240, 0.95)', 
            fontSize: '0.875rem',
            fontWeight: '600',
            fontFamily: 'monospace',
          }}>
            {formatIntent(intent)}
          </span>
        </div>

        {/* Intent Confidence */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0.75rem',
          backgroundColor: '#f9fafb',
          borderRadius: '0.375rem',
          border: '1px solid #e5e7eb',
        }}>
          <span style={{ 
            color: '#6b7280', 
            fontSize: '0.875rem',
            fontWeight: '500',
          }}>
            Intent confidence
          </span>
          <span style={{ 
            color: 'rgba(226, 232, 240, 0.95)', 
            fontSize: '0.875rem',
            fontWeight: '600',
            fontFamily: 'monospace',
          }}>
            {formatConfidence(intent_confidence)}
          </span>
        </div>

        {/* Model */}
        {model != null && model !== '' && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0.75rem',
            backgroundColor: '#f9fafb',
            borderRadius: '0.375rem',
            border: '1px solid #e5e7eb',
          }}>
            <span style={{ 
              color: '#6b7280', 
              fontSize: '0.875rem',
              fontWeight: '500',
            }}>
              Model
            </span>
            <span style={{ 
              color: 'rgba(226, 232, 240, 0.95)', 
              fontSize: '0.875rem',
              fontWeight: '600',
              fontFamily: 'monospace',
            }}>
              {model}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

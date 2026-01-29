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
  intent: string | null;
  intent_confidence: number | null;
  decision?: string | null;
  reason?: string | null;
  allow_draft?: boolean | null;
  require_escalation?: boolean | null;
  draft_generated?: boolean | null;
  draft_blocked?: boolean | null;
  draft_present?: boolean | null;
  violations?: string[] | null;
}

export default function AIDebugPanel({
  relevant,
  relevance_confidence,
  intent,
  intent_confidence,
  decision,
  reason,
  allow_draft,
  require_escalation,
  draft_generated,
  draft_blocked,
  draft_present,
  violations,
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
          color: '#111827',
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
            color: '#111827', 
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
            color: '#111827', 
            fontSize: '0.875rem',
            fontWeight: '600',
            fontFamily: 'monospace',
          }}>
            {formatConfidence(relevance_confidence)}
          </span>
        </div>

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
            color: '#111827', 
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
            color: '#111827', 
            fontSize: '0.875rem',
            fontWeight: '600',
            fontFamily: 'monospace',
          }}>
            {formatConfidence(intent_confidence)}
          </span>
        </div>
      </div>

      {/* AI Decision Section */}
      <div style={{ 
        marginTop: '1.5rem',
        paddingTop: '1.5rem',
        borderTop: '1px solid #e5e7eb',
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
            AI Decision
          </h2>
        </div>

        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '1rem',
        }}>
          {/* Decision */}
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
              Decision
            </span>
            <span style={{ 
              color: '#111827', 
              fontSize: '0.875rem',
              fontWeight: '600',
              fontFamily: 'monospace',
            }}>
              {decision || '—'}
            </span>
          </div>

          {/* Reason */}
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
              Reason
            </span>
            <span style={{ 
              color: '#111827', 
              fontSize: '0.875rem',
              fontWeight: '600',
              fontFamily: 'monospace',
            }}>
              {reason || '—'}
            </span>
          </div>
        </div>
      </div>

      {/* AI Permissions Section */}
      <div style={{ 
        marginTop: '1.5rem',
        paddingTop: '1.5rem',
        borderTop: '1px solid #e5e7eb',
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
            AI Permissions
          </h2>
        </div>

        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '1rem',
        }}>
          {/* Allow Draft */}
          <div style={{
            padding: '0.75rem',
            backgroundColor: '#f9fafb',
            borderRadius: '0.375rem',
            border: '1px solid #e5e7eb',
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '0.5rem',
            }}>
              <span style={{ 
                color: '#6b7280', 
                fontSize: '0.875rem',
                fontWeight: '500',
              }}>
                Allow draft
              </span>
              <span style={{ 
                color: '#111827', 
                fontSize: '0.875rem',
                fontWeight: '600',
                fontFamily: 'monospace',
              }}>
                {allow_draft === null ? '—' : allow_draft ? 'true' : 'false'}
              </span>
            </div>
            <p style={{
              color: '#6b7280',
              fontSize: '0.75rem',
              margin: 0,
              fontStyle: 'italic',
            }}>
              AI is permitted to generate a draft reply.
            </p>
          </div>

          {/* Require Escalation */}
          <div style={{
            padding: '0.75rem',
            backgroundColor: '#f9fafb',
            borderRadius: '0.375rem',
            border: '1px solid #e5e7eb',
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '0.5rem',
            }}>
              <span style={{ 
                color: '#6b7280', 
                fontSize: '0.875rem',
                fontWeight: '500',
              }}>
                Require escalation
              </span>
              <span style={{ 
                color: '#111827', 
                fontSize: '0.875rem',
                fontWeight: '600',
                fontFamily: 'monospace',
              }}>
                {require_escalation === null ? '—' : require_escalation ? 'true' : 'false'}
              </span>
            </div>
            <p style={{
              color: '#6b7280',
              fontSize: '0.75rem',
              margin: 0,
              fontStyle: 'italic',
            }}>
              Human review is required before any action.
            </p>
          </div>
        </div>
      </div>

      {/* Draft Outcome Section */}
      <div style={{ 
        marginTop: '1.5rem',
        paddingTop: '1.5rem',
        borderTop: '1px solid #e5e7eb',
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
            Draft Outcome
          </h2>
        </div>

        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '1rem',
        }}>
          {/* Draft Generated */}
          <div style={{
            padding: '0.75rem',
            backgroundColor: '#f9fafb',
            borderRadius: '0.375rem',
            border: '1px solid #e5e7eb',
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '0.5rem',
            }}>
              <span style={{ 
                color: '#6b7280', 
                fontSize: '0.875rem',
                fontWeight: '500',
              }}>
                Draft generated
              </span>
              <span style={{ 
                color: '#111827', 
                fontSize: '0.875rem',
                fontWeight: '600',
                fontFamily: 'monospace',
              }}>
                {draft_generated === null ? '—' : draft_generated ? 'yes' : 'no'}
              </span>
            </div>
            <p style={{
              color: '#6b7280',
              fontSize: '0.75rem',
              margin: 0,
              fontStyle: 'italic',
            }}>
              A draft reply was created and stored.
            </p>
          </div>

          {/* Draft Blocked */}
          <div style={{
            padding: '0.75rem',
            backgroundColor: '#f9fafb',
            borderRadius: '0.375rem',
            border: '1px solid #e5e7eb',
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '0.5rem',
            }}>
              <span style={{ 
                color: '#6b7280', 
                fontSize: '0.875rem',
                fontWeight: '500',
              }}>
                Draft blocked
              </span>
              <span style={{ 
                color: '#111827', 
                fontSize: '0.875rem',
                fontWeight: '600',
                fontFamily: 'monospace',
              }}>
                {draft_blocked === null ? '—' : draft_blocked ? 'yes' : 'no'}
              </span>
            </div>
            <p style={{
              color: '#6b7280',
              fontSize: '0.75rem',
              margin: 0,
              fontStyle: 'italic',
            }}>
              A draft was not stored due to guardrail rules.
            </p>
          </div>

          {/* Draft Present (Optional) */}
          {draft_present !== undefined && (
            <div style={{
              padding: '0.75rem',
              backgroundColor: '#f9fafb',
              borderRadius: '0.375rem',
              border: '1px solid #e5e7eb',
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.5rem',
              }}>
                <span style={{ 
                  color: '#6b7280', 
                  fontSize: '0.875rem',
                  fontWeight: '500',
                }}>
                  Draft present
                </span>
                <span style={{ 
                  color: '#111827', 
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  fontFamily: 'monospace',
                }}>
                  {draft_present === null ? '—' : draft_present ? 'yes' : 'no'}
                </span>
              </div>
              <p style={{
                color: '#6b7280',
                fontSize: '0.75rem',
                margin: 0,
                fontStyle: 'italic',
              }}>
                A draft exists in storage for this message.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Guardrail Violations Section - Only show if violations exist */}
      {violations && violations.length > 0 && (
        <div style={{ 
          marginTop: '1.5rem',
          paddingTop: '1.5rem',
          borderTop: '1px solid #e5e7eb',
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
              Guardrail Violations
            </h2>
          </div>

          <div style={{
            padding: '0.75rem',
            backgroundColor: '#fef2f2',
            borderRadius: '0.375rem',
            border: '1px solid #fecaca',
            marginBottom: '1rem',
          }}>
            <p style={{
              color: '#991b1b',
              fontSize: '0.875rem',
              margin: 0,
              fontWeight: '500',
            }}>
              Draft blocked due to safety guardrails.
            </p>
          </div>

          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '0.75rem',
          }}>
            {violations.map((violation, index) => (
              <div
                key={index}
                style={{
                  padding: '0.75rem',
                  backgroundColor: '#f9fafb',
                  borderRadius: '0.375rem',
                  border: '1px solid #e5e7eb',
                }}
              >
                <span style={{ 
                  color: '#111827', 
                  fontSize: '0.875rem',
                  fontFamily: 'monospace',
                }}>
                  {violation}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

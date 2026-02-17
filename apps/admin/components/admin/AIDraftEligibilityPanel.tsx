'use client';

/**
 * AI Draft Eligibility Panel (PILOT-SAFE, READ-ONLY)
 * 
 * Displays draft eligibility and escalation status based on AI snapshot.
 * 
 * WHAT THIS COMPONENT DOES:
 * - Shows draft section if eligible
 * - Shows escalation banner if required
 * - Displays explanation text based on explanationKey
 * - Read-only, no actions
 * 
 * WHAT THIS COMPONENT DOES NOT DO:
 * - No draft creation
 * - No message sending
 * - No state mutation
 * - No buttons or CTAs
 */

interface AIDraftEligibilityPanelProps {
  showDraftSection: boolean;
  showEscalationBanner: boolean;
  explanationKey: string;
  draftText?: string;
}

/**
 * Maps explanationKey to UI copy text.
 */
function getExplanationText(key: string): string {
  switch (key) {
    case 'AI_DRAFT_AVAILABLE':
      return 'An AI draft is available for review.';
    case 'AI_DRAFT_AVAILABLE_NEEDS_REVIEW':
      return 'An AI draft is available. Human review is required.';
    case 'AI_ESCALATED_LOW_INTENT':
      return 'This conversation requires human handling.';
    case 'AI_IGNORED_LOW_RELEVANCE':
      return ''; // No message shown (handled separately)
    case 'AI_DECISION_MISSING':
      return 'AI decision data is not available for this message.';
    default:
      return 'AI decision status unknown.';
  }
}

/**
 * Gets empty state copy for cases where no draft is shown.
 */
function getEmptyStateCopy(
  explanationKey: string,
  showDraftSection: boolean,
  showEscalationBanner: boolean
): string | null {
  // If draft section is shown, no empty state needed
  if (showDraftSection) {
    return null;
  }

  // Specific empty state messages based on explanationKey
  switch (explanationKey) {
    case 'AI_IGNORED_LOW_RELEVANCE':
      return 'This message was ignored because it is outside the FrostDesk domain.';
    
    case 'AI_ESCALATED_LOW_INTENT':
      // This case shows escalation banner, so empty state is different
      return 'The AI did not generate a draft due to low confidence. Human handling is required.';
    
    case 'AI_DECISION_MISSING':
      return 'AI decision data is not available for this message.';
    
    default:
      // Generic case: relevant but no draft available
      return 'No AI draft is available for this conversation.';
  }
}

export default function AIDraftEligibilityPanel({
  showDraftSection,
  showEscalationBanner,
  explanationKey,
  draftText,
}: AIDraftEligibilityPanelProps) {
  const explanationText = getExplanationText(explanationKey);
  const emptyStateCopy = getEmptyStateCopy(explanationKey, showDraftSection, showEscalationBanner);

  // If nothing to show (no draft, no escalation, no empty state), render nothing
  if (!showDraftSection && !showEscalationBanner && !emptyStateCopy) {
    return null;
  }

  return (
    <>
      {/* Escalation Banner */}
      {showEscalationBanner && (
        <div style={{
          padding: '0.75rem 1rem',
          backgroundColor: '#fef3c7',
          border: '1px solid #fde68a',
          borderRadius: '0.375rem',
          marginBottom: '1rem',
        }}>
          <p style={{
            color: '#92400e',
            fontSize: '0.875rem',
            margin: 0,
            fontWeight: '500',
          }}>
            Human review required
          </p>
        </div>
      )}

      {/* Empty State Copy (when no draft section and no escalation banner) */}
      {emptyStateCopy && !showDraftSection && (
        <div style={{
          padding: '1rem',
          backgroundColor: '#f9fafb',
          borderRadius: '0.375rem',
          border: '1px solid #e5e7eb',
          marginBottom: '1rem',
        }}>
          <p style={{
            color: '#6b7280',
            fontSize: '0.875rem',
            margin: 0,
          }}>
            {emptyStateCopy}
          </p>
        </div>
      )}

      {/* Empty State Copy for ESCALATE_ONLY (when escalation banner is shown but no draft) */}
      {explanationKey === 'AI_ESCALATED_LOW_INTENT' && showEscalationBanner && !showDraftSection && (
        <div style={{
          padding: '1rem',
          backgroundColor: '#f9fafb',
          borderRadius: '0.375rem',
          border: '1px solid #e5e7eb',
          marginBottom: '1rem',
        }}>
          <p style={{
            color: '#6b7280',
            fontSize: '0.875rem',
            margin: 0,
          }}>
            The AI did not generate a draft due to low confidence. Human handling is required.
          </p>
        </div>
      )}

      {/* Draft Section */}
      {showDraftSection && (
        <div style={{
          border: '1px solid #e5e7eb',
          borderRadius: '0.5rem',
          padding: '1.5rem',
          backgroundColor: '#ffffff',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
          marginBottom: '1rem',
        }}>
          <h2 style={{
            fontSize: '1.25rem',
            fontWeight: '600',
            color: 'rgba(226, 232, 240, 0.95)',
            margin: '0 0 1rem 0',
          }}>
            AI Draft
          </h2>

          {explanationText && (
            <div style={{
              padding: '0.75rem',
              backgroundColor: '#f0f9ff',
              border: '1px solid #bae6fd',
              borderRadius: '0.375rem',
              marginBottom: '1rem',
            }}>
              <p style={{
                color: '#1e40af',
                fontSize: '0.875rem',
                margin: 0,
              }}>
                {explanationText}
              </p>
            </div>
          )}

          {draftText ? (
            <div style={{
              padding: '1rem',
              backgroundColor: '#f9fafb',
              borderRadius: '0.375rem',
              border: '1px solid #e5e7eb',
              fontFamily: 'monospace',
              fontSize: '0.875rem',
              color: '#374151',
              lineHeight: '1.5',
              whiteSpace: 'pre-wrap',
            }}>
              {draftText}
            </div>
          ) : (
            <div style={{
              padding: '1rem',
              backgroundColor: '#f9fafb',
              borderRadius: '0.375rem',
              border: '1px solid #e5e7eb',
              textAlign: 'center',
            }}>
              <p style={{
                color: '#6b7280',
                fontSize: '0.875rem',
                margin: 0,
                fontStyle: 'italic',
              }}>
                Draft text not available
              </p>
            </div>
          )}
        </div>
      )}
    </>
  );
}

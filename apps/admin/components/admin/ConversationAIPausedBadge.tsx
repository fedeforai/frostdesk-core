/**
 * ConversationAIPausedBadge Component (READ-ONLY)
 * 
 * WHAT IT DOES:
 * - Displays a read-only badge indicating AI was paused by human action
 * - Informational only, no interactions
 * 
 * WHAT IT DOES NOT DO:
 * - No buttons
 * - No interactions
 * - No state changes
 * - No side effects
 */

interface ConversationAIPausedBadgeProps {
  visible: boolean;
}

export default function ConversationAIPausedBadge({
  visible,
}: ConversationAIPausedBadgeProps) {
  if (!visible) {
    return null;
  }

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '0.25rem 0.625rem',
        fontSize: '0.75rem',
        fontWeight: 500,
        borderRadius: '999px',
        backgroundColor: '#fef3c7',
        color: '#92400e',
        border: '1px solid #fde68a',
        whiteSpace: 'nowrap',
      }}
    >
      AI paused by human
    </div>
  );
}

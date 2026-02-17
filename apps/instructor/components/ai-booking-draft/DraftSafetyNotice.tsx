export function DraftSafetyNotice() {
  return (
    <div style={{
      padding: '0.75rem 1rem',
      marginBottom: '1.5rem',
      backgroundColor: 'rgba(59, 130, 246, 0.15)',
      border: '1px solid rgba(96, 165, 250, 0.4)',
      borderRadius: 8,
      fontSize: '0.875rem',
      color: 'rgba(191, 219, 254, 0.95)',
    }}>
      This is an AI-generated draft. No booking has been created.
      No calendar, availability or payment has been modified.
    </div>
  );
}

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
      È una bozza generata dall&apos;AI. Nessuna prenotazione è stata creata.
      Nessun calendario, disponibilità o pagamento è stato modificato.
    </div>
  );
}

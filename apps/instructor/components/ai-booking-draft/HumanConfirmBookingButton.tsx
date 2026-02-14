'use client';

interface HumanConfirmBookingButtonProps {
  acknowledged: boolean;
  onClick: () => void;
}

export function HumanConfirmBookingButton({
  acknowledged,
  onClick,
}: HumanConfirmBookingButtonProps) {
  return (
    <div style={{ marginTop: '1rem' }}>
      <button
        type="button"
        disabled={!acknowledged}
        title="Questa azione creerà una prenotazione reale."
        onClick={onClick}
        style={{
          padding: '0.625rem 1.25rem',
          borderRadius: 8,
          border: acknowledged ? '1px solid rgba(34, 197, 94, 0.5)' : '1px solid rgba(71, 85, 105, 0.5)',
          backgroundColor: acknowledged ? 'rgba(34, 197, 94, 0.2)' : 'rgba(51, 65, 85, 0.3)',
          color: acknowledged ? '#86efac' : 'rgba(148, 163, 184, 0.7)',
          fontWeight: 600,
          fontSize: '0.875rem',
          cursor: acknowledged ? 'pointer' : 'not-allowed',
          opacity: acknowledged ? 1 : 0.7,
        }}
      >
        Conferma prenotazione (azione umana)
      </button>
    </div>
  );
}

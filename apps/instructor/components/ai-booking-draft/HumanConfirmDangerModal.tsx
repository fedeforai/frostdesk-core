'use client';

interface HumanConfirmDangerModalProps {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function HumanConfirmDangerModal({
  open,
  onCancel,
  onConfirm,
}: HumanConfirmDangerModalProps) {
  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div style={{
        background: 'rgba(30, 41, 59, 0.98)',
        padding: '1.5rem 1.75rem',
        maxWidth: '440px',
        borderRadius: 12,
        border: '1px solid rgba(71, 85, 105, 0.6)',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
      }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'rgba(226, 232, 240, 0.95)', marginBottom: '1rem' }}>
          You are about to create a real booking
        </h3>

        <ul style={{
          margin: 0,
          paddingLeft: '1.25rem',
          fontSize: '0.875rem',
          color: 'rgba(203, 213, 225, 0.9)',
          lineHeight: 1.6,
        }}>
          <li>L&apos;azione è irreversibile</li>
          <li>Availability will not be rechecked</li>
          <li>Eventuali conflitti in calendario non verranno risolti</li>
          <li>L&apos;AI non interverrà</li>
          <li>Stai agendo come operatore umano</li>
        </ul>

        <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: 8,
              border: '1px solid rgba(71, 85, 105, 0.6)',
              background: 'transparent',
              color: 'rgba(203, 213, 225, 0.9)',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: 8,
              border: '1px solid rgba(248, 113, 113, 0.5)',
              background: 'rgba(185, 28, 28, 0.3)',
              color: '#fca5a5',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
            }}
          >
            Ho capito, continua
          </button>
        </div>
      </div>
    </div>
  );
}

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
    <div style={{ marginTop: '24px' }}>
      <button
        disabled={!acknowledged}
        title="This action will create a real booking. Backend not wired yet."
        onClick={onClick}
        style={{
          padding: '12px 16px',
          opacity: acknowledged ? 1 : 0.5,
          cursor: acknowledged ? 'pointer' : 'not-allowed',
        }}
      >
        Confirm booking (human action)
      </button>
    </div>
  );
}

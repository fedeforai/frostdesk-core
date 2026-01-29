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
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div style={{ background: '#fff', padding: '24px', maxWidth: '480px' }}>
        <h3>You are about to create a real booking</h3>

        <ul>
          <li>This action is irreversible</li>
          <li>Availability will NOT be rechecked</li>
          <li>Calendar conflicts will NOT be resolved</li>
          <li>AI will NOT intervene</li>
          <li>You are acting as a human operator</li>
        </ul>

        <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
          <button onClick={onCancel}>Cancel</button>
          <button onClick={onConfirm}>
            I understand, continue
          </button>
        </div>
      </div>
    </div>
  );
}

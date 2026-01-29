'use client';

interface SystemStatusProps {
  aiEnabled: boolean;
  emergencyDisabled: boolean;
}

export default function SystemStatus({ aiEnabled, emergencyDisabled }: SystemStatusProps) {
  let status: 'ON' | 'OFF' | 'PILOT';
  let statusColor: string;
  let statusBg: string;
  let statusText: string;

  if (emergencyDisabled) {
    status = 'OFF';
    statusColor = '#dc2626';
    statusBg = '#fef2f2';
    statusText = 'AI Emergency Disabled';
  } else if (aiEnabled) {
    status = 'ON';
    statusColor = '#16a34a';
    statusBg = '#f0fdf4';
    statusText = 'AI Enabled';
  } else {
    status = 'PILOT';
    statusColor = '#f59e0b';
    statusBg = '#fffbeb';
    statusText = 'Pilot Mode';
  }

  return (
    <div style={{
      padding: '1rem 1.5rem',
      border: `1px solid ${statusColor}`,
      borderRadius: '0.5rem',
      backgroundColor: statusBg,
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
    }}>
      <div style={{
        width: '0.75rem',
        height: '0.75rem',
        borderRadius: '50%',
        backgroundColor: statusColor,
      }} />
      <div>
        <div style={{ fontSize: '0.875rem', fontWeight: '600', color: statusColor }}>
          System Status: {status}
        </div>
        <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
          {statusText}
        </div>
      </div>
    </div>
  );
}

import type { InstructorCalendarConnection } from '@/lib/instructorApi';

interface DashboardCalendarStatusProps {
  calendarConnection: InstructorCalendarConnection | null;
}

export default function DashboardCalendarStatus({ calendarConnection }: DashboardCalendarStatusProps) {
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div style={{
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '0.5rem',
      padding: '1.5rem',
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
    }}>
      <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: 'rgba(226, 232, 240, 0.95)', marginBottom: '1rem' }}>
        Calendar Status
      </h2>
      {calendarConnection ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.875rem', color: 'rgba(148, 163, 184, 0.9)', marginBottom: '0.25rem' }}>Status</div>
            <div style={{ fontSize: '1rem', color: 'rgba(226, 232, 240, 0.95)', fontWeight: '500' }}>Connected</div>
          </div>
          <div>
            <div style={{ fontSize: '0.875rem', color: 'rgba(148, 163, 184, 0.9)', marginBottom: '0.25rem' }}>Calendar ID</div>
            <div style={{ fontSize: '1rem', color: 'rgba(226, 232, 240, 0.95)', fontWeight: '500', fontFamily: 'monospace' }}>
              {calendarConnection.calendar_id}
            </div>
          </div>
          {calendarConnection.updated_at && (
            <div>
              <div style={{ fontSize: '0.875rem', color: 'rgba(148, 163, 184, 0.9)', marginBottom: '0.25rem' }}>Last sync</div>
              <div style={{ fontSize: '1rem', color: 'rgba(226, 232, 240, 0.95)', fontWeight: '500' }}>
                {formatTimestamp(calendarConnection.updated_at)}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div>
          <div style={{ fontSize: '0.875rem', color: 'rgba(148, 163, 184, 0.9)', marginBottom: '0.25rem' }}>Status</div>
          <div style={{ fontSize: '1rem', color: 'rgba(226, 232, 240, 0.95)', fontWeight: '500' }}>Not connected</div>
        </div>
      )}
    </div>
  );
}

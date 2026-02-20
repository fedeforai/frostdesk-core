import { AIBookingDraft } from '../../../../packages/db/src/ai_booking_draft_types';

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: '0.875rem',
};

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '0.5rem 1rem 0.5rem 0',
  fontWeight: 600,
  color: 'rgba(148, 163, 184, 0.95)',
  width: '140px',
};

const tdStyle: React.CSSProperties = {
  padding: '0.5rem 0',
  color: 'rgba(226, 232, 240, 0.92)',
};

interface Props {
  draft: AIBookingDraft;
  /** If the draft was confirmed and a booking was created, this is the real booking ID. */
  bookingId?: string | null;
}

function formatIso(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function AIBookingDraftPreview({ draft, bookingId }: Props) {
  return (
    <section style={{
      border: '1px solid rgba(71, 85, 105, 0.5)',
      borderRadius: 8,
      overflow: 'hidden',
      backgroundColor: 'rgba(30, 41, 59, 0.4)',
      padding: '1.25rem 1.5rem',
      marginBottom: '1.5rem',
    }}>
      <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'rgba(226, 232, 240, 0.95)', marginBottom: '1rem' }}>
        Booking draft (preview)
      </h2>

      <table style={tableStyle}>
        <tbody>
          {bookingId && (
            <tr>
              <th style={thStyle}>Booking ID</th>
              <td style={tdStyle}>
                <code style={{ fontFamily: 'monospace', fontSize: '0.8125rem', color: '#7dd3fc', background: 'rgba(15, 23, 42, 0.5)', padding: '0.15rem 0.4rem', borderRadius: 4 }}>
                  {bookingId}
                </code>
              </td>
            </tr>
          )}
          <tr>
            <th style={thStyle}>Customer</th>
            <td style={tdStyle}>{draft.customer_name ?? '—'}</td>
          </tr>
          <tr>
            <th style={thStyle}>Inizio</th>
            <td style={tdStyle}>{formatIso(draft.start_time)}</td>
          </tr>
          <tr>
            <th style={thStyle}>Fine</th>
            <td style={tdStyle}>{formatIso(draft.end_time)}</td>
          </tr>
          <tr>
            <th style={thStyle}>Service</th>
            <td style={tdStyle}>{draft.service_id ?? '—'}</td>
          </tr>
          <tr>
            <th style={thStyle}>Meeting place</th>
            <td style={tdStyle}>{draft.meeting_point_id ?? '—'}</td>
          </tr>
          <tr>
            <th style={thStyle}>Draft reason</th>
            <td style={tdStyle}>{draft.draft_reason}</td>
          </tr>
          <tr>
            <th style={thStyle}>Generated on</th>
            <td style={tdStyle}>{formatIso(draft.created_at)}</td>
          </tr>
        </tbody>
      </table>
    </section>
  );
}

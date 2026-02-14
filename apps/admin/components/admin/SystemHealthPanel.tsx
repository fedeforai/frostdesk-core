import type { SystemHealthSnapshot } from '@/lib/adminApi';

interface SystemHealthPanelProps {
  snapshot: SystemHealthSnapshot;
  isLive?: boolean;
}

const ACTIVITY_LABELS: Record<keyof SystemHealthSnapshot['activity_today'], string> = {
  conversations_ai_eligible: 'Conversazioni AI-eligible',
  escalations: 'Escalation',
  drafts_generated: 'Draft generati',
  drafts_sent: 'Draft inviati',
};

export default function SystemHealthPanel({ snapshot, isLive = false }: SystemHealthPanelProps) {
  const act = snapshot.activity_today;
  const maxActivity = Math.max(
    act.conversations_ai_eligible,
    act.escalations,
    act.drafts_generated,
    act.drafts_sent,
    1
  );
  const activityRows: Array<{ key: keyof SystemHealthSnapshot['activity_today']; label: string; value: number }> = [
    { key: 'conversations_ai_eligible', label: ACTIVITY_LABELS.conversations_ai_eligible, value: act.conversations_ai_eligible },
    { key: 'escalations', label: ACTIVITY_LABELS.escalations, value: act.escalations },
    { key: 'drafts_generated', label: ACTIVITY_LABELS.drafts_generated, value: act.drafts_generated },
    { key: 'drafts_sent', label: ACTIVITY_LABELS.drafts_sent, value: act.drafts_sent },
  ];

  return (
    <div style={{
      border: '1px solid #e5e7eb',
      borderRadius: '0.5rem',
      padding: '1.5rem',
      backgroundColor: '#ffffff',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem',
        borderBottom: '1px solid #e5e7eb',
        paddingBottom: '0.75rem',
        flexWrap: 'wrap',
        gap: '0.5rem',
      }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#111827' }}>
          System Health Snapshot
        </h2>
        <span
          style={{
            fontSize: '0.75rem',
            padding: '0.25rem 0.5rem',
            borderRadius: 4,
            background: isLive ? '#d1fae5' : '#fef3c7',
            color: isLive ? '#065f46' : '#92400e',
            fontWeight: 500,
          }}
        >
          {isLive ? 'Dati live (API + DB)' : 'Fallback (API non raggiungibile)'}
        </span>
      </div>

      {/* Section 1: Emergency Status */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ 
          fontSize: '1rem', 
          fontWeight: '600',
          color: '#111827',
          marginBottom: '0.75rem',
        }}>
          Emergency Status
        </h3>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0.75rem',
          backgroundColor: snapshot.emergency_disabled ? '#fef2f2' : '#f0fdf4',
          borderRadius: '0.375rem',
          border: `1px solid ${snapshot.emergency_disabled ? '#fecaca' : '#86efac'}`,
        }}>
          <span style={{ color: '#111827', fontSize: '0.875rem', fontWeight: '500' }}>
            ENV Emergency Kill Switch
          </span>
          <span style={{
            display: 'inline-block',
            padding: '0.375rem 0.75rem',
            borderRadius: '0.375rem',
            backgroundColor: snapshot.emergency_disabled ? '#fee2e2' : '#d1fae5',
            color: snapshot.emergency_disabled ? '#991b1b' : '#065f46',
            fontSize: '0.875rem',
            fontWeight: '600',
            border: `1px solid ${snapshot.emergency_disabled ? '#fecaca' : '#a7f3d0'}`,
          }}>
            {snapshot.emergency_disabled ? 'ACTIVE' : 'INACTIVE'}
          </span>
        </div>
      </div>

      {/* Section 2: AI Feature Flags */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ 
          fontSize: '1rem', 
          fontWeight: '600',
          color: '#111827',
          marginBottom: '0.75rem',
        }}>
          AI Feature Flags
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0.75rem',
            backgroundColor: '#f9fafb',
            borderRadius: '0.375rem',
            border: '1px solid #e5e7eb',
          }}>
            <span style={{ color: '#111827', fontSize: '0.875rem', fontWeight: '500' }}>
              AI Global
            </span>
            <span style={{
              display: 'inline-block',
              padding: '0.375rem 0.75rem',
              borderRadius: '0.375rem',
              backgroundColor: snapshot.ai_global_enabled ? '#d1fae5' : '#fee2e2',
              color: snapshot.ai_global_enabled ? '#065f46' : '#991b1b',
              fontSize: '0.875rem',
              fontWeight: '600',
              border: `1px solid ${snapshot.ai_global_enabled ? '#a7f3d0' : '#fecaca'}`,
            }}>
              {snapshot.ai_global_enabled ? 'ON' : 'OFF'}
            </span>
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0.75rem',
            backgroundColor: '#f9fafb',
            borderRadius: '0.375rem',
            border: '1px solid #e5e7eb',
          }}>
            <span style={{ color: '#111827', fontSize: '0.875rem', fontWeight: '500' }}>
              WhatsApp AI
            </span>
            <span style={{
              display: 'inline-block',
              padding: '0.375rem 0.75rem',
              borderRadius: '0.375rem',
              backgroundColor: snapshot.ai_whatsapp_enabled ? '#d1fae5' : '#fee2e2',
              color: snapshot.ai_whatsapp_enabled ? '#065f46' : '#991b1b',
              fontSize: '0.875rem',
              fontWeight: '600',
              border: `1px solid ${snapshot.ai_whatsapp_enabled ? '#a7f3d0' : '#fecaca'}`,
            }}>
              {snapshot.ai_whatsapp_enabled ? 'ON' : 'OFF'}
            </span>
          </div>
        </div>
      </div>

      {/* Section 3: Channel Quota */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ 
          fontSize: '1rem', 
          fontWeight: '600',
          color: '#111827',
          marginBottom: '0.75rem',
        }}>
          Channel Quota
        </h3>
        {snapshot.quota.status === 'not_configured' ? (
          <div style={{
            padding: '0.75rem',
            backgroundColor: '#f9fafb',
            borderRadius: '0.375rem',
            border: '1px solid #e5e7eb',
            color: '#6b7280',
            fontSize: '0.875rem',
          }}>
            NOT CONFIGURED
          </div>
        ) : (
          <div style={{
            padding: '0.75rem',
            backgroundColor: snapshot.quota.status === 'exceeded' ? '#fef2f2' : snapshot.quota.status === 'ok' ? '#f0fdf4' : '#f9fafb',
            borderRadius: '0.375rem',
            border: `1px solid ${snapshot.quota.status === 'exceeded' ? '#fecaca' : snapshot.quota.status === 'ok' ? '#86efac' : '#e5e7eb'}`,
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '0.5rem',
            }}>
              <span style={{ color: '#111827', fontSize: '0.875rem', fontWeight: '500', textTransform: 'capitalize' }}>
                {snapshot.quota.channel}
              </span>
              <span style={{
                display: 'inline-block',
                padding: '0.375rem 0.75rem',
                borderRadius: '0.375rem',
                backgroundColor: snapshot.quota.status === 'exceeded' ? '#fee2e2' : snapshot.quota.status === 'ok' ? '#d1fae5' : '#f3f4f6',
                color: snapshot.quota.status === 'exceeded' ? '#991b1b' : snapshot.quota.status === 'ok' ? '#065f46' : '#6b7280',
                fontSize: '0.875rem',
                fontWeight: '600',
                border: `1px solid ${snapshot.quota.status === 'exceeded' ? '#fecaca' : snapshot.quota.status === 'ok' ? '#a7f3d0' : '#e5e7eb'}`,
              }}>
                {snapshot.quota.status.toUpperCase()}
              </span>
            </div>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              fontSize: '0.875rem',
              color: '#6b7280',
              fontFamily: 'monospace',
            }}>
              <span>
                Limit: {snapshot.quota.limit ?? 'N/A'}
              </span>
              <span>
                Used: {snapshot.quota.used_today ?? 'N/A'}
              </span>
              <span>
                {snapshot.quota.percentage !== null ? `${snapshot.quota.percentage}%` : 'N/A'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Section 4: Activity Today — Table */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#111827', marginBottom: '0.75rem' }}>
          Activity Today (tabella)
        </h3>
        <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: '0.375rem' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb' }}>
                <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb', fontWeight: 600, color: '#111827' }}>
                  Metrica
                </th>
                <th style={{ padding: '0.75rem', textAlign: 'right', borderBottom: '1px solid #e5e7eb', fontWeight: 600, color: '#111827' }}>
                  Valore
                </th>
              </tr>
            </thead>
            <tbody>
              {activityRows.map((row) => (
                <tr key={row.key} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '0.75rem', color: '#374151' }}>{row.label}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, color: '#111827' }}>
                    {row.value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 5: Activity Today — Bar chart (CSS) */}
      <div>
        <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#111827', marginBottom: '0.75rem' }}>
          Activity Today (grafico)
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {activityRows.map((row) => (
            <div key={row.key}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', fontSize: '0.8125rem', color: '#6b7280' }}>
                <span>{row.label}</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#111827' }}>{row.value}</span>
              </div>
              <div
                style={{
                  height: 24,
                  backgroundColor: '#f3f4f6',
                  borderRadius: 4,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${Math.min(100, (row.value / maxActivity) * 100)}%`,
                    height: '100%',
                    backgroundColor: row.key === 'escalations' ? '#f59e0b' : '#3b82f6',
                    borderRadius: 4,
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

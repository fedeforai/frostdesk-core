import type { SystemHealthSnapshot } from '@/lib/adminApi';

interface SystemHealthPanelProps {
  snapshot: SystemHealthSnapshot;
}

export default function SystemHealthPanel({ snapshot }: SystemHealthPanelProps) {
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
      }}>
        <h2 style={{ 
          fontSize: '1.5rem', 
          fontWeight: '600',
          color: '#111827',
        }}>
          System Health Snapshot
        </h2>
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

      {/* Section 4: Activity Today */}
      <div>
        <h3 style={{ 
          fontSize: '1rem', 
          fontWeight: '600',
          color: '#111827',
          marginBottom: '0.75rem',
        }}>
          Activity Today
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
              AI-Eligible Conversations
            </span>
            <span style={{ color: '#111827', fontSize: '1rem', fontFamily: 'monospace', fontWeight: '600' }}>
              {snapshot.activity_today.conversations_ai_eligible}
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
              Escalations
            </span>
            <span style={{ color: '#111827', fontSize: '1rem', fontFamily: 'monospace', fontWeight: '600' }}>
              {snapshot.activity_today.escalations}
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
              Drafts Generated
            </span>
            <span style={{ color: '#111827', fontSize: '1rem', fontFamily: 'monospace', fontWeight: '600' }}>
              {snapshot.activity_today.drafts_generated}
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
              Drafts Sent
            </span>
            <span style={{ color: '#111827', fontSize: '1rem', fontFamily: 'monospace', fontWeight: '600' }}>
              {snapshot.activity_today.drafts_sent}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

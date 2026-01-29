'use client';

import { useEffect, useState } from 'react';
import { fetchAIFeatureFlags } from '@/lib/adminApi';

interface AIStatusPanelProps {
  className?: string;
}

export default function AIStatusPanel({ className }: AIStatusPanelProps) {
  const [flags, setFlags] = useState<{
    ai_enabled: boolean;
    ai_whatsapp_enabled: boolean;
  } | null>(null);
  const [emergencyDisabled, setEmergencyDisabled] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAIFeatureFlags()
      .then((data) => {
        if (data.ok) {
          setFlags(data.flags);
          setEmergencyDisabled(data.emergency_disabled || false);
        } else {
          setError('Failed to fetch AI status');
        }
      })
      .catch((err) => {
        setError(err.message || 'Failed to fetch AI status');
      });
  }, []);

  if (error) {
    return (
      <div style={{ 
        border: '1px solid #e5e7eb', 
        borderRadius: '0.5rem', 
        padding: '1.5rem',
        backgroundColor: '#ffffff',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        ...(className ? {} : {}),
      }}>
        <div style={{ color: '#dc2626', fontSize: '0.875rem' }}>
          {error}
        </div>
      </div>
    );
  }

  if (!flags) {
    return (
      <div style={{ 
        border: '1px solid #e5e7eb', 
        borderRadius: '0.5rem', 
        padding: '1.5rem',
        backgroundColor: '#ffffff',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
      }}>
        <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>
          Loading AI status...
        </div>
      </div>
    );
  }

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
        marginBottom: '1rem',
        borderBottom: '1px solid #e5e7eb',
        paddingBottom: '0.75rem',
      }}>
        <h2 style={{ 
          fontSize: '1.25rem', 
          fontWeight: '600',
          color: '#111827',
        }}>
          AI Status
        </h2>
      </div>

      {emergencyDisabled && (
        <div style={{
          padding: '0.75rem',
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '0.375rem',
          color: '#991b1b',
          fontSize: '0.875rem',
          fontWeight: '500',
          marginBottom: '1rem',
        }}>
          ⚠️ Emergency AI Disabled (ENV)
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
            Emergency Status
          </span>
          <span style={{
            display: 'inline-block',
            padding: '0.375rem 0.75rem',
            borderRadius: '0.375rem',
            backgroundColor: emergencyDisabled ? '#fee2e2' : '#d1fae5',
            color: emergencyDisabled ? '#991b1b' : '#065f46',
            fontSize: '0.875rem',
            fontWeight: '500',
            border: `1px solid ${emergencyDisabled ? '#fecaca' : '#a7f3d0'}`,
          }}>
            {emergencyDisabled ? 'ACTIVE' : 'INACTIVE'}
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
            AI Global
          </span>
          <span style={{
            display: 'inline-block',
            padding: '0.375rem 0.75rem',
            borderRadius: '0.375rem',
            backgroundColor: flags.ai_enabled ? '#d1fae5' : '#fee2e2',
            color: flags.ai_enabled ? '#065f46' : '#991b1b',
            fontSize: '0.875rem',
            fontWeight: '500',
            border: `1px solid ${flags.ai_enabled ? '#a7f3d0' : '#fecaca'}`,
          }}>
            {flags.ai_enabled ? 'ON' : 'OFF'}
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
            backgroundColor: flags.ai_whatsapp_enabled ? '#d1fae5' : '#fee2e2',
            color: flags.ai_whatsapp_enabled ? '#065f46' : '#991b1b',
            fontSize: '0.875rem',
            fontWeight: '500',
            border: `1px solid ${flags.ai_whatsapp_enabled ? '#a7f3d0' : '#fecaca'}`,
          }}>
            {flags.ai_whatsapp_enabled ? 'ON' : 'OFF'}
          </span>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import {
  connectCalendar,
  disconnectCalendar,
  syncCalendar,
  type InstructorCalendarConnection,
  type ConnectCalendarParams,
} from '@/lib/instructorApi';

interface CalendarConnectionPanelProps {
  connection: InstructorCalendarConnection | null;
  onConnectionChange: (connection?: InstructorCalendarConnection | null) => void;
}

export default function CalendarConnectionPanel({
  connection,
  onConnectionChange,
}: CalendarConnectionPanelProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authCode, setAuthCode] = useState('');
  const [calendarId, setCalendarId] = useState('');

  const handleConnect = async () => {
    if (!authCode.trim() || !calendarId.trim()) {
      setError('Please provide both auth code and calendar ID');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const params: ConnectCalendarParams = {
        auth_code: authCode.trim(),
        calendar_id: calendarId.trim(),
      };
      const newConnection = await connectCalendar(params);
      setAuthCode('');
      setCalendarId('');
      // Pass the connection object back to parent
      onConnectionChange(newConnection);
      window.location.reload();
    } catch (err: any) {
      setError(err.message || 'Failed to connect calendar');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect your calendar?')) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await disconnectCalendar();
      onConnectionChange(null);
      window.location.reload();
    } catch (err: any) {
      setError(err.message || 'Failed to disconnect calendar');
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    try {
      setLoading(true);
      setError(null);
      await syncCalendar();
      // Connection remains the same after sync
      onConnectionChange();
      window.location.reload();
    } catch (err: any) {
      setError(err.message || 'Failed to sync calendar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      border: '1px solid #e5e7eb',
      borderRadius: '0.5rem',
      padding: '1.5rem',
      backgroundColor: '#ffffff',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
      marginBottom: '1.5rem',
    }}>
      <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827', marginBottom: '1rem' }}>
        Calendar Connection
      </h2>

      {error && (
        <div style={{
          padding: '0.75rem',
          marginBottom: '1rem',
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '0.375rem',
          color: '#991b1b',
          fontSize: '0.875rem',
        }}>
          {error}
        </div>
      )}

      {connection ? (
        <div>
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ marginBottom: '0.5rem' }}>
              <strong style={{ color: '#374151' }}>Provider:</strong>{' '}
              <span style={{ color: '#6b7280' }}>
                {connection.provider || 'google'}
              </span>
            </div>
            {connection.calendar_id && (
              <div style={{ marginBottom: '0.5rem' }}>
                <strong style={{ color: '#374151' }}>Calendar ID:</strong>{' '}
                <span style={{ color: '#6b7280' }}>{connection.calendar_id}</span>
              </div>
            )}
            <div>
              <strong style={{ color: '#374151' }}>Status:</strong>{' '}
              <span style={{ color: '#059669', fontWeight: '500' }}>Connected</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleSync}
              disabled={loading}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '0.875rem',
                fontWeight: '500',
                opacity: loading ? 0.6 : 1,
                outline: 'none',
              }}
              onFocus={(e) => {
                if (!loading) {
                  e.currentTarget.style.outline = '2px solid #3b82f6';
                  e.currentTarget.style.outlineOffset = '2px';
                }
              }}
              onBlur={(e) => {
                e.currentTarget.style.outline = 'none';
              }}
              aria-label="Sync calendar"
            >
              {loading ? 'Syncing...' : 'Sync'}
            </button>

            <button
              type="button"
              onClick={handleDisconnect}
              disabled={loading}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '0.875rem',
                fontWeight: '500',
                opacity: loading ? 0.6 : 1,
                outline: 'none',
              }}
              onFocus={(e) => {
                if (!loading) {
                  e.currentTarget.style.outline = '2px solid #ef4444';
                  e.currentTarget.style.outlineOffset = '2px';
                }
              }}
              onBlur={(e) => {
                e.currentTarget.style.outline = 'none';
              }}
              aria-label="Disconnect calendar"
            >
              {loading ? 'Disconnecting...' : 'Disconnect'}
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div style={{ marginBottom: '1rem' }}>
            <strong style={{ color: '#374151' }}>Status:</strong>{' '}
            <span style={{ color: '#dc2626', fontWeight: '500' }}>Not connected</span>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label
              htmlFor="auth-code"
              style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#374151',
              }}
            >
              OAuth Authorization Code
            </label>
            <input
              id="auth-code"
              type="text"
              value={authCode}
              onChange={(e) => setAuthCode(e.target.value)}
              placeholder="Enter OAuth authorization code"
              disabled={loading}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                outline: 'none',
                opacity: loading ? 0.6 : 1,
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#3b82f6';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#d1d5db';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label
              htmlFor="calendar-id"
              style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#374151',
              }}
            >
              Calendar ID
            </label>
            <input
              id="calendar-id"
              type="text"
              value={calendarId}
              onChange={(e) => setCalendarId(e.target.value)}
              placeholder="Enter calendar ID (e.g., 'primary')"
              disabled={loading}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                outline: 'none',
                opacity: loading ? 0.6 : 1,
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#3b82f6';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#d1d5db';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>

          <button
            type="button"
            onClick={handleConnect}
            disabled={loading || !authCode.trim() || !calendarId.trim()}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: loading || !authCode.trim() || !calendarId.trim() ? 'not-allowed' : 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500',
              opacity: loading || !authCode.trim() || !calendarId.trim() ? 0.6 : 1,
              outline: 'none',
            }}
            onFocus={(e) => {
              if (!loading && authCode.trim() && calendarId.trim()) {
                e.currentTarget.style.outline = '2px solid #3b82f6';
                e.currentTarget.style.outlineOffset = '2px';
              }
            }}
            onBlur={(e) => {
              e.currentTarget.style.outline = 'none';
            }}
            aria-label="Connect calendar"
          >
            {loading ? 'Connecting...' : 'Connect'}
          </button>
        </div>
      )}
    </div>
  );
}

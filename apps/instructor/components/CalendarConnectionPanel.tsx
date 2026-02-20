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
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '20px',
      padding: '1.5rem',
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
      marginBottom: '1.5rem',
    }}>
      <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: 'rgba(226, 232, 240, 0.95)', marginBottom: '1rem' }}>
        Calendar Connection
      </h2>

      {error && (
        <div style={{
          padding: '0.75rem',
          marginBottom: '1rem',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          borderRadius: '0.375rem',
          color: 'rgba(252, 165, 165, 0.95)',
          fontSize: '0.875rem',
        }}>
          {error}
        </div>
      )}

      {connection ? (
        <div>
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ marginBottom: '0.5rem' }}>
              <strong style={{ color: 'rgba(226, 232, 240, 0.95)' }}>Provider:</strong>{' '}
              <span style={{ color: 'rgba(148, 163, 184, 0.9)' }}>
                {connection.provider || 'google'}
              </span>
            </div>
            {connection.calendar_id && (
              <div style={{ marginBottom: '0.5rem' }}>
                <strong style={{ color: 'rgba(226, 232, 240, 0.95)' }}>Calendar ID:</strong>{' '}
                <span style={{ color: 'rgba(148, 163, 184, 0.9)' }}>{connection.calendar_id}</span>
              </div>
            )}
            <div>
              <strong style={{ color: 'rgba(226, 232, 240, 0.95)' }}>Status:</strong>{' '}
              <span style={{ color: 'rgba(74, 222, 128, 0.95)', fontWeight: '500' }}>Connected</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleSync}
              disabled={loading}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: 'rgba(99, 102, 241, 0.2)',
                color: 'rgba(165, 180, 252, 1)',
                border: '1px solid rgba(99, 102, 241, 0.4)',
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
                backgroundColor: 'rgba(239, 68, 68, 0.2)',
                color: 'rgba(248, 113, 113, 0.95)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
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
            <strong style={{ color: 'rgba(226, 232, 240, 0.95)' }}>Status:</strong>{' '}
            <span style={{ color: 'rgba(248, 113, 113, 0.95)', fontWeight: '500' }}>Not connected</span>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label
              htmlFor="auth-code"
              style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: 'rgba(226, 232, 240, 0.95)',
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
                background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                color: 'rgba(226, 232, 240, 0.95)',
                outline: 'none',
                opacity: loading ? 0.6 : 1,
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#3b82f6';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
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
                color: 'rgba(226, 232, 240, 0.95)',
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
                background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                color: 'rgba(226, 232, 240, 0.95)',
                outline: 'none',
                opacity: loading ? 0.6 : 1,
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#3b82f6';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
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
              backgroundColor: 'rgba(99, 102, 241, 0.2)',
              color: 'rgba(165, 180, 252, 1)',
              border: '1px solid rgba(99, 102, 241, 0.4)',
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

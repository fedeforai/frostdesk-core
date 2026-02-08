'use client';

import { useState, useEffect, useCallback } from 'react';

const TOKEN_KEY = 'fd_admin_token';

export type AdminCheckStatus =
  | 'idle'
  | 'logged_out'
  | 'ok'
  | 'forbidden'
  | 'error';

export interface AdminCheckResult {
  status: AdminCheckStatus;
  label: string;
  tone: 'success' | 'danger' | 'muted';
  message?: string;
  refetch: () => void;
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function useAdminCheck(apiBaseUrl: string): AdminCheckResult {
  const [status, setStatus] = useState<AdminCheckStatus>('idle');
  const [message, setMessage] = useState<string | undefined>(undefined);

  const runCheck = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setStatus('logged_out');
      setMessage(undefined);
      return;
    }

    try {
      const res = await fetch(`${apiBaseUrl.replace(/\/$/, '')}/admin/check`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (res.status === 200) {
        setStatus('ok');
        setMessage(undefined);
        return;
      }
      if (res.status === 403) {
        setStatus('forbidden');
        setMessage(undefined);
        return;
      }

      let body: { error?: string; message?: string } = {};
      try {
        body = await res.json();
      } catch {
        body = {};
      }
      setStatus('error');
      setMessage(
        body.message || body.error || `HTTP ${res.status}` || 'Request failed'
      );
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Network error');
    }
  }, [apiBaseUrl]);

  useEffect(() => {
    runCheck();
  }, [runCheck]);

  const label =
    status === 'ok'
      ? 'Admin OK'
      : status === 'forbidden'
        ? 'Not authorized'
        : status === 'error'
          ? 'Auth error'
          : status === 'logged_out'
            ? 'Logged out'
            : 'Checking…';

  const tone: 'success' | 'danger' | 'muted' =
    status === 'ok'
      ? 'success'
      : status === 'forbidden' || status === 'error'
        ? 'danger'
        : 'muted';

  return {
    status,
    label,
    tone,
    message,
    refetch: runCheck,
  };
}

export function setAdminToken(token: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearAdminToken(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(TOKEN_KEY);
}

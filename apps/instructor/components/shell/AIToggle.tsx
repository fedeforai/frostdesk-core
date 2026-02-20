'use client';

import { useState, useEffect, useCallback } from 'react';
import { getAIFeatureStatus, setAIFeatureStatus } from '@/lib/instructorApi';

export interface AIToggleProps {
  onSuccessToast?: (message: string) => void;
  onErrorToast?: (message: string) => void;
  className?: string;
  /** When true, render compact (e.g. inside rail popover). */
  compact?: boolean;
}

export function AIToggle({ onSuccessToast, onErrorToast, className = '', compact }: AIToggleProps) {
  const [enabled, setEnabled] = useState<boolean>(false);
  const [canToggle, setCanToggle] = useState<boolean>(true);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAIFeatureStatus();
      setEnabled(res.enabled);
      setCanToggle(res.canToggle ?? true);
    } catch {
      setCanToggle(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleToggle() {
    if (!canToggle || acting || loading) return;
    const next = !enabled;
    const prev = enabled;
    setEnabled(next);
    setActing(true);
    try {
      await setAIFeatureStatus(next);
      onSuccessToast?.(next ? 'AI turned on' : 'AI turned off');
    } catch (e) {
      setEnabled(prev);
      const msg = e instanceof Error ? e.message : 'Failed to update';
      onErrorToast?.(msg);
    } finally {
      setActing(false);
    }
  }

  if (loading) {
    return (
      <div className={className} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: compact ? 12 : 13, color: 'rgba(148, 163, 184, 0.9)' }}>AI</span>
        <span style={{ fontSize: 11, color: 'rgba(148, 163, 184, 0.6)' }}>…</span>
      </div>
    );
  }

  const disabled = !canToggle || acting;
  const toggleTitle = !canToggle
    ? 'You cannot change this setting'
    : enabled
      ? 'AI is on (click to turn off)'
      : 'AI is off (click to turn on)';

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: compact ? 6 : 8,
      }}
    >
      <span
        style={{
          fontSize: compact ? 12 : 13,
          color: disabled ? 'rgba(148, 163, 184, 0.6)' : 'rgba(226, 232, 240, 0.95)',
        }}
      >
        AI
      </span>
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        title={toggleTitle}
        aria-label={toggleTitle}
        aria-pressed={enabled}
        style={{
          position: 'relative',
          width: compact ? 32 : 40,
          height: compact ? 18 : 22,
          borderRadius: 11,
          border: '1px solid rgba(148, 163, 184, 0.4)',
          background: enabled ? '#22c55e' : 'rgba(51, 65, 85, 0.8)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.7 : 1,
          flexShrink: 0,
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 2,
            left: enabled ? (compact ? 16 : 22) : 2,
            width: compact ? 12 : 16,
            height: compact ? 12 : 16,
            borderRadius: '50%',
            background: '#fff',
            transition: 'left 0.2s ease',
          }}
        />
      </button>
      {!compact && (
        <span style={{ fontSize: 11, color: 'rgba(148, 163, 184, 0.8)' }}>
          {enabled ? 'ON' : 'OFF'}
        </span>
      )}
    </div>
  );
}

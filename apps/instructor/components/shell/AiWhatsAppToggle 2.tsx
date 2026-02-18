'use client';

import { useState, useEffect, useCallback } from 'react';
import { getAIFeatureStatus, setAIWhatsAppEnabled } from '@/lib/instructorApi';

export interface AiWhatsAppToggleProps {
  onSuccessToast?: (message: string) => void;
  onErrorToast?: (message: string) => void;
  className?: string;
  compact?: boolean;
}

export function AiWhatsAppToggle({
  onSuccessToast,
  onErrorToast,
  className = '',
  compact,
}: AiWhatsAppToggleProps) {
  const [enabled, setEnabled] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAIFeatureStatus();
      setEnabled(res.ai_whatsapp_enabled ?? false);
    } catch {
      setEnabled(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleToggle() {
    if (acting || loading) return;
    const next = !enabled;
    const prev = enabled;
    setEnabled(next);
    setActing(true);
    try {
      const result = await setAIWhatsAppEnabled(next);
      setEnabled(result.enabled);
      onSuccessToast?.(result.enabled ? 'AI WhatsApp is ON' : 'AI WhatsApp is OFF');
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
        <span style={{ fontSize: compact ? 12 : 13, color: 'rgba(148, 163, 184, 0.9)' }}>
          AI WhatsApp
        </span>
        <span style={{ fontSize: 11, color: 'rgba(148, 163, 184, 0.6)' }}>…</span>
      </div>
    );
  }

  const disabled = acting;
  const title = enabled
    ? 'AI WhatsApp is ON. Click to turn off.'
    : 'AI WhatsApp is OFF. Click to turn on.';

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: compact ? 6 : 8,
      }}
      role="group"
      aria-label="AI WhatsApp automation"
    >
      <span
        style={{
          fontSize: compact ? 12 : 13,
          color: disabled ? 'rgba(148, 163, 184, 0.6)' : 'rgba(226, 232, 240, 0.95)',
        }}
      >
        AI WhatsApp
      </span>
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        title={title}
        aria-label={title}
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
        <span
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: enabled ? 'rgba(74, 222, 128, 0.95)' : 'rgba(148, 163, 184, 0.9)',
          }}
          aria-hidden
        >
          {enabled ? 'ON' : 'OFF'}
        </span>
      )}
    </div>
  );
}

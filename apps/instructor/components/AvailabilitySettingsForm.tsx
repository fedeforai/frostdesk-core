'use client';

import { useState, useEffect, useCallback } from 'react';
import type { AvailabilitySettings } from '@/lib/instructorApi';
import { fetchAvailabilitySettings, updateAvailabilitySettings } from '@/lib/instructorApi';

const sectionStyle: React.CSSProperties = {
  backgroundColor: '#f9fafb',
  borderRadius: '0.5rem',
  padding: '1rem',
  marginBottom: '1rem',
  border: '1px solid #e5e7eb',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: '0.25rem',
  fontSize: '0.875rem',
  fontWeight: '500',
  color: '#374151',
};

const helpTextStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  color: '#6b7280',
  marginBottom: '0.5rem',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.5rem',
  border: '1px solid #d1d5db',
  borderRadius: '0.375rem',
  fontSize: '1rem',
  backgroundColor: '#ffffff',
  color: '#111827',
};

const buttonStyle: React.CSSProperties = {
  padding: '0.5rem 1rem',
  backgroundColor: '#3b82f6',
  color: '#ffffff',
  border: 'none',
  borderRadius: '0.375rem',
  fontSize: '0.875rem',
  fontWeight: '500',
  cursor: 'pointer',
};

const disabledButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  backgroundColor: '#9ca3af',
  cursor: 'not-allowed',
};

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: '1rem',
};

export default function AvailabilitySettingsForm() {
  const [settings, setSettings] = useState<AvailabilitySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [bufferBefore, setBufferBefore] = useState(0);
  const [bufferAfter, setBufferAfter] = useState(15);
  const [minNotice, setMinNotice] = useState(24);
  const [slotDuration, setSlotDuration] = useState(60);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAvailabilitySettings();
      setSettings(data);
      setBufferBefore(data.buffer_before_minutes);
      setBufferAfter(data.buffer_after_minutes);
      setMinNotice(data.min_notice_hours);
      setSlotDuration(data.slot_duration_minutes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const updated = await updateAvailabilitySettings({
        buffer_before_minutes: bufferBefore,
        buffer_after_minutes: bufferAfter,
        min_notice_hours: minNotice,
        slot_duration_minutes: slotDuration,
      });
      setSettings(updated);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const hasChanges =
    settings &&
    (bufferBefore !== settings.buffer_before_minutes ||
      bufferAfter !== settings.buffer_after_minutes ||
      minNotice !== settings.min_notice_hours ||
      slotDuration !== settings.slot_duration_minutes);

  if (loading) {
    return (
      <div>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#111827', marginBottom: '0.75rem' }}>
          Impostazioni Disponibilità
        </h2>
        <p style={{ color: '#6b7280' }}>Caricamento...</p>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#111827', marginBottom: '0.75rem' }}>
        Impostazioni Disponibilità
      </h2>
      <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1rem' }}>
        Configura buffer tra lezioni e preavviso minimo per le prenotazioni.
      </p>

      {error && (
        <div
          style={{
            padding: '0.75rem',
            backgroundColor: '#fee2e2',
            borderRadius: '0.375rem',
            color: '#dc2626',
            marginBottom: '1rem',
            fontSize: '0.875rem',
          }}
        >
          {error}
        </div>
      )}

      {success && (
        <div
          style={{
            padding: '0.75rem',
            backgroundColor: '#d1fae5',
            borderRadius: '0.375rem',
            color: '#059669',
            marginBottom: '1rem',
            fontSize: '0.875rem',
          }}
        >
          Impostazioni salvate con successo!
        </div>
      )}

      <div style={sectionStyle}>
        <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: '1rem', color: '#111827' }}>
          Buffer tra prenotazioni
        </h3>
        <div style={gridStyle}>
          <div>
            <label style={labelStyle}>Buffer prima (minuti)</label>
            <p style={helpTextStyle}>Tempo necessario prima di ogni lezione (es. preparazione)</p>
            <input
              type="number"
              min={0}
              max={120}
              value={bufferBefore}
              onChange={(e) => setBufferBefore(Math.max(0, parseInt(e.target.value) || 0))}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Buffer dopo (minuti)</label>
            <p style={helpTextStyle}>Tempo necessario dopo ogni lezione (es. spostamento, note)</p>
            <input
              type="number"
              min={0}
              max={120}
              value={bufferAfter}
              onChange={(e) => setBufferAfter(Math.max(0, parseInt(e.target.value) || 0))}
              style={inputStyle}
            />
          </div>
        </div>
      </div>

      <div style={sectionStyle}>
        <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: '1rem', color: '#111827' }}>
          Preavviso e durata
        </h3>
        <div style={gridStyle}>
          <div>
            <label style={labelStyle}>Preavviso minimo (ore)</label>
            <p style={helpTextStyle}>Quanto anticipo richiedi per le prenotazioni</p>
            <input
              type="number"
              min={0}
              max={168}
              value={minNotice}
              onChange={(e) => setMinNotice(Math.max(0, parseInt(e.target.value) || 0))}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Durata slot (minuti)</label>
            <p style={helpTextStyle}>Durata predefinita degli slot di disponibilità</p>
            <input
              type="number"
              min={15}
              max={480}
              step={15}
              value={slotDuration}
              onChange={(e) => setSlotDuration(Math.max(15, parseInt(e.target.value) || 60))}
              style={inputStyle}
            />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
        <button
          onClick={handleSave}
          disabled={saving || !hasChanges}
          style={saving || !hasChanges ? disabledButtonStyle : buttonStyle}
        >
          {saving ? 'Salvataggio...' : 'Salva impostazioni'}
        </button>
      </div>
    </div>
  );
}

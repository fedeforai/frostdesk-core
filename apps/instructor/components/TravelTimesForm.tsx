'use client';

import { useState, useEffect, useCallback } from 'react';
import type {
  MeetingPointTravelTime,
  UpsertTravelTimeParams,
  InstructorMeetingPoint,
} from '@/lib/instructorApi';
import {
  fetchTravelTimes,
  fetchDefaultTravelTime,
  upsertTravelTime,
  setDefaultTravelBuffer,
  deleteTravelTime,
  fetchInstructorMeetingPoints,
} from '@/lib/instructorApi';

const sectionStyle: React.CSSProperties = {
  backgroundColor: '#f9fafb',
  borderRadius: '0.5rem',
  padding: '1rem',
  marginBottom: '1rem',
  border: '1px solid #e5e7eb',
};

const titleStyle: React.CSSProperties = {
  fontSize: '1rem',
  fontWeight: '600',
  marginBottom: '0.75rem',
  color: '#111827',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: '0.5rem',
  fontSize: '0.875rem',
  fontWeight: '500',
  color: '#374151',
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
  borderRadius: '0.375rem',
  fontWeight: '500',
  cursor: 'pointer',
  border: 'none',
  transition: 'all 0.2s',
};

interface DefaultBufferEditorProps {
  currentMinutes: number;
  onSave: (minutes: number) => Promise<void>;
  loading: boolean;
}

function DefaultBufferEditor({ currentMinutes, onSave, loading }: DefaultBufferEditorProps) {
  const [editing, setEditing] = useState(false);
  const [minutes, setMinutes] = useState(currentMinutes);

  useEffect(() => {
    setMinutes(currentMinutes);
  }, [currentMinutes]);

  const handleSave = async () => {
    await onSave(minutes);
    setEditing(false);
  };

  return (
    <div style={sectionStyle}>
      <h3 style={titleStyle}>Buffer di Default</h3>
      <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1rem' }}>
        Tempo di spostamento applicato quando non è configurata una rotta specifica
      </p>

      {editing ? (
        <div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>Minuti</label>
            <input
              type="number"
              min="0"
              value={minutes}
              onChange={(e) => setMinutes(parseInt(e.target.value) || 0)}
              style={{ ...inputStyle, maxWidth: '150px' }}
              disabled={loading}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={handleSave}
              disabled={loading}
              style={{
                ...buttonStyle,
                backgroundColor: '#3b82f6',
                color: 'white',
              }}
            >
              Salva
            </button>
            <button
              type="button"
              onClick={() => {
                setMinutes(currentMinutes);
                setEditing(false);
              }}
              disabled={loading}
              style={{
                ...buttonStyle,
                backgroundColor: '#e5e7eb',
                color: '#374151',
              }}
            >
              Annulla
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ color: '#111827', fontSize: '1.5rem', fontWeight: '600' }}>
            {currentMinutes} min
          </span>
          <button
            type="button"
            onClick={() => setEditing(true)}
            disabled={loading}
            style={{
              ...buttonStyle,
              backgroundColor: '#dbeafe',
              color: '#1d4ed8',
            }}
          >
            Modifica
          </button>
        </div>
      )}
    </div>
  );
}

interface TravelTimeRowProps {
  travelTime: MeetingPointTravelTime;
  meetingPoints: InstructorMeetingPoint[];
  onDelete: (id: string) => Promise<void>;
  loading: boolean;
}

function TravelTimeRow({ travelTime, meetingPoints, onDelete, loading }: TravelTimeRowProps) {
  const fromPoint = meetingPoints.find((mp) => mp.id === travelTime.from_meeting_point_id);
  const toPoint = meetingPoints.find((mp) => mp.id === travelTime.to_meeting_point_id);

  const fromName = fromPoint?.name || 'Qualsiasi';
  const toName = toPoint?.name || 'Qualsiasi';

  return (
    <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
      <td style={{ padding: '0.75rem', color: '#374151' }}>{fromName}</td>
      <td style={{ padding: '0.75rem', color: '#374151' }}>{toName}</td>
      <td style={{ padding: '0.75rem', color: '#374151', textAlign: 'center' }}>
        {travelTime.travel_minutes} min
      </td>
      <td style={{ padding: '0.75rem', textAlign: 'right' }}>
        <button
          type="button"
          onClick={() => onDelete(travelTime.id)}
          disabled={loading}
          style={{
            ...buttonStyle,
            backgroundColor: '#fee2e2',
            color: '#991b1b',
            padding: '0.25rem 0.75rem',
            fontSize: '0.875rem',
          }}
        >
          Elimina
        </button>
      </td>
    </tr>
  );
}

interface AddTravelTimeFormProps {
  meetingPoints: InstructorMeetingPoint[];
  existingTimes: MeetingPointTravelTime[];
  onAdd: (params: UpsertTravelTimeParams) => Promise<void>;
  loading: boolean;
}

function AddTravelTimeForm({ meetingPoints, existingTimes, onAdd, loading }: AddTravelTimeFormProps) {
  const [fromId, setFromId] = useState<string>('');
  const [toId, setToId] = useState<string>('');
  const [minutes, setMinutes] = useState<number>(15);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const exists = existingTimes.some(
      (t) =>
        (t.from_meeting_point_id === (fromId || null)) &&
        (t.to_meeting_point_id === (toId || null)) &&
        !t.is_default
    );

    if (exists) {
      setError('Questa combinazione esiste già');
      return;
    }

    try {
      await onAdd({
        from_meeting_point_id: fromId || null,
        to_meeting_point_id: toId || null,
        travel_minutes: minutes,
        is_default: false,
      });
      setFromId('');
      setToId('');
      setMinutes(15);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Errore';
      setError(errorMessage);
    }
  };

  if (meetingPoints.length === 0) {
    return (
      <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
        Aggiungi dei punti di incontro per configurare i tempi di spostamento specifici.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: '1rem' }}>
      {error && (
        <div
          style={{
            marginBottom: '1rem',
            padding: '0.75rem',
            backgroundColor: '#fee2e2',
            color: '#991b1b',
            borderRadius: '0.375rem',
            border: '1px solid #fecaca',
          }}
        >
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 100px auto', gap: '1rem', alignItems: 'end' }}>
        <div>
          <label style={labelStyle}>Da</label>
          <select
            value={fromId}
            onChange={(e) => setFromId(e.target.value)}
            style={inputStyle}
            disabled={loading}
          >
            <option value="">Qualsiasi</option>
            {meetingPoints.map((mp) => (
              <option key={mp.id} value={mp.id}>
                {mp.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>A</label>
          <select
            value={toId}
            onChange={(e) => setToId(e.target.value)}
            style={inputStyle}
            disabled={loading}
          >
            <option value="">Qualsiasi</option>
            {meetingPoints.map((mp) => (
              <option key={mp.id} value={mp.id}>
                {mp.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Minuti</label>
          <input
            type="number"
            min="0"
            value={minutes}
            onChange={(e) => setMinutes(parseInt(e.target.value) || 0)}
            style={inputStyle}
            disabled={loading}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          style={{
            ...buttonStyle,
            backgroundColor: '#3b82f6',
            color: 'white',
            height: 'fit-content',
          }}
        >
          Aggiungi
        </button>
      </div>
    </form>
  );
}

export default function TravelTimesForm() {
  const [travelTimes, setTravelTimes] = useState<MeetingPointTravelTime[]>([]);
  const [defaultMinutes, setDefaultMinutes] = useState<number>(0);
  const [meetingPoints, setMeetingPoints] = useState<InstructorMeetingPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [timesData, defaultData, mpData] = await Promise.all([
        fetchTravelTimes(),
        fetchDefaultTravelTime(),
        fetchInstructorMeetingPoints(),
      ]);
      setTravelTimes(timesData.filter((t) => !t.is_default));
      setDefaultMinutes(defaultData.default_minutes);
      setMeetingPoints(mpData);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Errore nel caricamento';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSetDefault = async (minutes: number) => {
    setSaving(true);
    setError(null);
    try {
      await setDefaultTravelBuffer(minutes);
      setDefaultMinutes(minutes);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Errore nel salvataggio';
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleAddTravelTime = async (params: UpsertTravelTimeParams) => {
    setSaving(true);
    setError(null);
    try {
      const newTime = await upsertTravelTime(params);
      setTravelTimes((prev) => [...prev, newTime]);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Errore nel salvataggio';
      setError(errorMessage);
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTravelTime = async (id: string) => {
    if (!confirm('Sei sicuro di voler eliminare questo tempo di spostamento?')) return;
    setSaving(true);
    setError(null);
    try {
      await deleteTravelTime(id);
      setTravelTimes((prev) => prev.filter((t) => t.id !== id));
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Errore nella cancellazione';
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', color: '#6b7280' }}>
        Caricamento tempi di spostamento...
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ ...titleStyle, fontSize: '1.125rem', marginBottom: '1rem' }}>Tempi di Spostamento</h2>

      {error && (
        <div
          role="alert"
          style={{
            marginBottom: '1rem',
            padding: '0.75rem',
            backgroundColor: '#fee2e2',
            color: '#991b1b',
            borderRadius: '0.375rem',
            border: '1px solid #fecaca',
          }}
        >
          {error}
        </div>
      )}

      <DefaultBufferEditor
        currentMinutes={defaultMinutes}
        onSave={handleSetDefault}
        loading={saving}
      />

      <div style={sectionStyle}>
        <h3 style={titleStyle}>Tempi Specifici per Rotta</h3>
        <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1rem' }}>
          Configura tempi di spostamento specifici tra punti di incontro
        </p>

        {travelTimes.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #d1d5db' }}>
                <th style={{ padding: '0.75rem', textAlign: 'left', color: '#374151', fontWeight: '500' }}>
                  Da
                </th>
                <th style={{ padding: '0.75rem', textAlign: 'left', color: '#374151', fontWeight: '500' }}>
                  A
                </th>
                <th style={{ padding: '0.75rem', textAlign: 'center', color: '#374151', fontWeight: '500' }}>
                  Tempo
                </th>
                <th style={{ padding: '0.75rem', width: '100px' }}></th>
              </tr>
            </thead>
            <tbody>
              {travelTimes.map((tt) => (
                <TravelTimeRow
                  key={tt.id}
                  travelTime={tt}
                  meetingPoints={meetingPoints}
                  onDelete={handleDeleteTravelTime}
                  loading={saving}
                />
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
            Nessun tempo di spostamento specifico configurato.
          </p>
        )}

        <AddTravelTimeForm
          meetingPoints={meetingPoints}
          existingTimes={travelTimes}
          onAdd={handleAddTravelTime}
          loading={saving}
        />
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import type { InstructorService, CreateInstructorServiceParams, UpdateInstructorServiceParams, LessonType } from '@/lib/instructorApi';
import { createInstructorService, updateInstructorService } from '@/lib/instructorApi';

const LESSON_TYPES: { value: LessonType; label: string; description: string }[] = [
  { value: 'private', label: 'Private', description: 'Just you and the instructor' },
  { value: 'semi_private', label: 'Semi-private', description: '2–4 participants' },
  { value: 'group', label: 'Group', description: '5+ participants' },
];

const DURATION_PRESETS = [30, 60, 90, 120, 180, 240, 360, 480];
const CURRENCIES = [{ value: 'EUR', label: 'EUR (€)' }, { value: 'CHF', label: 'CHF' }, { value: 'USD', label: 'USD ($)' }];

const defaultParticipants = (lessonType: LessonType): { min: number; max: number } => {
  if (lessonType === 'private') return { min: 1, max: 1 };
  if (lessonType === 'semi_private') return { min: 2, max: 4 };
  return { min: 5, max: 12 };
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  fontWeight: 600,
  color: '#6b7280',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: '0.75rem',
  marginTop: '1.25rem',
};
const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: '0.5rem',
  fontSize: '0.875rem',
  fontWeight: 500,
  color: '#374151',
};
const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.5rem 0.75rem',
  border: '1px solid #d1d5db',
  borderRadius: '0.375rem',
  fontSize: '1rem',
  outline: 'none',
};

interface ServiceFormProps {
  service?: InstructorService | null;
  onCancel: () => void;
  onSuccess: () => void;
}

export default function ServiceForm({ service, onCancel, onSuccess }: ServiceFormProps) {
  const [name, setName] = useState(service?.name ?? service?.discipline ?? '');
  const [discipline, setDiscipline] = useState(service?.discipline ?? '');
  const [lessonType, setLessonType] = useState<LessonType>(service?.lesson_type ?? 'private');
  const [durationMinutes, setDurationMinutes] = useState(service?.duration_minutes?.toString() ?? '120');
  const [minParticipants, setMinParticipants] = useState(service?.min_participants?.toString() ?? '1');
  const [maxParticipants, setMaxParticipants] = useState(service?.max_participants?.toString() ?? '1');
  const [priceAmount, setPriceAmount] = useState(service?.price_amount?.toString() ?? '');
  const [currency, setCurrency] = useState(service?.currency || 'EUR');
  const [shortDescription, setShortDescription] = useState(service?.short_description ?? '');
  const [location, setLocation] = useState(service?.location ?? '');
  const [notes, setNotes] = useState(service?.notes ?? '');
  const [isActive, setIsActive] = useState(service?.is_active ?? true);
  const [sortOrder, setSortOrder] = useState(service?.sort_order?.toString() ?? '0');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (service) {
      setName(service.name ?? service.discipline);
      setDiscipline(service.discipline);
      setLessonType(service.lesson_type ?? 'private');
      setDurationMinutes(service.duration_minutes.toString());
      setMinParticipants(service.min_participants.toString());
      setMaxParticipants(service.max_participants.toString());
      setPriceAmount(service.price_amount.toString());
      setCurrency(service.currency);
      setShortDescription(service.short_description ?? '');
      setLocation(service.location ?? '');
      setNotes(service.notes ?? '');
      setIsActive(service.is_active);
      setSortOrder(service.sort_order.toString());
    }
  }, [service]);

  useEffect(() => {
    const { min, max } = defaultParticipants(lessonType);
    setMinParticipants(String(min));
    setMaxParticipants(String(max));
  }, [lessonType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!discipline.trim() || !durationMinutes.trim() || !priceAmount.trim() || !currency.trim()) {
      setError('Please fill in all required fields.');
      return;
    }
    const durationNum = Number(durationMinutes);
    const priceNum = Number(priceAmount);
    const minNum = Number(minParticipants);
    const maxNum = Number(maxParticipants);
    if (isNaN(durationNum) || durationNum < 30 || durationNum > 480) {
      setError('Duration must be between 30 and 480 minutes.');
      return;
    }
    if (isNaN(priceNum) || priceNum <= 0) {
      setError('Please enter a price greater than 0.');
      return;
    }
    if (minNum < 0 || maxNum < 1 || minNum > maxNum) {
      setError('Participants: min ≤ max and max ≥ 1.');
      return;
    }
    if (shortDescription.length > 200) {
      setError('Short description cannot exceed 200 characters.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (service) {
        const params: UpdateInstructorServiceParams = {
          name: name.trim() || discipline.trim(),
          discipline: discipline.trim(),
          lesson_type: lessonType,
          duration_minutes: durationNum,
          min_participants: minNum,
          max_participants: maxNum,
          price_amount: priceNum,
          currency,
          short_description: shortDescription.trim() || null,
          location: location.trim() || null,
          notes: notes.trim() || null,
          is_active: isActive,
          sort_order: Number(sortOrder) || 0,
        };
        await updateInstructorService(service.id, params);
      } else {
        const params: CreateInstructorServiceParams = {
          name: name.trim() || undefined,
          discipline: discipline.trim(),
          lesson_type: lessonType,
          duration_minutes: durationNum,
          min_participants: minNum,
          max_participants: maxNum,
          price_amount: priceNum,
          currency,
          short_description: shortDescription.trim() || undefined,
          location: location.trim() || undefined,
          notes: notes.trim() || undefined,
          sort_order: Number(sortOrder) || 0,
        };
        await createInstructorService(params);
      }
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Save failed.');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: '560px' }}>
      {error && (
        <div role="alert" aria-live="polite" style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#fef2f2', color: '#991b1b', borderRadius: '0.375rem', border: '1px solid #fecaca' }}>
          {error}
        </div>
      )}

      <h3 style={{ ...sectionTitleStyle, marginTop: 0 }}>What you offer</h3>
      <div style={{ marginBottom: '1rem' }}>
        <label htmlFor="name" style={labelStyle}>Service name *</label>
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Private ski lesson 2h"
          maxLength={80}
          disabled={loading}
          style={inputStyle}
          aria-required="true"
        />
      </div>
      <div style={{ marginBottom: '1rem' }}>
        <label htmlFor="discipline" style={labelStyle}>Discipline *</label>
        <input
          type="text"
          id="discipline"
          value={discipline}
          onChange={(e) => setDiscipline(e.target.value)}
          placeholder="e.g. Ski, Snowboard"
          disabled={loading}
          style={inputStyle}
          aria-required="true"
        />
      </div>
      <div style={{ marginBottom: '1rem' }}>
        <label htmlFor="location" style={labelStyle}>Location (where the activity takes place)</label>
        <input
          type="text"
          id="location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="e.g. Cortina d'Ampezzo, Sella Ronda, meeting point name"
          maxLength={120}
          disabled={loading}
          style={inputStyle}
        />
      </div>
      <div style={{ marginBottom: '1rem' }}>
        <label style={labelStyle}>Lesson type *</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {LESSON_TYPES.map((opt) => (
            <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
              <input
                type="radio"
                name="lesson_type"
                value={opt.value}
                checked={lessonType === opt.value}
                onChange={() => setLessonType(opt.value)}
                disabled={loading}
              />
              <span style={{ fontWeight: 500 }}>{opt.label}</span>
              <span style={{ fontSize: '0.8125rem', color: '#6b7280' }}>— {opt.description}</span>
            </label>
          ))}
        </div>
      </div>

      <h3 style={sectionTitleStyle}>Duration and participants</h3>
      <div style={{ marginBottom: '1rem' }}>
        <label style={labelStyle}>Duration (minutes) *</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
          {DURATION_PRESETS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setDurationMinutes(String(m))}
              disabled={loading}
              style={{
                padding: '0.35rem 0.75rem',
                border: durationMinutes === String(m) ? '2px solid #2563eb' : '1px solid #d1d5db',
                borderRadius: '0.375rem',
                background: durationMinutes === String(m) ? '#eff6ff' : '#fff',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '0.875rem',
              }}
            >
              {m < 60 ? `${m} min` : `${m / 60} h`}
            </button>
          ))}
        </div>
        <input
          type="number"
          id="duration_minutes"
          value={durationMinutes}
          onChange={(e) => setDurationMinutes(e.target.value)}
          min={30}
          max={480}
          step={15}
          disabled={loading}
          style={inputStyle}
          aria-required="true"
        />
      </div>
      {lessonType !== 'private' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label htmlFor="min_participants" style={labelStyle}>Min participants</label>
            <input
              type="number"
              id="min_participants"
              value={minParticipants}
              onChange={(e) => setMinParticipants(e.target.value)}
              min={0}
              max={50}
              disabled={loading}
              style={inputStyle}
            />
          </div>
          <div>
            <label htmlFor="max_participants" style={labelStyle}>Max participants</label>
            <input
              type="number"
              id="max_participants"
              value={maxParticipants}
              onChange={(e) => setMaxParticipants(e.target.value)}
              min={1}
              max={50}
              disabled={loading}
              style={inputStyle}
            />
          </div>
        </div>
      )}

      <h3 style={sectionTitleStyle}>Price</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: '1rem', marginBottom: '1rem' }}>
        <div>
          <label htmlFor="price_amount" style={labelStyle}>Price *</label>
          <input
            type="number"
            id="price_amount"
            value={priceAmount}
            onChange={(e) => setPriceAmount(e.target.value)}
            min={0}
            step={0.01}
            disabled={loading}
            style={inputStyle}
            aria-required="true"
          />
        </div>
        <div>
          <label htmlFor="currency" style={labelStyle}>Currency *</label>
          <select
            id="currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            disabled={loading}
            style={inputStyle}
            aria-required="true"
          >
            {CURRENCIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
      </div>

      <h3 style={sectionTitleStyle}>Details (optional)</h3>
      <div style={{ marginBottom: '1rem' }}>
        <label htmlFor="short_description" style={labelStyle}>Short description (for clients)</label>
        <textarea
          id="short_description"
          value={shortDescription}
          onChange={(e) => setShortDescription(e.target.value)}
          maxLength={200}
          disabled={loading}
          rows={2}
          style={{ ...inputStyle, resize: 'vertical' }}
        />
        <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{shortDescription.length}/200</span>
      </div>
      <div style={{ marginBottom: '1rem' }}>
        <label htmlFor="notes" style={labelStyle}>Internal notes (for you only)</label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={loading}
          rows={2}
          style={{ ...inputStyle, resize: 'vertical' }}
        />
      </div>

      {service && (
        <>
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="sort_order" style={labelStyle}>List order</label>
            <input
              type="number"
              id="sort_order"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              min={0}
              disabled={loading}
              style={{ ...inputStyle, width: '80px' }}
            />
          </div>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                disabled={loading}
              />
              <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Service active (visible to clients)</span>
            </label>
          </div>
        </>
      )}

      <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          style={{ padding: '0.5rem 1rem', backgroundColor: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: '0.375rem', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '1rem' }}
          aria-label="Cancel"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading || !discipline.trim() || !durationMinutes.trim() || !priceAmount.trim()}
          style={{ padding: '0.5rem 1rem', backgroundColor: loading ? '#9ca3af' : '#2563eb', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '1rem', fontWeight: 500 }}
          aria-label="Save service"
        >
          {loading ? 'Saving...' : 'Save service'}
        </button>
      </div>
    </form>
  );
}

'use client';

import { useState, useEffect } from 'react';
import type { InstructorService, CreateInstructorServiceParams, UpdateInstructorServiceParams } from '@/lib/instructorApi';
import { createInstructorService, updateInstructorService } from '@/lib/instructorApi';

interface ServiceFormProps {
  service?: InstructorService | null;
  onCancel: () => void;
  onSuccess: () => void;
}

export default function ServiceForm({ service, onCancel, onSuccess }: ServiceFormProps) {
  const [discipline, setDiscipline] = useState(service?.discipline || '');
  const [durationMinutes, setDurationMinutes] = useState(service?.duration_minutes?.toString() || '');
  const [priceAmount, setPriceAmount] = useState(service?.price_amount?.toString() || '');
  const [currency, setCurrency] = useState(service?.currency || '');
  const [notes, setNotes] = useState(service?.notes || '');
  const [isActive, setIsActive] = useState(service?.is_active ?? true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (service) {
      setDiscipline(service.discipline);
      setDurationMinutes(service.duration_minutes.toString());
      setPriceAmount(service.price_amount.toString());
      setCurrency(service.currency);
      setNotes(service.notes || '');
      setIsActive(service.is_active);
    }
  }, [service]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!discipline.trim() || !durationMinutes.trim() || !priceAmount.trim() || !currency.trim()) {
      setError('All required fields must be filled');
      return;
    }

    const durationNum = Number(durationMinutes);
    const priceNum = Number(priceAmount);

    if (isNaN(durationNum) || durationNum <= 0) {
      setError('Duration must be a positive number');
      return;
    }

    if (isNaN(priceNum) || priceNum <= 0) {
      setError('Price must be a positive number');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (service) {
        // Update existing service
        const params: UpdateInstructorServiceParams = {
          discipline: discipline.trim(),
          duration_minutes: durationNum,
          price_amount: priceNum,
          currency: currency.trim(),
          notes: notes.trim() || null,
          is_active: isActive,
        };
        await updateInstructorService(service.id, params);
      } else {
        // Create new service
        const params: CreateInstructorServiceParams = {
          discipline: discipline.trim(),
          duration_minutes: durationNum,
          price_amount: priceNum,
          currency: currency.trim(),
          notes: notes.trim() || null,
        };
        await createInstructorService(params);
      }
      onSuccess();
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to save service';
      setError(errorMessage);
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: '600px' }}>
      {error && (
        <div
          role="alert"
          aria-live="polite"
          style={{
            marginBottom: '1rem',
            padding: '0.75rem',
            backgroundColor: '#fee2e2',
            color: '#991b1b',
            borderRadius: '0.375rem',
            border: '1px solid #fca5a5',
          }}
        >
          {error}
        </div>
      )}

      <div style={{ marginBottom: '1rem' }}>
        <label
          htmlFor="discipline"
          style={{
            display: 'block',
            marginBottom: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: '500',
            color: '#374151',
          }}
        >
          Discipline *
        </label>
        <input
          type="text"
          id="discipline"
          value={discipline}
          onChange={(e) => setDiscipline(e.target.value)}
          required
          disabled={loading}
          style={{
            width: '100%',
            padding: '0.5rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.375rem',
            fontSize: '1rem',
            outline: 'none',
          }}
          onFocus={(e) => {
            e.currentTarget.style.outline = '2px solid #3b82f6';
            e.currentTarget.style.outlineOffset = '2px';
          }}
          onBlur={(e) => {
            e.currentTarget.style.outline = 'none';
          }}
          aria-required="true"
        />
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label
          htmlFor="duration_minutes"
          style={{
            display: 'block',
            marginBottom: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: '500',
            color: '#374151',
          }}
        >
          Duration (minutes) *
        </label>
        <input
          type="number"
          id="duration_minutes"
          value={durationMinutes}
          onChange={(e) => setDurationMinutes(e.target.value)}
          required
          min="1"
          disabled={loading}
          style={{
            width: '100%',
            padding: '0.5rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.375rem',
            fontSize: '1rem',
            outline: 'none',
          }}
          onFocus={(e) => {
            e.currentTarget.style.outline = '2px solid #3b82f6';
            e.currentTarget.style.outlineOffset = '2px';
          }}
          onBlur={(e) => {
            e.currentTarget.style.outline = 'none';
          }}
          aria-required="true"
        />
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label
          htmlFor="price_amount"
          style={{
            display: 'block',
            marginBottom: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: '500',
            color: '#374151',
          }}
        >
          Price *
        </label>
        <input
          type="number"
          id="price_amount"
          value={priceAmount}
          onChange={(e) => setPriceAmount(e.target.value)}
          required
          min="0"
          step="0.01"
          disabled={loading}
          style={{
            width: '100%',
            padding: '0.5rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.375rem',
            fontSize: '1rem',
            outline: 'none',
          }}
          onFocus={(e) => {
            e.currentTarget.style.outline = '2px solid #3b82f6';
            e.currentTarget.style.outlineOffset = '2px';
          }}
          onBlur={(e) => {
            e.currentTarget.style.outline = 'none';
          }}
          aria-required="true"
        />
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label
          htmlFor="currency"
          style={{
            display: 'block',
            marginBottom: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: '500',
            color: '#374151',
          }}
        >
          Currency *
        </label>
        <input
          type="text"
          id="currency"
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          required
          disabled={loading}
          style={{
            width: '100%',
            padding: '0.5rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.375rem',
            fontSize: '1rem',
            outline: 'none',
          }}
          onFocus={(e) => {
            e.currentTarget.style.outline = '2px solid #3b82f6';
            e.currentTarget.style.outlineOffset = '2px';
          }}
          onBlur={(e) => {
            e.currentTarget.style.outline = 'none';
          }}
          aria-required="true"
        />
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label
          htmlFor="notes"
          style={{
            display: 'block',
            marginBottom: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: '500',
            color: '#374151',
          }}
        >
          Notes
        </label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={loading}
          rows={3}
          style={{
            width: '100%',
            padding: '0.5rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.375rem',
            fontSize: '1rem',
            outline: 'none',
            fontFamily: 'inherit',
            resize: 'vertical',
          }}
          onFocus={(e) => {
            e.currentTarget.style.outline = '2px solid #3b82f6';
            e.currentTarget.style.outlineOffset = '2px';
          }}
          onBlur={(e) => {
            e.currentTarget.style.outline = 'none';
          }}
        />
      </div>

      {service && (
        <div style={{ marginBottom: '1.5rem' }}>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#374151',
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              disabled={loading}
              style={{
                width: '1rem',
                height: '1rem',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            />
            Active
          </label>
        </div>
      )}

      <div style={{ display: 'flex', gap: '1rem' }}>
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#f3f4f6',
            color: '#374151',
            border: '1px solid #d1d5db',
            borderRadius: '0.375rem',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '1rem',
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
          aria-label="Cancel"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading || !discipline.trim() || !durationMinutes.trim() || !priceAmount.trim() || !currency.trim()}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: loading ? '#d1d5db' : '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '0.375rem',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '1rem',
            fontWeight: '500',
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
          aria-label="Save service"
        >
          {loading ? 'Saving...' : 'Save'}
        </button>
      </div>
    </form>
  );
}

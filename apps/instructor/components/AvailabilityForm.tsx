'use client';

import { useState, useEffect } from 'react';
import type { InstructorAvailability, InstructorMeetingPoint, CreateAvailabilityParams, UpdateAvailabilityParams } from '@/lib/instructorApi';
import { createAvailability, updateAvailability } from '@/lib/instructorApi';

interface AvailabilityFormProps {
  availability?: InstructorAvailability | null;
  meetingPoints?: InstructorMeetingPoint[];
  onCancel: () => void;
  onSuccess: () => void;
}

const dayOptions = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

export default function AvailabilityForm({ availability, meetingPoints = [], onCancel, onSuccess }: AvailabilityFormProps) {
  const [dayOfWeek, setDayOfWeek] = useState(availability?.day_of_week?.toString() || '0');
  const [startTime, setStartTime] = useState(availability?.start_time || '09:00');
  const [endTime, setEndTime] = useState(availability?.end_time || '17:00');
  const [isActive, setIsActive] = useState(availability?.is_active ?? true);
  const [meetingPointId, setMeetingPointId] = useState<string>(availability?.meeting_point_id ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (availability) {
      setDayOfWeek(availability.day_of_week.toString());
      setStartTime(availability.start_time);
      setEndTime(availability.end_time);
      setIsActive(availability.is_active);
      setMeetingPointId(availability.meeting_point_id ?? '');
    }
  }, [availability]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    setError(null);

    try {
      if (availability) {
        // Update existing availability
        const params: UpdateAvailabilityParams = {
          id: availability.id,
          dayOfWeek: Number(dayOfWeek),
          startTime: startTime.trim(),
          endTime: endTime.trim(),
          isActive: isActive,
          meetingPointId: meetingPointId || null,
        };
        await updateAvailability(params);
      } else {
        // Create new availability
        const params: CreateAvailabilityParams = {
          dayOfWeek: Number(dayOfWeek),
          startTime: startTime.trim(),
          endTime: endTime.trim(),
          isActive: isActive,
          meetingPointId: meetingPointId || null,
        };
        await createAvailability(params);
      }
      onSuccess();
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to save availability';
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
          htmlFor="day_of_week"
          style={{
            display: 'block',
            marginBottom: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: '500',
            color: '#374151',
          }}
        >
          Day of week *
        </label>
        <select
          id="day_of_week"
          value={dayOfWeek}
          onChange={(e) => setDayOfWeek(e.target.value)}
          required
          disabled={loading}
          style={{
            width: '100%',
            padding: '0.5rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.375rem',
            fontSize: '1rem',
            outline: 'none',
            backgroundColor: 'white',
          }}
          onFocus={(e) => {
            e.currentTarget.style.outline = '2px solid #3b82f6';
            e.currentTarget.style.outlineOffset = '2px';
          }}
          onBlur={(e) => {
            e.currentTarget.style.outline = 'none';
          }}
          aria-required="true"
        >
          {dayOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {meetingPoints.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <label
            htmlFor="meeting_point_id"
            style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#374151',
            }}
          >
            Location (optional)
          </label>
          <select
            id="meeting_point_id"
            value={meetingPointId}
            onChange={(e) => setMeetingPointId(e.target.value)}
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
              fontSize: '1rem',
              outline: 'none',
              backgroundColor: 'white',
            }}
            aria-label="Meeting point for this window"
          >
            <option value="">All locations</option>
            {meetingPoints.map((mp) => (
              <option key={mp.id} value={mp.id}>
                {mp.name}
              </option>
            ))}
          </select>
          <p style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: '#6b7280' }}>
            If set, this window is only for that location; otherwise it applies to all.
          </p>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
        <div>
          <label
            htmlFor="start_time"
            style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#374151',
            }}
          >
            Start time *
          </label>
          <input
            type="time"
            id="start_time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
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
        <div>
          <label
            htmlFor="end_time"
            style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#374151',
            }}
          >
            End time *
          </label>
          <input
            type="time"
            id="end_time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
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
      </div>

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
          disabled={loading}
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
          aria-label="Save availability"
        >
          {loading ? 'Saving...' : 'Save'}
        </button>
      </div>
    </form>
  );
}

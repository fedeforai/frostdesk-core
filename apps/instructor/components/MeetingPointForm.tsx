'use client';

import { useState, useEffect } from 'react';
import type { InstructorMeetingPoint, CreateInstructorMeetingPointParams, UpdateInstructorMeetingPointParams } from '@/lib/instructorApi';
import { createInstructorMeetingPoint, updateInstructorMeetingPoint } from '@/lib/instructorApi';

interface MeetingPointFormProps {
  meetingPoint?: InstructorMeetingPoint | null;
  onCancel: () => void;
  onSuccess: () => void;
}

export default function MeetingPointForm({ meetingPoint, onCancel, onSuccess }: MeetingPointFormProps) {
  const [name, setName] = useState(meetingPoint?.name || '');
  const [description, setDescription] = useState(meetingPoint?.description || '');
  const [address, setAddress] = useState(meetingPoint?.address || '');
  const [latitude, setLatitude] = useState(meetingPoint?.latitude?.toString() || '');
  const [longitude, setLongitude] = useState(meetingPoint?.longitude?.toString() || '');
  const [what3words, setWhat3words] = useState(meetingPoint?.what3words || '');
  const [isDefault, setIsDefault] = useState(meetingPoint?.is_default ?? false);
  const [isActive, setIsActive] = useState(meetingPoint?.is_active ?? true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (meetingPoint) {
      setName(meetingPoint.name);
      setDescription(meetingPoint.description || '');
      setAddress(meetingPoint.address || '');
      setLatitude(meetingPoint.latitude?.toString() || '');
      setLongitude(meetingPoint.longitude?.toString() || '');
      setWhat3words(meetingPoint.what3words || '');
      setIsDefault(meetingPoint.is_default ?? false);
      setIsActive(meetingPoint.is_active);
    }
  }, [meetingPoint]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !description.trim()) {
      setError('Name and description are required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (meetingPoint) {
        // Update existing meeting point
        const params: UpdateInstructorMeetingPointParams = {
          name: name.trim(),
          description: description.trim(),
          address: address.trim() || null,
          latitude: latitude.trim() ? Number(latitude) : null,
          longitude: longitude.trim() ? Number(longitude) : null,
          what3words: what3words.trim() || null,
          is_default: isDefault,
          is_active: isActive,
        };
        await updateInstructorMeetingPoint(meetingPoint.id, params);
      } else {
        // Create new meeting point
        const params: CreateInstructorMeetingPointParams = {
          name: name.trim(),
          description: description.trim(),
          address: address.trim() || null,
          latitude: latitude.trim() ? Number(latitude) : null,
          longitude: longitude.trim() ? Number(longitude) : null,
          what3words: what3words.trim() || null,
          is_default: isDefault,
        };
        await createInstructorMeetingPoint(params);
      }
      onSuccess();
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to save meeting point';
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
          htmlFor="name"
          style={{
            display: 'block',
            marginBottom: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: '500',
            color: '#374151',
          }}
        >
          Name *
        </label>
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
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
          htmlFor="description"
          style={{
            display: 'block',
            marginBottom: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: '500',
            color: '#374151',
          }}
        >
          Description *
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
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
          aria-required="true"
        />
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label
          htmlFor="address"
          style={{
            display: 'block',
            marginBottom: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: '500',
            color: '#374151',
          }}
        >
          Address
        </label>
        <input
          type="text"
          id="address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
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
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
        <div>
          <label
            htmlFor="latitude"
            style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#374151',
            }}
          >
            Latitude
          </label>
          <input
            type="number"
            id="latitude"
            value={latitude}
            onChange={(e) => setLatitude(e.target.value)}
            disabled={loading}
            step="any"
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
          />
        </div>
        <div>
          <label
            htmlFor="longitude"
            style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#374151',
            }}
          >
            Longitude
          </label>
          <input
            type="number"
            id="longitude"
            value={longitude}
            onChange={(e) => setLongitude(e.target.value)}
            disabled={loading}
            step="any"
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
          />
        </div>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label
          htmlFor="what3words"
          style={{
            display: 'block',
            marginBottom: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: '500',
            color: '#374151',
          }}
        >
          What3Words
        </label>
        <input
          type="text"
          id="what3words"
          value={what3words}
          onChange={(e) => setWhat3words(e.target.value)}
          disabled={loading}
          placeholder="es. tavolo.lampada.sedia"
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
        />
        <p style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: '#6b7280' }}>
          Codice a tre parole per il punto esatto (3×3 m). Trovalo su{' '}
          <a href="https://what3words.com" target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb' }}>what3words.com</a> o nell’app — utile da comunicare al cliente.
        </p>
      </div>

      <div style={{ marginBottom: '1rem' }}>
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
            checked={isDefault}
            onChange={(e) => setIsDefault(e.target.checked)}
            disabled={loading}
            style={{
              width: '1rem',
              height: '1rem',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          />
          Set as default
        </label>
      </div>

      {meetingPoint && (
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
          disabled={loading || !name.trim() || !description.trim()}
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
          aria-label="Save meeting point"
        >
          {loading ? 'Saving...' : 'Save'}
        </button>
      </div>
    </form>
  );
}

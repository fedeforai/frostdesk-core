'use client';

import { useState, useEffect } from 'react';
import type {
  InstructorPolicyDocumentApi,
  PolicyStructuredApi,
} from '@/lib/instructorApi';
import { patchInstructorPolicyDocumentApi } from '@/lib/instructorApi';

interface PolicyDocumentFormProps {
  document: InstructorPolicyDocumentApi;
  onSuccess: () => void;
  onCancel?: () => void;
}

const STRUCTURED_KEYS: (keyof PolicyStructuredApi)[] = [
  'cancellation',
  'no_show',
  'weather',
  'payment',
  'liability',
  'meeting_point',
];

const SECTION_LABELS: Record<keyof PolicyStructuredApi, string> = {
  cancellation: 'Cancellation',
  no_show: 'No-show',
  weather: 'Weather',
  payment: 'Payment',
  liability: 'Liability',
  meeting_point: 'Meeting point',
};

function emptyStructured(): PolicyStructuredApi {
  return {};
}

export default function PolicyDocumentForm({
  document: initial,
  onSuccess,
  onCancel,
}: PolicyDocumentFormProps) {
  const [structured, setStructured] = useState<PolicyStructuredApi>(initial.structured ?? emptyStructured());
  const [freeform, setFreeform] = useState(initial.freeform ?? '');
  const [version, setVersion] = useState(initial.version);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setStructured(initial.structured ?? emptyStructured());
    setFreeform(initial.freeform ?? '');
    setVersion(initial.version);
  }, [initial.structured, initial.freeform, initial.version]);

  const updateStructured = <K extends keyof PolicyStructuredApi>(
    key: K,
    field: string,
    value: number | string | boolean | undefined
  ) => {
    setStructured((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] ?? {}),
        [field]: value,
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const updated = await patchInstructorPolicyDocumentApi(
        { structured, freeform },
        version
      );
      setVersion(updated.version);
      onSuccess();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {error && (
        <div
          style={{
            padding: '0.75rem',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '0.5rem',
            color: '#991b1b',
            fontSize: '0.875rem',
          }}
        >
          {error}
        </div>
      )}

      {STRUCTURED_KEYS.map((key) => (
        <fieldset
          key={key}
          style={{
            border: '1px solid #e5e7eb',
            borderRadius: '0.5rem',
            padding: '1rem',
          }}
        >
          <legend style={{ fontWeight: 600, fontSize: '0.9375rem' }}>
            {SECTION_LABELS[key]}
          </legend>
          {key === 'cancellation' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
              <label>
                Notice (hours):{' '}
                <input
                  type="number"
                  min={0}
                  value={structured.cancellation?.notice_hours ?? ''}
                  onChange={(e) =>
                    updateStructured(
                      'cancellation',
                      'notice_hours',
                      e.target.value === '' ? undefined : parseInt(e.target.value, 10)
                    )
                  }
                />
              </label>
              <label>
                Refund % before notice:{' '}
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={structured.cancellation?.refund_percent_before ?? ''}
                  onChange={(e) =>
                    updateStructured(
                      'cancellation',
                      'refund_percent_before',
                      e.target.value === '' ? undefined : parseInt(e.target.value, 10)
                    )
                  }
                />
              </label>
              <label>
                Refund % after:{' '}
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={structured.cancellation?.refund_percent_after ?? ''}
                  onChange={(e) =>
                    updateStructured(
                      'cancellation',
                      'refund_percent_after',
                      e.target.value === '' ? undefined : parseInt(e.target.value, 10)
                    )
                  }
                />
              </label>
              <label>
                Text override:{' '}
                <input
                  type="text"
                  maxLength={2000}
                  value={structured.cancellation?.text_override ?? ''}
                  onChange={(e) =>
                    updateStructured('cancellation', 'text_override', e.target.value || undefined)
                  }
                  style={{ width: '100%' }}
                />
              </label>
            </div>
          )}
          {key === 'no_show' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
              <label>
                Charge %:{' '}
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={structured.no_show?.charge_percent ?? ''}
                  onChange={(e) =>
                    updateStructured(
                      'no_show',
                      'charge_percent',
                      e.target.value === '' ? undefined : parseInt(e.target.value, 10)
                    )
                  }
                />
              </label>
              <label>
                Grace (minutes):{' '}
                <input
                  type="number"
                  min={0}
                  value={structured.no_show?.grace_minutes ?? ''}
                  onChange={(e) =>
                    updateStructured(
                      'no_show',
                      'grace_minutes',
                      e.target.value === '' ? undefined : parseInt(e.target.value, 10)
                    )
                  }
                />
              </label>
              <label>
                Text override:{' '}
                <input
                  type="text"
                  maxLength={2000}
                  value={structured.no_show?.text_override ?? ''}
                  onChange={(e) =>
                    updateStructured('no_show', 'text_override', e.target.value || undefined)
                  }
                  style={{ width: '100%' }}
                />
              </label>
            </div>
          )}
          {key === 'weather' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
              <label>
                Reschedule or refund:{' '}
                <select
                  value={structured.weather?.reschedule_or_refund ?? ''}
                  onChange={(e) =>
                    updateStructured(
                      'weather',
                      'reschedule_or_refund',
                      e.target.value === ''
                        ? undefined
                        : (e.target.value as 'reschedule' | 'refund' | 'either')
                    )
                  }
                >
                  <option value="">—</option>
                  <option value="reschedule">Reschedule</option>
                  <option value="refund">Refund</option>
                  <option value="either">Either</option>
                </select>
              </label>
              <label>
                Text override:{' '}
                <input
                  type="text"
                  maxLength={2000}
                  value={structured.weather?.text_override ?? ''}
                  onChange={(e) =>
                    updateStructured('weather', 'text_override', e.target.value || undefined)
                  }
                  style={{ width: '100%' }}
                />
              </label>
            </div>
          )}
          {key === 'payment' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
              <label>
                Currency (3 letters):{' '}
                <input
                  type="text"
                  maxLength={3}
                  value={structured.payment?.currency ?? ''}
                  onChange={(e) =>
                    updateStructured('payment', 'currency', e.target.value || undefined)
                  }
                />
              </label>
              <label>
                Methods (comma-separated):{' '}
                <input
                  type="text"
                  value={structured.payment?.methods?.join(', ') ?? ''}
                  onChange={(e) =>
                    updateStructured(
                      'payment',
                      'methods',
                      e.target.value
                        ? e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
                        : undefined
                    )
                  }
                  style={{ width: '100%' }}
                />
              </label>
              <label>
                Text override:{' '}
                <input
                  type="text"
                  maxLength={2000}
                  value={structured.payment?.text_override ?? ''}
                  onChange={(e) =>
                    updateStructured('payment', 'text_override', e.target.value || undefined)
                  }
                  style={{ width: '100%' }}
                />
              </label>
            </div>
          )}
          {key === 'liability' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  checked={structured.liability?.waiver_required ?? false}
                  onChange={(e) =>
                    updateStructured('liability', 'waiver_required', e.target.checked)
                  }
                />
                Waiver required
              </label>
              <label>
                Text override:{' '}
                <input
                  type="text"
                  maxLength={2000}
                  value={structured.liability?.text_override ?? ''}
                  onChange={(e) =>
                    updateStructured('liability', 'text_override', e.target.value || undefined)
                  }
                  style={{ width: '100%' }}
                />
              </label>
            </div>
          )}
          {key === 'meeting_point' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
              <label>
                Arrival (minutes before):{' '}
                <input
                  type="number"
                  min={0}
                  value={structured.meeting_point?.arrival_minutes_before ?? ''}
                  onChange={(e) =>
                    updateStructured(
                      'meeting_point',
                      'arrival_minutes_before',
                      e.target.value === '' ? undefined : parseInt(e.target.value, 10)
                    )
                  }
                />
              </label>
              <label>
                Text override:{' '}
                <input
                  type="text"
                  maxLength={2000}
                  value={structured.meeting_point?.text_override ?? ''}
                  onChange={(e) =>
                    updateStructured('meeting_point', 'text_override', e.target.value || undefined)
                  }
                  style={{ width: '100%' }}
                />
              </label>
            </div>
          )}
        </fieldset>
      ))}

      <fieldset
        style={{
          border: '1px solid #e5e7eb',
          borderRadius: '0.5rem',
          padding: '1rem',
        }}
      >
        <legend style={{ fontWeight: 600, fontSize: '0.9375rem' }}>
          Freeform (additional terms)
        </legend>
        <textarea
          value={freeform}
          onChange={(e) => setFreeform(e.target.value)}
          rows={6}
          style={{ width: '100%', marginTop: '0.5rem', padding: '0.5rem' }}
          placeholder="Any additional policy text..."
        />
      </fieldset>

      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button type="submit" disabled={loading} style={{ padding: '0.5rem 1rem', fontWeight: 600 }}>
          {loading ? 'Saving…' : 'Save'}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} style={{ padding: '0.5rem 1rem' }}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

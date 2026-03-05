'use client';

import { useState } from 'react';
import type { InstructorProfile } from '@/lib/instructorApi';
import { updateInstructorProfile } from '@/lib/instructorApi';

const AVATAR_IDS = [1, 2, 3, 4] as const;
const AVATAR_COLORS = ['#3b82f6', '#22d3ee', '#a78bfa', '#34d399'];

const containerStyle = {
  marginBottom: '1.5rem',
  padding: '1.25rem',
  border: '1px solid rgba(148, 163, 184, 0.2)',
  borderRadius: '0.75rem',
  backgroundColor: 'rgba(15, 23, 42, 0.6)',
};
const labelStyle = {
  display: 'block' as const,
  marginBottom: '0.75rem',
  fontSize: '0.875rem',
  fontWeight: 600,
  color: 'rgba(226, 232, 240, 0.95)',
};
const gridStyle = {
  display: 'flex',
  flexWrap: 'wrap' as const,
  gap: '0.75rem',
};

interface AvatarPickerProps {
  profile: InstructorProfile | null;
  onSaved?: (profile: InstructorProfile) => void;
}

export default function AvatarPicker({ profile, onSaved }: AvatarPickerProps) {
  const currentId = profile?.marketing_fields?.avatar_id ?? null;
  const [selectedId, setSelectedId] = useState<number | null>(currentId);
  const [saving, setSaving] = useState(false);

  const handleSelect = async (id: number) => {
    setSelectedId(id);
    setSaving(true);
    try {
      const updated = await updateInstructorProfile({
        marketing_fields: {
          ...profile?.marketing_fields,
          avatar_id: id,
        },
      });
      onSaved?.(updated);
    } catch {
      setSelectedId(currentId);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={containerStyle}>
      <span style={labelStyle}>Avatar</span>
      <div style={gridStyle} role="group" aria-label="Select avatar">
        {AVATAR_IDS.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => handleSelect(id)}
            disabled={saving}
            aria-label={`Select avatar ${id}`}
            aria-pressed={selectedId === id}
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              border: selectedId === id ? '3px solid #3b82f6' : '2px solid rgba(148, 163, 184, 0.3)',
              background: AVATAR_COLORS[id - 1],
              cursor: saving ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.25rem',
              fontWeight: 700,
              color: 'rgba(255,255,255,0.9)',
            }}
          >
            {id}
          </button>
        ))}
      </div>
    </div>
  );
}

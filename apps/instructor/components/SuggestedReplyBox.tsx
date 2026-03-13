'use client';

import { useState } from 'react';

/**
 * STEP 6.3 — Suggested replies with hover affordance (UI only).
 * STEP 6.4 — Mouse-only; keyboard (Enter) reserved for manual input.
 * "Click to send · Enter sends your message" on hover. No tabIndex, no onKeyDown.
 */

export interface SuggestedReplyBoxProps {
  suggestions: string[];
  onSend: (text: string) => void;
}

export default function SuggestedReplyBox({ suggestions, onSend }: SuggestedReplyBoxProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (suggestions.length === 0) return null;

  return (
    <div style={{ marginBottom: '1rem' }}>
      {suggestions.map((text, index) => (
        <div
          key={`${index}-${text.slice(0, 20)}`}
          style={{
            position: 'relative',
            display: 'block',
            width: '100%',
            marginBottom: '0.5rem',
            padding: '0.75rem 1rem',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '0.375rem',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            fontSize: '0.875rem',
            color: 'rgba(226, 232, 240, 0.95)',
            cursor: 'pointer',
            textAlign: 'left',
          }}
          onMouseEnter={() => setHoveredIndex(index)}
          onMouseLeave={() => setHoveredIndex(null)}
          onClick={() => onSend(text)}
        >
          <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{text}</span>
          {hoveredIndex === index && (
            <span
              style={{
                position: 'absolute',
                bottom: '0.5rem',
                right: '0.5rem',
                fontSize: '0.75rem',
                color: 'rgba(148, 163, 184, 0.9)',
                background: 'transparent',
                pointerEvents: 'none',
              }}
            >
              Click to send · Enter sends your message
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

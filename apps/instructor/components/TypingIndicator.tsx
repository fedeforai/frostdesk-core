'use client';

/**
 * FEATURE 3.0 — Typing Indicator v1 (UI only).
 * Shows "Typing…" with animated dots when instructor is actively writing.
 * CSS-only animation, fade in/out 150ms, no layout jump.
 */

export interface TypingIndicatorProps {
  visible: boolean;
}

export default function TypingIndicator({ visible }: TypingIndicatorProps) {
  return (
    <div
      style={{
        minHeight: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        opacity: visible ? 1 : 0,
        transition: 'opacity 150ms ease-in-out',
        pointerEvents: 'none',
      }}
      aria-live="polite"
      aria-atomic="true"
    >
      {visible && (
        <span
          style={{
            fontSize: '0.75rem',
            color: '#9ca3af',
            fontStyle: 'italic',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
          }}
        >
          Typing
          <span
            style={{
              display: 'inline-flex',
              gap: '2px',
            }}
          >
            <span className="typing-dot" style={{ animation: 'typingDot 1s infinite' }}>.</span>
            <span className="typing-dot" style={{ animation: 'typingDot 1s infinite 0.2s' }}>.</span>
            <span className="typing-dot" style={{ animation: 'typingDot 1s infinite 0.4s' }}>.</span>
          </span>
        </span>
      )}
      <style jsx>{`
        @keyframes typingDot {
          0%, 60%, 100% {
            opacity: 0.3;
          }
          30% {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

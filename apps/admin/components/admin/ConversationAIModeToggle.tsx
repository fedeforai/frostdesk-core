'use client';

import { useState } from 'react';
import { setConversationAIMode } from '@/lib/adminApi';

/**
 * ConversationAIModeToggle Component (RALPH-SAFE)
 * 
 * WHAT IT DOES:
 * - Provides toggle UI for AI mode (ON / OFF)
 * - Updates ai_enabled flag via API
 * - Shows loading state during update
 * - Displays current state clearly
 * 
 * WHAT IT DOES NOT DO:
 * - No AI calls
 * - No outbound messages
 * - No automation
 * - No animations
 * - No marketing text
 */

interface ConversationAIModeToggleProps {
  conversationId: string;
  enabled: boolean;
  onModeChanged?: () => void;
}

export default function ConversationAIModeToggle({
  conversationId,
  enabled: initialEnabled,
  onModeChanged,
}: ConversationAIModeToggleProps) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleToggle = async () => {
    const newEnabled = !enabled;
    setIsLoading(true);
    setError(null);

    try {
      await setConversationAIMode(conversationId, newEnabled);
      setEnabled(newEnabled);
      if (onModeChanged) {
        onModeChanged();
      }
    } catch (err) {
      // Error: revert state and show error message
      setError(err instanceof Error ? err.message : 'Failed to update AI mode');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.75rem',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '6px',
        backgroundColor: '#ffffff',
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'rgba(226, 232, 240, 0.95)', marginBottom: '0.25rem' }}>
          AI Mode
        </div>
        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
          {enabled ? 'Active' : 'Paused'}
        </div>
      </div>

      {error && (
        <div
          style={{
            fontSize: '0.75rem',
            color: '#991b1b',
            padding: '0.25rem 0.5rem',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '4px',
          }}
        >
          {error}
        </div>
      )}

      <button
        onClick={handleToggle}
        disabled={isLoading}
        style={{
          position: 'relative',
          width: '48px',
          height: '24px',
          borderRadius: '12px',
          border: 'none',
          backgroundColor: enabled ? '#3b82f6' : '#9ca3af',
          cursor: isLoading ? 'not-allowed' : 'pointer',
          transition: 'background-color 0.2s',
          outline: 'none',
        }}
        onMouseEnter={(e) => {
          if (!isLoading) {
            e.currentTarget.style.opacity = '0.9';
          }
        }}
        onMouseLeave={(e) => {
          if (!isLoading) {
            e.currentTarget.style.opacity = '1';
          }
        }}
        aria-label={enabled ? 'Disable AI' : 'Enable AI'}
      >
        <div
          style={{
            position: 'absolute',
            top: '2px',
            left: enabled ? '26px' : '2px',
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            backgroundColor: '#ffffff',
            transition: 'left 0.2s',
          }}
        />
      </button>

      {isLoading && (
        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
          Updating...
        </div>
      )}
    </div>
  );
}

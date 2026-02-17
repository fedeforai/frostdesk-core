/**
 * Loop 7: Canonical UI mapping for Decision Timeline events.
 * Do not add or change labels; this is the single source of truth.
 */

export type EventTone = 'neutral' | 'positive' | 'negative' | 'muted';

export interface EventUiConfig {
  label: string;
  icon: string;
  tone: EventTone;
}

export const EVENT_UI_MAP: Record<string, EventUiConfig> = {
  message_inbound: {
    label: 'Customer message received',
    icon: '💬',
    tone: 'neutral',
  },
  message_outbound: {
    label: 'Message sent',
    icon: '📤',
    tone: 'neutral',
  },
  booking_confirmed: {
    label: 'Booking confirmed',
    icon: '✅',
    tone: 'positive',
  },
  booking_modified: {
    label: 'Booking modified',
    icon: '✏️',
    tone: 'neutral',
  },
  booking_declined: {
    label: 'Booking declined',
    icon: '❌',
    tone: 'negative',
  },
  booking_cancelled: {
    label: 'Booking cancelled',
    icon: '🛑',
    tone: 'negative',
  },
  handoff: {
    label: 'Conversation handed off',
    icon: '🔁',
    tone: 'neutral',
  },
  ai_paused: {
    label: 'AI paused by instructor',
    icon: '⏸️',
    tone: 'neutral',
  },
  ai_on: {
    label: 'AI reactivated',
    icon: '▶️',
    tone: 'positive',
  },
  system: {
    label: 'System event',
    icon: '⚙️',
    tone: 'muted',
  },
};

/**
 * Derives UI key from API event (type + payload).
 * Used to pick label/icon/tone from EVENT_UI_MAP.
 */
export function getEventUiKey(
  type: string,
  payload: Record<string, unknown>
): string {
  if (type === 'message') {
    const direction = payload?.direction as string | undefined;
    return direction === 'inbound' ? 'message_inbound' : 'message_outbound';
  }
  if (type === 'booking_state_change') {
    const to = (payload?.to ?? payload?.new_state) as string | undefined;
    if (to === 'confirmed') return 'booking_confirmed';
    if (to === 'modified') return 'booking_modified';
    if (to === 'declined') return 'booking_declined';
    if (to === 'cancelled') return 'booking_cancelled';
    return 'booking_modified'; // fallback
  }
  if (type === 'handoff') return 'handoff';
  if (type === 'ai_state_change') {
    const next = (payload?.next_state ?? payload?.to) as string | undefined;
    if (next === 'ai_paused_by_human') return 'ai_paused';
    if (next === 'ai_on') return 'ai_on';
    return 'ai_paused'; // fallback
  }
  if (type === 'system') return 'system';
  return 'system';
}

export function getEventUiConfig(
  type: string,
  payload: Record<string, unknown>
): EventUiConfig {
  const key = getEventUiKey(type, payload);
  return EVENT_UI_MAP[key] ?? EVENT_UI_MAP.system;
}

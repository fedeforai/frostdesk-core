/**
 * Loop 7: Frontend-only grouping for conversation timeline.
 * Does not alter, filter, or reorder events; only groups for display.
 */

import type { ConversationTimelineEvent } from '@/lib/instructorApi';

const HANDOFF_GROUP_MS = 2000;

export type TimelineDisplayItem =
  | { kind: 'single'; event: ConversationTimelineEvent }
  | { kind: 'handoff_group'; events: [ConversationTimelineEvent, ConversationTimelineEvent]; timestamp: string }
  | { kind: 'booking_group'; events: ConversationTimelineEvent[]; timestamp: string };

/**
 * Groups consecutive handoff + system(conversation_handoff) into one visual block.
 * Events remain in array; no deduplication.
 */
function groupHandoffPairs(
  items: TimelineDisplayItem[]
): TimelineDisplayItem[] {
  const out: TimelineDisplayItem[] = [];
  let i = 0;

  while (i < items.length) {
    const current = items[i];
    const next = items[i + 1];

    const nextSingle = next?.kind === 'single' ? next : null;
    if (
      current.kind === 'single' &&
      current.event.type === 'handoff' &&
      nextSingle &&
      nextSingle.event.type === 'system' &&
      nextSingle.event.summary === 'conversation_handoff' &&
      Math.abs(
        new Date(current.event.timestamp).getTime() -
          new Date(nextSingle.event.timestamp).getTime()
      ) < HANDOFF_GROUP_MS
    ) {
      out.push({
        kind: 'handoff_group',
        events: [current.event, nextSingle.event],
        timestamp: current.event.timestamp,
      });
      i += 2;
    } else {
      out.push(current);
      i += 1;
    }
  }

  return out;
}

/**
 * Groups consecutive booking_state_change events for the same booking_id.
 */
function groupBookingBlocks(
  items: TimelineDisplayItem[]
): TimelineDisplayItem[] {
  const out: TimelineDisplayItem[] = [];
  let buffer: ConversationTimelineEvent[] = [];

  for (const item of items) {
    if (item.kind !== 'single') {
      if (buffer.length > 0) {
        out.push({
          kind: 'booking_group',
          events: buffer,
          timestamp: buffer[0].timestamp,
        });
        buffer = [];
      }
      out.push(item);
      continue;
    }

    const event = item.event;
    if (event.type === 'booking_state_change') {
      const bid = (event.payload?.booking_id as string) ?? '';
      if (buffer.length > 0 && (buffer[0].payload?.booking_id as string) !== bid) {
        out.push({
          kind: 'booking_group',
          events: buffer,
          timestamp: buffer[0].timestamp,
        });
        buffer = [];
      }
      buffer.push(event);
    } else {
      if (buffer.length > 0) {
        out.push({
          kind: 'booking_group',
          events: buffer,
          timestamp: buffer[0].timestamp,
        });
        buffer = [];
      }
      out.push(item);
    }
  }

  if (buffer.length > 0) {
    out.push({
      kind: 'booking_group',
      events: buffer,
      timestamp: buffer[0].timestamp,
    });
  }

  return out;
}

/**
 * Converts raw API events to display items (all single first),
 * then applies handoff grouping, then booking grouping.
 * Order of events is preserved.
 */
export function groupConversationTimelineEvents(
  events: ConversationTimelineEvent[]
): TimelineDisplayItem[] {
  const singles: TimelineDisplayItem[] = events.map((event) => ({
    kind: 'single' as const,
    event,
  }));
  const afterHandoff = groupHandoffPairs(singles);
  return groupBookingBlocks(afterHandoff);
}

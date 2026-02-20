import type { InstructorConversation } from '@/lib/instructorApi';

function conversationKey(c: InstructorConversation): string {
  return `${c.id}|${c.lastMessagePreview ?? ''}|${c.updatedAt}|${c.status}|${c.unreadCount}|${c.channel}|${c.customerName ?? ''}`;
}

export function mergeConversations(
  prev: InstructorConversation[],
  next: InstructorConversation[]
): InstructorConversation[] {
  const byId = new Map(prev.map((c) => [c.id, c]));

  for (const incoming of next) {
    const existing = byId.get(incoming.id);
    if (!existing) {
      byId.set(incoming.id, incoming);
      continue;
    }

    byId.set(incoming.id, {
      ...existing,
      lastMessagePreview: incoming.lastMessagePreview,
      updatedAt: incoming.updatedAt,
      status: incoming.status,
      unreadCount: incoming.unreadCount,
      channel: incoming.channel,
      customerName: incoming.customerName,
    });
  }

  const merged = Array.from(byId.values()).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  // Return prev reference when nothing materially changed to avoid unnecessary re-renders
  if (merged.length !== prev.length) return merged;
  const prevKeys = prev.map(conversationKey).join('\n');
  const mergedKeys = merged.map(conversationKey).join('\n');
  if (prevKeys === mergedKeys) return prev;
  return merged;
}

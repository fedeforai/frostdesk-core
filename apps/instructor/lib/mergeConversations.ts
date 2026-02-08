import type { InstructorConversation } from '@/lib/instructorApi';

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
      // fields that can change via polling
      lastMessagePreview: incoming.lastMessagePreview,
      updatedAt: incoming.updatedAt,
      status: incoming.status,
      unreadCount: incoming.unreadCount,
      channel: incoming.channel,
      customerName: incoming.customerName,
    });
  }

  return Array.from(byId.values()).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

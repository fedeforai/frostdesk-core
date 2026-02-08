export type Channel = 'whatsapp' | 'instagram' | 'web';
export type ConversationStatus = 'hot' | 'waiting' | 'resolved';

export type MessageRole =
  | 'customer'
  | 'instructor'
  | 'ai_draft';

export interface MockConversation {
  id: string;
  customerName: string;
  channel: Channel;
  lastMessagePreview: string;
  updatedAt: string;
  status: ConversationStatus;
  unreadCount: number;
}

export interface MockMessage {
  id: string;
  role: MessageRole;
  text: string;
  createdAt: string;
}

const now = new Date();
const fmt = (d: Date) => d.toISOString();

export const MOCK_CONVERSATIONS: MockConversation[] = [
  {
    id: 'c1',
    customerName: 'Marco Rossi',
    channel: 'whatsapp',
    lastMessagePreview: 'Perfect, see you then!',
    updatedAt: fmt(new Date(now.getTime() - 5 * 60000)),
    status: 'hot',
    unreadCount: 2,
  },
  {
    id: 'c2',
    customerName: 'Anna Bianchi',
    channel: 'instagram',
    lastMessagePreview: 'Do you have availability next weekend?',
    updatedAt: fmt(new Date(now.getTime() - 32 * 60000)),
    status: 'waiting',
    unreadCount: 0,
  },
  {
    id: 'c3',
    customerName: 'Luca Verdi',
    channel: 'web',
    lastMessagePreview: 'Thanks for the quick reply.',
    updatedAt: fmt(new Date(now.getTime() - 2 * 3600000)),
    status: 'resolved',
    unreadCount: 0,
  },
  {
    id: 'c4',
    customerName: 'Elena Neri',
    channel: 'whatsapp',
    lastMessagePreview: 'I need to cancel my booking.',
    updatedAt: fmt(new Date(now.getTime() - 4 * 3600000)),
    status: 'hot',
    unreadCount: 1,
  },
  {
    id: 'c5',
    customerName: 'Giulia Ferri',
    channel: 'instagram',
    lastMessagePreview: 'Is the 2-hour lesson still available?',
    updatedAt: fmt(new Date(now.getTime() - 24 * 3600000)),
    status: 'waiting',
    unreadCount: 0,
  },
  {
    id: 'c6',
    customerName: 'Paolo Costa',
    channel: 'web',
    lastMessagePreview: 'Booked. See you on the slopes!',
    updatedAt: fmt(new Date(now.getTime() - 48 * 3600000)),
    status: 'resolved',
    unreadCount: 0,
  },
];

function messagesFor(convId: string): MockMessage[] {
  const base = new Date(now.getTime() - 7 * 24 * 3600000);

  const texts: Record<string, { role: MessageRole; text: string }[]> = {
    c2: [
      { role: 'customer', text: 'Hello! Do you have availability for two people next weekend?' },
      { role: 'ai_draft', text: 'We have slots on Saturday and Sunday. How many hours would you like?' },
      { role: 'customer', text: 'Do you have availability next weekend?' },
      { role: 'instructor', text: 'Yes, we have availability. How many hours are you thinking?' },
    ],
    c1: [
      { role: 'customer', text: "Hi, I'd like to book a private lesson for next Saturday." },
      { role: 'ai_draft', text: 'Sure. I have 9:00 and 14:00 available. Which do you prefer?' },
      { role: 'customer', text: "Let's do 9:00 please." },
      { role: 'instructor', text: 'Perfect, confirmed for Saturday at 9:00. See you then.' },
      { role: 'customer', text: 'Perfect, see you then!' },
    ],
    c3: [
      { role: 'customer', text: 'When is the next available slot?' },
      { role: 'ai_draft', text: 'Tomorrow at 10:00 or 15:00. Which works for you?' },
      { role: 'customer', text: '15:00 works. Book it please.' },
      { role: 'instructor', text: 'Confirmed for tomorrow at 15:00.' },
      { role: 'customer', text: 'Thanks for the quick reply.' },
    ],
    c4: [
      { role: 'customer', text: 'Hi, I need to cancel my booking for next week.' },
      { role: 'ai_draft', text: 'No problem. Which day and time was it?' },
      { role: 'customer', text: 'Tuesday 10:00.' },
      { role: 'instructor', text: 'Done. Cancelled. If you want, I can propose new slots.' },
      { role: 'customer', text: 'I need to cancel my booking.' },
    ],
    c5: [
      { role: 'customer', text: 'Is the 2-hour lesson still available for Friday?' },
      { role: 'ai_draft', text: 'Yes. I can do 9:00 or 14:00. Which do you prefer?' },
      { role: 'customer', text: "I'll confirm by tomorrow." },
      { role: 'instructor', text: 'No worries. I can hold 14:00 until tomorrow morning.' },
      { role: 'customer', text: 'Is the 2-hour lesson still available?' },
    ],
    c6: [
      { role: 'customer', text: 'I want to book for next Monday.' },
      { role: 'ai_draft', text: 'Great. I have 9:00 and 11:00 available.' },
      { role: 'customer', text: '9:00 please.' },
      { role: 'instructor', text: 'Confirmed for Monday at 9:00. See you on the slopes.' },
      { role: 'customer', text: 'Booked. See you on the slopes!' },
    ],
  };

  const list = texts[convId] ?? [{ role: 'customer', text: 'No messages' }];

  return list.map((item, i) => ({
    id: `${convId}-m${i}`,
    role: item.role,
    text: item.text,
    createdAt: fmt(new Date(base.getTime() + (i + 1) * 3600000)),
  }));
}

export function getMockMessages(conversationId: string): MockMessage[] {
  return messagesFor(conversationId);
}

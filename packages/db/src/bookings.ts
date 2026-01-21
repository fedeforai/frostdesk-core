import { getClient } from './client.js';

export interface CreateBookingParams {
  conversation_id: string;
  instructor_id?: number;
  date: string;
  time: string;
  duration: number;
  status?: 'pending' | 'confirmed' | 'cancelled';
}

export interface Booking {
  id: string;
  conversation_id: string;
  instructor_id: number;
  date: string;
  time: string;
  duration: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  created_at: string;
}

export async function createBooking(params: CreateBookingParams): Promise<Booking> {
  const client = getClient();
  
  const instructorId = params.instructor_id ?? 1;
  const status = params.status ?? 'pending';

  const result = await client.query<Booking>(
    `INSERT INTO bookings (conversation_id, instructor_id, date, time, duration, status, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())
     RETURNING id, conversation_id, instructor_id, date, time, duration, status, created_at`,
    [
      params.conversation_id,
      instructorId,
      params.date,
      params.time,
      params.duration,
      status,
    ]
  );

  if (result.rows.length === 0) {
    throw new Error('Failed to create booking: no row returned');
  }

  return result.rows[0];
}

export async function getBookingsByConversation(conversationId: string): Promise<Booking[]> {
  const client = getClient();

  const result = await client.query<Booking>(
    `SELECT id, conversation_id, instructor_id, date, time, duration, status, created_at
     FROM bookings
     WHERE conversation_id = $1
     ORDER BY created_at ASC`,
    [conversationId]
  );

  return result.rows;
}

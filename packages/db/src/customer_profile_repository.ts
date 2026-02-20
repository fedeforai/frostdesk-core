import { sql } from './client.js';
import { normalizePhoneE164 } from './phone_normalize.js';

export type CustomerProfileRow = {
  id: string;
  instructor_id: string;
  phone_number: string | null;
  display_name: string | null;
  first_seen_at: string;
  last_seen_at: string;
  source: string;
  created_at: string;
  updated_at: string;
};

export type CustomerProfileListItem = CustomerProfileRow & {
  notes_count: number;
  bookings_count: number;
  value_score: number;
};

/**
 * List customers for an instructor with notes_count and value_score.
 * value_score is computed in app layer (see computeCustomerValueScore).
 */
export async function listInstructorCustomers(params: {
  instructorId: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<CustomerProfileListItem[]> {
  const { instructorId, search, limit = 100, offset = 0 } = params;
  const searchCond = search?.trim()
    ? sql`AND (
      cp.phone_number ILIKE ${'%' + search.trim() + '%'}
      OR cp.display_name ILIKE ${'%' + search.trim() + '%'}
    )`
    : sql``;

  const rows = await sql<any[]>`
    SELECT
      cp.id,
      cp.instructor_id,
      cp.phone_number,
      cp.display_name,
      cp.first_seen_at,
      cp.last_seen_at,
      cp.source,
      cp.created_at,
      cp.updated_at,
      COALESCE(n.notes_count, 0)::int AS notes_count,
      COALESCE(b.bookings_count, 0)::int AS bookings_count
    FROM customer_profiles cp
    LEFT JOIN (
      SELECT customer_id, COUNT(*)::int AS notes_count
      FROM customer_notes
      GROUP BY customer_id
    ) n ON n.customer_id = cp.id
    LEFT JOIN (
      SELECT customer_id, COUNT(*)::int AS bookings_count
      FROM bookings
      WHERE customer_id IS NOT NULL
      GROUP BY customer_id
    ) b ON b.customer_id = cp.id
    WHERE cp.instructor_id = ${instructorId}
    ${searchCond}
    ORDER BY cp.last_seen_at DESC NULLS LAST
    LIMIT ${limit}
    OFFSET ${offset}
  `;

  const num = (r: any, key: string) => Number(r[key]) || 0;
  return rows.map((r) => {
    const notes_count = num(r, 'notes_count');
    const bookings_count = num(r, 'bookings_count');
    const value_score = computeCustomerValueScore({
      lastSeenAt: r.last_seen_at,
      notesCount: notes_count,
      bookingsCount: bookings_count,
      firstSeenAt: r.first_seen_at,
    });
    return { ...r, notes_count, bookings_count, value_score };
  });
}

/**
 * Upsert a customer by (instructor_id, phone_number). If phone_number exists, update last_seen_at and optionally display_name.
 * Returns the created or updated row.
 */
/** Normalize display name for use as synthetic phone key (booking fallback). */
function slugDisplayName(name: string): string {
  return 'booking:' + (name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 64) || 'anon');
}

export async function upsertCustomer(params: {
  instructorId: string;
  phoneNumber: string | null;
  displayName?: string | null;
  source?: string;
}): Promise<CustomerProfileRow> {
  const source = params.source ?? 'whatsapp';
  const displayName = params.displayName?.trim() || null;

  // CM-1: Normalize phone to E.164 to prevent silent duplicates.
  // "447712345021" and "+447712345021" must resolve to the same customer.
  const normalized = normalizePhoneE164(params.phoneNumber);
  const phoneNumber =
    normalized != null
      ? normalized
      : (displayName ? slugDisplayName(displayName) : 'anon');
  const result = await sql<CustomerProfileRow[]>`
    INSERT INTO customer_profiles (instructor_id, phone_number, display_name, source, first_seen_at, last_seen_at, updated_at)
    VALUES (${params.instructorId}, ${phoneNumber}, ${displayName}, ${source}, NOW(), NOW(), NOW())
    ON CONFLICT (instructor_id, phone_number)
    DO UPDATE SET
      last_seen_at = NOW(),
      updated_at = NOW(),
      display_name = COALESCE(EXCLUDED.display_name, customer_profiles.display_name)
    RETURNING id, instructor_id, phone_number, display_name, first_seen_at, last_seen_at, source, created_at, updated_at
  `;
  if (result.length === 0) throw new Error('Upsert customer failed');
  return result[0];
}

/**
 * Find a customer by phone number for a given instructor.
 * Normalizes the phone to E.164 before lookup to ensure consistent matching.
 * Returns null if not found.
 */
export async function findCustomerByPhone(
  instructorId: string,
  phoneNumber: string,
): Promise<CustomerProfileRow | null> {
  const normalized = normalizePhoneE164(phoneNumber);
  if (!normalized) return null;
  const result = await sql<CustomerProfileRow[]>`
    SELECT id, instructor_id, phone_number, display_name,
           first_seen_at, last_seen_at, source, created_at, updated_at
    FROM customer_profiles
    WHERE instructor_id = ${instructorId}
      AND phone_number = ${normalized}
    LIMIT 1
  `;
  return result.length > 0 ? result[0] : null;
}

/**
 * Get a customer by id; must belong to instructor. Returns null if not found.
 */
export async function getCustomerById(
  customerId: string,
  instructorId: string
): Promise<CustomerProfileRow | null> {
  const result = await sql<CustomerProfileRow[]>`
    SELECT id, instructor_id, phone_number, display_name,
           first_seen_at, last_seen_at, source, created_at, updated_at
    FROM customer_profiles
    WHERE id = ${customerId} AND instructor_id = ${instructorId}
    LIMIT 1
  `;
  return result.length > 0 ? result[0] : null;
}

/**
 * Value score 0–100. Pure function.
 * Recency: <7d → 30, <30d → 20, <90d → 10.
 * Engagement: notesCount * 5 (max 25).
 * Revenue proxy: bookingsCount * 10 (max 40).
 * Tenure: >6 months → 10.
 */
export function computeCustomerValueScore(params: {
  lastSeenAt: string | null;
  notesCount: number;
  bookingsCount?: number;
  firstSeenAt?: string | null;
}): number {
  let recency = 0;
  if (params.lastSeenAt) {
    const days = (Date.now() - new Date(params.lastSeenAt).getTime()) / (24 * 60 * 60 * 1000);
    if (days < 7) recency = 30;
    else if (days < 30) recency = 20;
    else if (days < 90) recency = 10;
  }
  const engagement = Math.min(25, (params.notesCount || 0) * 5);
  const revenue = Math.min(40, (params.bookingsCount || 0) * 10);
  let tenure = 0;
  if (params.firstSeenAt) {
    const days = (Date.now() - new Date(params.firstSeenAt).getTime()) / (24 * 60 * 60 * 1000);
    if (days > 180) tenure = 10;
  }
  return Math.min(100, recency + engagement + revenue + tenure);
}

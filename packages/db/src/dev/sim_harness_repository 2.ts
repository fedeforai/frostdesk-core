/**
 * Simulation Harness — DB helper functions (dev-only).
 *
 * Provides read queries for the conversation simulation harness.
 * These are dev-only helpers; they MUST NOT be called from production routes.
 */

import { sql } from '../client.js';

// ---------------------------------------------------------------------------
// Allowed source values (must match customer_profiles_source_check)
// ---------------------------------------------------------------------------

export type CustomerSource = 'whatsapp' | 'web' | 'referral' | 'manual' | 'booking' | 'sim_harness';

// ---------------------------------------------------------------------------
// Phone normalizer — strip spaces/dashes, ensure leading +, digits only
// ---------------------------------------------------------------------------

/**
 * Normalizes a phone number to strict E.164-safe format:
 *   - trims whitespace
 *   - strips spaces, dashes, parentheses, dots
 *   - ensures leading '+'
 *   - validates digits-only after '+'
 *
 * Throws if the result is too short or contains invalid characters.
 */
export function normalizePhone(raw: string): string {
  let phone = raw.trim().replace(/[\s\-().]/g, '');
  if (!phone.startsWith('+')) phone = `+${phone}`;
  const digits = phone.slice(1);
  if (!/^\d{7,15}$/.test(digits)) {
    throw new Error(
      `Invalid phone after normalization: "${phone}" (original: "${raw}"). ` +
        'Expected + followed by 7-15 digits.'
    );
  }
  return phone;
}

// ---------------------------------------------------------------------------
// A) createOrGetCustomerProfile
// ---------------------------------------------------------------------------

export interface SimCustomerProfile {
  id: string;
  instructor_id: string;
  phone_number: string | null;
  display_name: string | null;
  source: string;
  created_at: string;
  updated_at: string;
}

/**
 * Upsert a customer profile by (instructor_id, phone_number).
 * Returns the created or existing row.
 *
 * - phoneNumber is normalized to E.164-safe format before insert.
 * - source must be one of the CHECK-constrained values.
 *   Default is 'manual' (safest; use 'sim_harness' if that migration has been applied).
 */
export async function createOrGetCustomerProfile(
  instructorId: string,
  phoneNumber: string,
  displayName: string,
  source: CustomerSource = 'manual'
): Promise<SimCustomerProfile> {
  const phone = normalizePhone(phoneNumber);
  const rows = await sql<SimCustomerProfile[]>`
    INSERT INTO customer_profiles (instructor_id, phone_number, display_name, source, first_seen_at, last_seen_at, updated_at)
    VALUES (${instructorId}, ${phone}, ${displayName}, ${source}, NOW(), NOW(), NOW())
    ON CONFLICT (instructor_id, phone_number)
    DO UPDATE SET
      display_name = COALESCE(EXCLUDED.display_name, customer_profiles.display_name),
      last_seen_at = NOW(),
      updated_at = NOW()
    RETURNING id, instructor_id, phone_number, display_name, source, created_at, updated_at
  `;
  if (rows.length === 0) {
    throw new Error(`Failed to upsert customer profile for ${phone}`);
  }
  return rows[0];
}

// ---------------------------------------------------------------------------
// B) listAuditSince
// ---------------------------------------------------------------------------

export interface SimAuditRow {
  id: string;
  created_at: string;
  actor_type: string;
  actor_id: string | null;
  action: string;
  event_type: string | null;
  entity_type: string;
  entity_id: string | null;
  severity: string;
  payload: Record<string, unknown> | null;
}

/**
 * Returns audit_log rows where created_at >= ts, ordered ASC.
 */
export async function listAuditSince(
  ts: string,
  limit: number = 200
): Promise<SimAuditRow[]> {
  return sql<SimAuditRow[]>`
    SELECT id, created_at, actor_type, actor_id, action, event_type, entity_type, entity_id, severity, payload
    FROM audit_log
    WHERE created_at >= ${ts}::timestamptz
    ORDER BY created_at ASC
    LIMIT ${limit}
  `;
}

// ---------------------------------------------------------------------------
// C) listBookingsSince
// ---------------------------------------------------------------------------

export interface SimBookingRow {
  id: string;
  status: string;
  start_time: string | null;
  end_time: string | null;
  customer_id: string | null;
  customer_name: string | null;
  created_at: string;
}

/**
 * Returns bookings for an instructor created since ts.
 */
export async function listBookingsSince(
  ts: string,
  instructorId: string
): Promise<SimBookingRow[]> {
  return sql<SimBookingRow[]>`
    SELECT id, status, start_time, end_time, customer_id, customer_name, created_at
    FROM bookings
    WHERE instructor_id = ${instructorId}
      AND created_at >= ${ts}::timestamptz
    ORDER BY created_at ASC
  `;
}

// ---------------------------------------------------------------------------
// D) listConversationAuditSince
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// E) seedBookingForTest — create a booking directly for test prerequisites
// ---------------------------------------------------------------------------

export interface SeedBookingParams {
  instructorId: string;
  customerId: string;
  startTime: Date;
  endTime: Date;
  /** Default 'confirmed'. Use 'completed' for repeat-booking tests. */
  status?: 'confirmed' | 'completed';
  notes?: string;
  customerName?: string;
}

/**
 * Creates a booking via direct INSERT for test/seed purposes.
 * Does NOT use the state machine or business logic — this is raw seed data.
 *
 * Idempotent: if a booking already exists for this instructor+customer at the
 * same start_time, it returns the existing row without inserting a duplicate.
 *
 * Dev-only. MUST NOT be called from production routes.
 */
export async function seedBookingForTest(
  params: SeedBookingParams
): Promise<{ id: string; status: string }> {
  const {
    instructorId,
    customerId,
    startTime,
    endTime,
    status = 'confirmed',
    notes = null,
    customerName = null,
  } = params;

  // Check for existing booking at this exact time (idempotent)
  const existing = await sql<Array<{ id: string; status: string }>>`
    SELECT id, status FROM bookings
    WHERE instructor_id = ${instructorId}::uuid
      AND customer_id = ${customerId}::uuid
      AND start_time = ${startTime.toISOString()}::timestamptz
    LIMIT 1
  `;
  if (existing.length > 0) return existing[0];

  const rows = await sql<Array<{ id: string; status: string }>>`
    INSERT INTO bookings (
      instructor_id, customer_id, customer_name,
      start_time, end_time, status, notes,
      booking_date, created_at, updated_at
    ) VALUES (
      ${instructorId}::uuid,
      ${customerId}::uuid,
      ${customerName},
      ${startTime.toISOString()}::timestamptz,
      ${endTime.toISOString()}::timestamptz,
      ${status},
      ${notes},
      ${startTime.toISOString().slice(0, 10)}::date,
      NOW(),
      NOW()
    )
    RETURNING id, status
  `;
  if (rows.length === 0) {
    throw new Error('Failed to seed booking for test');
  }
  return rows[0];
}

// ---------------------------------------------------------------------------
// F) listConversationAuditSince
// ---------------------------------------------------------------------------

/**
 * Returns audit_log rows for a specific conversation since ts.
 */
export async function listConversationAuditSince(
  ts: string,
  conversationId: string,
  limit: number = 100
): Promise<SimAuditRow[]> {
  return sql<SimAuditRow[]>`
    SELECT id, created_at, actor_type, actor_id, action, event_type, entity_type, entity_id, severity, payload
    FROM audit_log
    WHERE entity_type = 'conversation'
      AND entity_id = ${conversationId}
      AND created_at >= ${ts}::timestamptz
    ORDER BY created_at ASC
    LIMIT ${limit}
  `;
}

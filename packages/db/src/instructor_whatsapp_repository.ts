import { sql } from './client.js';

/**
 * Assumes table instructor_whatsapp_accounts exists with:
 * instructor_id UUID PRIMARY KEY REFERENCES instructor_profiles(id),
 * phone_number TEXT,
 * provider TEXT,
 * status TEXT,
 * connected_at TIMESTAMPTZ NULL,
 * created_at TIMESTAMPTZ,
 * updated_at TIMESTAMPTZ
 */

export interface InstructorWhatsappAccount {
  instructor_id: string;
  phone_number: string;
  phone_number_id: string | null;
  provider: string;
  status: string;
  connected_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Gets the instructor's WhatsApp account if linked.
 *
 * @param instructorId - Instructor ID (instructor_profiles.id)
 * @returns Account row or null
 */
export async function getInstructorWhatsappAccount(
  instructorId: string
): Promise<InstructorWhatsappAccount | null> {
  const result = await sql<InstructorWhatsappAccount[]>`
    SELECT
      instructor_id,
      phone_number,
      phone_number_id,
      provider,
      status,
      connected_at,
      created_at,
      updated_at
    FROM instructor_whatsapp_accounts
    WHERE instructor_id = ${instructorId}
    LIMIT 1
  `;
  return result.length === 0 ? null : result[0];
}

/**
 * Creates or replaces the instructor's WhatsApp link. Sets status='pending', provider='whatsapp_business'.
 * No OTP, no webhook, no messaging — linking only.
 *
 * @param instructorId - Instructor ID
 * @param phoneNumber - E.164-style phone number (e.g. +393401234567)
 * @returns The upserted account row
 */
export async function connectInstructorWhatsappAccount(
  instructorId: string,
  phoneNumber: string
): Promise<InstructorWhatsappAccount> {
  const result = await sql<InstructorWhatsappAccount[]>`
    INSERT INTO instructor_whatsapp_accounts (
      instructor_id,
      phone_number,
      provider,
      status,
      created_at,
      updated_at
    )
    VALUES (
      ${instructorId},
      ${phoneNumber},
      'whatsapp_business',
      'pending',
      NOW(),
      NOW()
    )
    ON CONFLICT (instructor_id) DO UPDATE SET
      phone_number = EXCLUDED.phone_number,
      provider = EXCLUDED.provider,
      status = EXCLUDED.status,
      updated_at = NOW()
    RETURNING
      instructor_id,
      phone_number,
      phone_number_id,
      provider,
      status,
      connected_at,
      created_at,
      updated_at
  `;
  return result[0];
}

export type VerifyInstructorWhatsappParams = {
  instructorId: string;
};

/**
 * Sets instructor WhatsApp account to verified (admin-only). Sets status='verified', connected_at=NOW().
 * No webhook, no Meta API — state only.
 *
 * @param instructorId - Instructor ID (instructor_profiles.id)
 * @returns Updated account row
 */
export async function verifyInstructorWhatsappAccount(
  instructorId: string
): Promise<InstructorWhatsappAccount> {
  const result = await sql<InstructorWhatsappAccount[]>`
    UPDATE instructor_whatsapp_accounts
    SET
      status = 'verified',
      connected_at = NOW(),
      updated_at = NOW()
    WHERE instructor_id = ${instructorId}
    RETURNING
      instructor_id,
      phone_number,
      phone_number_id,
      provider,
      status,
      connected_at,
      created_at,
      updated_at
  `;

  if (result.length === 0) {
    throw new Error('INSTRUCTOR_WHATSAPP_NOT_FOUND');
  }

  return result[0];
}

// ── Multi-tenant webhook routing ────────────────────────────────────────────

/**
 * Looks up instructor_id by Meta's phone_number_id (fast path for known numbers).
 *
 * @param phoneNumberId - Meta's phone_number_id from the webhook payload
 * @returns instructor_id or null if not found
 */
export async function getInstructorIdByPhoneNumberId(
  phoneNumberId: string,
): Promise<string | null> {
  const rows = await sql<Array<{ instructor_id: string }>>`
    SELECT instructor_id
    FROM instructor_whatsapp_accounts
    WHERE phone_number_id = ${phoneNumberId}
    LIMIT 1
  `;
  return rows.length > 0 ? rows[0].instructor_id : null;
}

/**
 * Auto-associates a Meta phone_number_id to an instructor by matching the
 * display_phone_number (E.164 normalized) against rows where phone_number_id is NULL.
 *
 * This handles the first-message scenario: the instructor registered their
 * phone number during onboarding/settings but Meta's phone_number_id was not
 * known until the first webhook delivery.
 *
 * @param normalizedPhone - The display_phone_number from the webhook, normalized to E.164
 * @param phoneNumberId - Meta's phone_number_id to associate
 * @returns instructor_id if association succeeded, null if no matching row found
 */
export async function autoAssociatePhoneNumberId(
  normalizedPhone: string,
  phoneNumberId: string,
): Promise<string | null> {
  const rows = await sql<Array<{ instructor_id: string }>>`
    UPDATE instructor_whatsapp_accounts
    SET phone_number_id = ${phoneNumberId},
        phone_number = ${normalizedPhone},
        status = 'verified',
        connected_at = COALESCE(connected_at, NOW()),
        updated_at = NOW()
    WHERE phone_number = ${normalizedPhone}
      AND phone_number_id IS NULL
    RETURNING instructor_id
  `;
  return rows.length > 0 ? rows[0].instructor_id : null;
}

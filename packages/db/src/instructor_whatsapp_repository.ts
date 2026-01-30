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
      provider,
      status,
      connected_at,
      created_at,
      updated_at
  `;
  return result[0];
}

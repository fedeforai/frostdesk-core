import { sql } from './client.js';

/**
 * Table instructor_whatsapp_accounts: one row per instructor.
 * Columns: instructor_id, phone_number, provider, status, connected_at, created_at, updated_at,
 * phone_number_id (Meta Cloud API), waba_id (optional).
 */

export interface InstructorWhatsappAccount {
  instructor_id: string;
  phone_number: string;
  provider: string;
  status: string;
  connected_at: string | null;
  created_at: string;
  updated_at: string;
  phone_number_id: string | null;
  waba_id: string | null;
}

/**
 * Gets the instructor's WhatsApp account if linked.
 *
 * @param instructorId - Instructor ID (instructor_profiles.id)
 * @returns Account row or null
 */
/**
 * Returns instructor_id for the given Meta phone_number_id, or null if not found.
 * Used by the webhook to route inbound messages to the correct instructor.
 */
export async function getInstructorIdByPhoneNumberId(
  phoneNumberId: string
): Promise<string | null> {
  const result = await sql<Array<{ instructor_id: string }>>`
    SELECT instructor_id
    FROM instructor_whatsapp_accounts
    WHERE phone_number_id = ${phoneNumberId}
    LIMIT 1
  `;
  return result.length === 0 ? null : result[0].instructor_id;
}

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
      updated_at,
      phone_number_id,
      waba_id
    FROM instructor_whatsapp_accounts
    WHERE instructor_id = ${instructorId}
    LIMIT 1
  `;
  return result.length === 0 ? null : result[0];
}

export interface ListInstructorWhatsappAccountRow {
  instructor_id: string;
  phone_number: string;
  status: string;
  connected_at: string | null;
  created_at: string;
  full_name: string | null;
}

/**
 * Lists instructor WhatsApp accounts for admin. Optional filter by status.
 */
export async function listInstructorWhatsappAccounts(options?: {
  status?: 'pending' | 'verified';
}): Promise<ListInstructorWhatsappAccountRow[]> {
  const statusFilter = options?.status;
  if (statusFilter) {
    const result = await sql<ListInstructorWhatsappAccountRow[]>`
      SELECT
        iwa.instructor_id,
        iwa.phone_number,
        iwa.status,
        iwa.connected_at,
        iwa.created_at,
        ip.full_name
      FROM instructor_whatsapp_accounts iwa
      LEFT JOIN instructor_profiles ip ON ip.id = iwa.instructor_id
      WHERE iwa.status = ${statusFilter}
      ORDER BY iwa.created_at DESC
    `;
    return result;
  }
  const result = await sql<ListInstructorWhatsappAccountRow[]>`
    SELECT
      iwa.instructor_id,
      iwa.phone_number,
      iwa.status,
      iwa.connected_at,
      iwa.created_at,
      ip.full_name
    FROM instructor_whatsapp_accounts iwa
    LEFT JOIN instructor_profiles ip ON ip.id = iwa.instructor_id
    ORDER BY iwa.created_at DESC
  `;
  return result;
}

export interface ConnectInstructorWhatsappParams {
  instructorId: string;
  phoneNumber: string;
  phoneNumberId?: string | null;
  wabaId?: string | null;
}

/**
 * Creates or replaces the instructor's WhatsApp link. Sets status='pending', provider='whatsapp_business'.
 * When Meta Cloud API identifiers are provided, stores them for webhook routing and outbound send.
 *
 * @param params - instructorId, phoneNumber, optional phoneNumberId and wabaId from Meta
 * @returns The upserted account row
 */
export async function connectInstructorWhatsappAccount(
  instructorIdOrParams: string | ConnectInstructorWhatsappParams,
  phoneNumber?: string
): Promise<InstructorWhatsappAccount> {
  const instructorId =
    typeof instructorIdOrParams === 'object'
      ? instructorIdOrParams.instructorId
      : instructorIdOrParams;
  const phone =
    typeof instructorIdOrParams === 'object'
      ? instructorIdOrParams.phoneNumber
      : (phoneNumber ?? '');
  const phoneNumberId =
    typeof instructorIdOrParams === 'object' ? instructorIdOrParams.phoneNumberId ?? null : null;
  const wabaId =
    typeof instructorIdOrParams === 'object' ? instructorIdOrParams.wabaId ?? null : null;

  const result = await sql<InstructorWhatsappAccount[]>`
    INSERT INTO instructor_whatsapp_accounts (
      instructor_id,
      phone_number,
      provider,
      status,
      phone_number_id,
      waba_id,
      created_at,
      updated_at
    )
    VALUES (
      ${instructorId},
      ${phone},
      'whatsapp_business',
      'pending',
      ${phoneNumberId},
      ${wabaId},
      NOW(),
      NOW()
    )
    ON CONFLICT (instructor_id) DO UPDATE SET
      phone_number = EXCLUDED.phone_number,
      provider = EXCLUDED.provider,
      status = EXCLUDED.status,
      phone_number_id = COALESCE(EXCLUDED.phone_number_id, instructor_whatsapp_accounts.phone_number_id),
      waba_id = COALESCE(EXCLUDED.waba_id, instructor_whatsapp_accounts.waba_id),
      updated_at = NOW()
    RETURNING
      instructor_id,
      phone_number,
      provider,
      status,
      connected_at,
      created_at,
      updated_at,
      phone_number_id,
      waba_id
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
      provider,
      status,
      connected_at,
      created_at,
      updated_at,
      phone_number_id,
      waba_id
  `;

  if (result.length === 0) {
    throw new Error('INSTRUCTOR_WHATSAPP_NOT_FOUND');
  }

  return result[0];
}

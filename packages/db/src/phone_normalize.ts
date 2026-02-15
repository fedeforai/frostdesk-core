/**
 * Normalizes a phone number to E.164 format.
 *
 * Rules:
 *   - Strips whitespace, dashes, parentheses, dots
 *   - Ensures leading '+'
 *   - Validates digits-only after '+'
 *   - Returns null for empty/invalid input (never throws in production)
 *
 * WhatsApp sends numbers like "447712345021" (no +).
 * Without normalization, "447712345021" and "+447712345021" would create
 * two different customer_profiles rows → silent duplicate.
 *
 * @param raw - Raw phone string from any source
 * @returns E.164 phone string (e.g. "+447712345021") or null if invalid
 */
export function normalizePhoneE164(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== 'string') return null;

  let phone = raw.trim().replace(/[\s\-().]/g, '');
  if (phone === '') return null;

  if (!phone.startsWith('+')) phone = `+${phone}`;

  const digits = phone.slice(1);
  // E.164: between 7 and 15 digits
  if (!/^\d{7,15}$/.test(digits)) return null;

  return phone;
}

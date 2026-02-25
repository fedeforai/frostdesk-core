import { createHmac } from 'crypto';

/**
 * Verifies WhatsApp webhook signature (Meta sends X-Hub-Signature-256: sha256=<hmac_hex>).
 * Uses raw request body and META_WHATSAPP_APP_SECRET.
 */
export function verifyWhatsappSignature({
  payload,
  signature,
  secret,
}: {
  payload: string;
  signature: string;
  secret: string;
}): boolean {
  if (!payload || !signature || !secret) {
    return false;
  }

  const expectedSignature = createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  const providedSignature = signature.replace('sha256=', '');

  return expectedSignature === providedSignature;
}

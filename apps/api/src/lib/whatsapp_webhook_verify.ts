/**
 * WhatsApp Webhook Signature Verification
 *
 * Meta signs webhook payloads with HMAC-SHA256 using the App Secret.
 * The signature is sent in the X-Hub-Signature-256 header as "sha256=<hex>".
 *
 * Reference: https://developers.facebook.com/docs/graph-api/webhooks/getting-started#verification-requests
 */

import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Verifies the HMAC-SHA256 signature of a WhatsApp/Meta webhook payload.
 *
 * @param rawBody - The raw request body as a Buffer
 * @param signature - The X-Hub-Signature-256 header value (format: "sha256=<hex>")
 * @param appSecret - The Meta App Secret used as HMAC key
 * @returns true if the signature is valid
 */
export function verifyWhatsAppSignature(
  rawBody: Buffer,
  signature: string,
  appSecret: string,
): boolean {
  if (!signature || !signature.startsWith('sha256=')) {
    return false;
  }

  const expectedHex = signature.slice('sha256='.length);
  if (!expectedHex || expectedHex.length === 0) {
    return false;
  }

  const computed = createHmac('sha256', appSecret)
    .update(rawBody)
    .digest('hex');

  try {
    return timingSafeEqual(
      Buffer.from(computed, 'hex'),
      Buffer.from(expectedHex, 'hex'),
    );
  } catch {
    return false;
  }
}

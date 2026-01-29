import { createHmac } from 'crypto';

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

import { describe, it, expect } from 'vitest';
import { createHmac } from 'node:crypto';
import { verifyWhatsAppSignature } from './whatsapp_webhook_verify.js';

const APP_SECRET = 'test_app_secret_12345';

function sign(body: Buffer, secret: string): string {
  const hmac = createHmac('sha256', secret).update(body).digest('hex');
  return `sha256=${hmac}`;
}

describe('verifyWhatsAppSignature', () => {
  it('returns true for valid signature', () => {
    const body = Buffer.from('{"entry":[]}');
    const sig = sign(body, APP_SECRET);
    expect(verifyWhatsAppSignature(body, sig, APP_SECRET)).toBe(true);
  });

  it('returns false for wrong signature', () => {
    const body = Buffer.from('{"entry":[]}');
    const sig = sign(body, 'wrong_secret');
    expect(verifyWhatsAppSignature(body, sig, APP_SECRET)).toBe(false);
  });

  it('returns false for tampered body', () => {
    const body = Buffer.from('{"entry":[]}');
    const sig = sign(body, APP_SECRET);
    const tampered = Buffer.from('{"entry":[{"hacked":true}]}');
    expect(verifyWhatsAppSignature(tampered, sig, APP_SECRET)).toBe(false);
  });

  it('returns false for empty signature', () => {
    const body = Buffer.from('{}');
    expect(verifyWhatsAppSignature(body, '', APP_SECRET)).toBe(false);
  });

  it('returns false for missing sha256= prefix', () => {
    const body = Buffer.from('{}');
    expect(verifyWhatsAppSignature(body, 'abc123', APP_SECRET)).toBe(false);
  });

  it('returns false for sha256= with empty hex', () => {
    const body = Buffer.from('{}');
    expect(verifyWhatsAppSignature(body, 'sha256=', APP_SECRET)).toBe(false);
  });

  it('returns false for malformed hex', () => {
    const body = Buffer.from('{}');
    expect(verifyWhatsAppSignature(body, 'sha256=not-valid-hex!!', APP_SECRET)).toBe(false);
  });
});

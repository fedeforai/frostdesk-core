/**
 * WhatsApp Cloud API — Human-triggered outbound only
 *
 * This module:
 * - Does NOT decide when to send
 * - Does NOT retry
 * - Does NOT persist anything
 * - Does NOT log sensitive data
 * - Is NOT called by the AI orchestrator
 *
 * It only does: given a number + text → try to send via WhatsApp Cloud API.
 */

const GRAPH_API_VERSION = 'v19.0';
const GRAPH_BASE = 'https://graph.facebook.com';

export const ENV_NOT_CONFIGURED = 'ENV_NOT_CONFIGURED';

export interface SendWhatsAppTextParams {
  to: string;
  text: string;
  /** Meta phone_number_id for this WABA; if omitted, uses META_WHATSAPP_PHONE_NUMBER_ID */
  phoneNumberId?: string | null;
  /** Bearer token for this number; if omitted, uses META_WHATSAPP_TOKEN */
  token?: string | null;
  context?: {
    conversationId?: string;
    messageId?: string;
  };
}

export interface SendWhatsAppTextResult {
  ok: true;
  externalMessageId?: string;
}

/**
 * Validates and normalizes "to" (E.164-ish: digits only, no leading +).
 * Meta API expects digits only, no +.
 */
function normalizeTo(to: string): string {
  const trimmed = (to || '').trim();
  if (!trimmed) {
    throw new Error('sendWhatsAppText: "to" is required and must be non-empty');
  }
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 10) {
    throw new Error('sendWhatsAppText: "to" must contain at least 10 digits');
  }
  return digits;
}

/**
 * Sends a text message via WhatsApp Cloud API.
 * Human-triggered only. No retries. Errors are thrown.
 *
 * @param params - to (E.164), text, optional context for audit
 * @returns { ok: true, externalMessageId? }
 * @throws Error with code ENV_NOT_CONFIGURED if env vars missing; name WHATSAPP_SEND_FAILED on non-2xx
 */
export async function sendWhatsAppText(
  params: SendWhatsAppTextParams
): Promise<SendWhatsAppTextResult> {
  const token =
    params.token != null && String(params.token).trim()
      ? String(params.token).trim()
      : process.env.META_WHATSAPP_TOKEN;
  const phoneNumberId =
    params.phoneNumberId != null && String(params.phoneNumberId).trim()
      ? String(params.phoneNumberId).trim()
      : process.env.META_WHATSAPP_PHONE_NUMBER_ID;

  if (!token || typeof token !== 'string' || !token.trim()) {
    const err = new Error('META_WHATSAPP_TOKEN is required (or pass token in params)');
    (err as any).code = ENV_NOT_CONFIGURED;
    throw err;
  }
  if (!phoneNumberId || typeof phoneNumberId !== 'string' || !phoneNumberId.trim()) {
    const err = new Error('META_WHATSAPP_PHONE_NUMBER_ID is required (or pass phoneNumberId in params)');
    (err as any).code = ENV_NOT_CONFIGURED;
    throw err;
  }

  const text = typeof params.text === 'string' ? params.text.trim() : '';
  if (!text) {
    throw new Error('sendWhatsAppText: "text" is required and must be non-empty');
  }

  const to = normalizeTo(params.to);

  const url = `${GRAPH_BASE}/${GRAPH_API_VERSION}/${phoneNumberId}/messages`;
  const body = {
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { body: text },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const rawBody = await response.text();
  if (!response.ok) {
    const err = new Error(
      `WHATSAPP_SEND_FAILED: HTTP ${response.status} ${response.statusText}`
    );
    err.name = 'WHATSAPP_SEND_FAILED';
    (err as any).code = 'WHATSAPP_SEND_FAILED';
    (err as any).status = response.status;
    throw err;
  }

  let externalMessageId: string | undefined;
  try {
    const data = JSON.parse(rawBody) as { messages?: Array<{ id?: string }> };
    externalMessageId = data?.messages?.[0]?.id;
  } catch {
    // Response was 2xx but not JSON or missing messages; still success
  }

  return { ok: true, externalMessageId };
}

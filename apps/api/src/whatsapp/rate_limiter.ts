/**
 * In-memory rate limiter for WhatsApp Cloud API (per phone_number_id).
 * Token-bucket style: refill maxPerSecond tokens every second.
 */

const DEFAULT_MAX_PER_SECOND = 80;

let tokens = DEFAULT_MAX_PER_SECOND;
let lastRefill = Date.now();

function getMaxPerSecond(): number {
  const n = process.env.WHATSAPP_SEND_MAX_RPS;
  if (n === undefined || n === '') return DEFAULT_MAX_PER_SECOND;
  const parsed = parseInt(n, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_PER_SECOND;
}

/**
 * Returns true if a send is allowed (consumes one token). Refills tokens every second.
 */
export function allowOutboundSend(): boolean {
  const max = getMaxPerSecond();
  const now = Date.now();
  const elapsed = (now - lastRefill) / 1000;
  if (elapsed >= 1) {
    tokens = Math.min(max, tokens + Math.floor(elapsed * max));
    lastRefill = now;
  }
  if (tokens <= 0) return false;
  tokens -= 1;
  return true;
}

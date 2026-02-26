/**
 * Google OAuth 2.0 for Calendar: build auth URL, exchange code for tokens, state sign/verify.
 * Do not log tokens or client secret.
 */

import crypto from 'crypto';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];

function getConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const redirectUri =
    process.env.GOOGLE_CALENDAR_REDIRECT_URI?.trim() ||
    (process.env.API_PUBLIC_URL
      ? `${process.env.API_PUBLIC_URL.replace(/\/$/, '')}/instructor/calendar/oauth/callback`
      : null);
  const stateSecret = process.env.GOOGLE_OAUTH_STATE_SECRET?.trim();
  return { clientId, clientSecret, redirectUri, stateSecret };
}

/**
 * Signs state payload (instructorId + exp) so callback can verify and get instructor_id.
 */
export function signState(instructorId: string): string {
  const { stateSecret } = getConfig();
  if (!stateSecret) {
    throw new Error('GOOGLE_OAUTH_STATE_SECRET is required for calendar OAuth');
  }
  const exp = Date.now() + 10 * 60 * 1000; // 10 min
  const payload = JSON.stringify({ instructorId, exp });
  const payloadB64 = Buffer.from(payload, 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', stateSecret).update(payloadB64).digest('base64url');
  return `${payloadB64}.${sig}`;
}

/**
 * Verifies state and returns instructorId. Throws if invalid or expired.
 */
export function verifyState(state: string): string {
  const { stateSecret } = getConfig();
  if (!stateSecret || !state || typeof state !== 'string') {
    throw new Error('Invalid state');
  }
  const [payloadB64, sig] = state.split('.');
  if (!payloadB64 || !sig) throw new Error('Invalid state format');
  const expectedSig = crypto.createHmac('sha256', stateSecret).update(payloadB64).digest('base64url');
  if (sig !== expectedSig) throw new Error('Invalid state signature');
  const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
  if (Date.now() > payload.exp) throw new Error('State expired');
  if (!payload.instructorId) throw new Error('Missing instructorId in state');
  return payload.instructorId;
}

/**
 * Returns the URL to redirect the user to Google consent screen.
 */
export function buildCalendarAuthUrl(state: string): string {
  const { clientId, redirectUri } = getConfig();
  if (!clientId || !redirectUri) {
    throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CALENDAR_REDIRECT_URI (or API_PUBLIC_URL) are required');
  }
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPES.join(' '),
    state,
    access_type: 'offline',
    prompt: 'consent',
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}

/**
 * Exchanges authorization code for access and refresh tokens.
 */
export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string
): Promise<GoogleTokenResponse> {
  const { clientId, clientSecret } = getConfig();
  if (!clientId || !clientSecret) {
    throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required');
  }
  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google token exchange failed: ${res.status} ${text.slice(0, 200)}`);
  }
  const data = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    token_type?: string;
  };
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: data.expires_in ?? 3600,
    token_type: data.token_type ?? 'Bearer',
  };
}

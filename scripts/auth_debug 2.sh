#!/usr/bin/env bash
# Auth Debug Protocol: verify proxy path (cookie → Next → API) and direct API path (Bearer).
# Reads cookie value from /tmp/sb_cookie.txt. Handles base64-, raw base64, raw JSON, and
# "Cookie: name=value" / "name=value" / surrounding quotes and newlines.
# Never prints full token or cookie; only lengths and small previews.
# Exits non-zero only if token invalid (dot count != 2) or either call returns 500.

COOKIE_FILE=/tmp/sb_cookie.txt
COOKIE_NAME="sb-fggheegqtghedvibisma-auth-token"
API_URL="http://localhost:3001/instructor/services"
PROXY_URL="http://localhost:3012/api/instructor/services"

if [ ! -f "$COOKIE_FILE" ]; then
  echo "Missing $COOKIE_FILE. See docs/AUTH_DEBUG_PROTOCOL.md for how to obtain the cookie."
  exit 1
fi

# Extract access_token via Node: robust parse (base64-, raw base64, raw JSON, Cookie:/name= prefix, quotes, newlines).
TOKEN=$(node -e "
const fs = require('fs');
const path = process.argv[1] || '/tmp/sb_cookie.txt';
let raw = fs.readFileSync(path, 'utf8');
raw = raw.replace(/\s+/g, '').trim();
raw = raw.replace(/^[\"']|[\"']$/g, '');
raw = raw.replace(/^Cookie:\s*/i, '');
raw = raw.replace(/^sb-[a-z0-9]+-auth-token=/i, '');
function parse(s) {
  if (!s || typeof s !== 'string') return null;
  if (s.startsWith('base64-')) {
    try {
      s = Buffer.from(s.slice(7), 'base64').toString('utf8');
    } catch { return null; }
  }
  try { return JSON.parse(s); } catch {}
  try { return JSON.parse(Buffer.from(s, 'base64').toString('utf8')); } catch {}
  return null;
}
const data = parse(raw);
const t = data && data.access_token;
if (!t) process.exit(1);
process.stdout.write(t);
" "$COOKIE_FILE")

if [ -z "$TOKEN" ]; then
  echo "Failed to extract access_token. See docs/AUTH_DEBUG_PROTOCOL.md (Sanitizing the cookie file)."
  exit 1
fi

LEN=${#TOKEN}
DOTS=$(echo -n "$TOKEN" | tr -cd '.' | wc -c | tr -d ' ')
SAFE_PREVIEW="${TOKEN:0:12}..."

echo "Token length: $LEN"
echo "Dot count: $DOTS (preview: $SAFE_PREVIEW)"

if [ "$DOTS" -ne 2 ]; then
  echo "Invalid JWT: expected 2 dots, got $DOTS."
  exit 1
fi

# Re-read cookie for proxy: use same normalization so Cookie header matches what server may receive
RAW_COOKIE=$(node -e "
const fs = require('fs');
const path = process.argv[1];
let raw = fs.readFileSync(path, 'utf8').replace(/\s+/g, '').trim();
raw = raw.replace(/^[\"']|[\"']$/g, '').replace(/^Cookie:\s*/i, '').replace(/^sb-[a-z0-9]+-auth-token=/i, '');
process.stdout.write(raw);
" "$COOKIE_FILE")

# Temp file for Cookie header (avoids quoting issues with JSON value)
CURL_COOKIE=$(mktemp)
trap 'rm -f "$CURL_COOKIE"' EXIT
printf '%s=%s' "$COOKIE_NAME" "$RAW_COOKIE" > "$CURL_COOKIE"

# 1) Direct API with Bearer (allow connection errors; we only fail on 500)
OUT_DIRECT=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $TOKEN" "$API_URL" || true)
CODE_DIRECT=$(echo "$OUT_DIRECT" | tail -n1)
BODY_DIRECT=$(echo "$OUT_DIRECT" | sed '$d')
echo "--- Direct API (Bearer) ---"
echo "HTTP response: $CODE_DIRECT"
echo "Body (first 200 chars): ${BODY_DIRECT:0:200}"
echo ""

# 2) Proxy with Cookie
OUT_PROXY=$(curl -s -w "\n%{http_code}" -b "$CURL_COOKIE" "$PROXY_URL" || true)
CODE_PROXY=$(echo "$OUT_PROXY" | tail -n1)
BODY_PROXY=$(echo "$OUT_PROXY" | sed '$d')
echo "--- Proxy (Cookie) ---"
echo "HTTP response: $CODE_PROXY"
echo "Body (first 200 chars): ${BODY_PROXY:0:200}"

if [ "$CODE_DIRECT" = "500" ] || [ "$CODE_PROXY" = "500" ]; then
  echo ""
  echo "One or both calls returned 500. See docs/AUTH_DEBUG_PROTOCOL.md."
  exit 1
fi

echo ""
echo "Auth debug OK (no 500)."

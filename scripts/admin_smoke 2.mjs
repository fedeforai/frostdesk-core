// scripts/admin_smoke.mjs
import { execSync } from "node:child_process";

function sh(cmd, env = {}) {
  return execSync(cmd, {
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, ...env },
  })
    .toString("utf8")
    .trim();
}

function parseJwt(token) {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  return JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
}

function parseHttp(raw) {
  // raw is like: "HTTP/1.1 200 OK\r\nHeader:...\r\n\r\n{...}"
  const [head, ...rest] = raw.split("\r\n\r\n");
  const body = rest.join("\r\n\r\n");
  const statusLine = (head || "").split("\r\n")[0] || "";
  const m = statusLine.match(/HTTP\/\d\.\d\s+(\d+)/);
  const status = m ? Number(m[1]) : undefined;

  let json = null;
  try {
    json = body ? JSON.parse(body) : null;
  } catch {
    json = null;
  }

  return { status, head, body, json };
}

function assertStatus(name, got, expected) {
  if (got !== expected) {
    console.error(`\n[FAIL] ${name} returned ${got}, expected ${expected}`);
    process.exit(1);
  }
}

async function main() {
  const API = process.env.API_BASE_URL || "http://127.0.0.1:3001";
  const email = process.env.TEST_EMAIL;
  const password = process.env.TEST_PASSWORD;

  if (!email || !password) {
    console.error("Missing env: TEST_EMAIL and TEST_PASSWORD");
    process.exit(1);
  }

  // Token created and used in same process
  const token = sh(`node scripts/supa_login.mjs`, {
    TEST_EMAIL: email,
    TEST_PASSWORD: password,
  }).replace(/\r?\n/g, "");

  const segments = token.split(".").length;
  console.log(`[token] len=${token.length} segments=${segments}`);
  if (segments !== 3) {
    console.error("[token] Not a valid JWT (segments != 3). Raw head:", token.slice(0, 60));
    process.exit(1);
  }

  const jwt = parseJwt(token);
  console.log("[jwt]", { sub: jwt?.sub, email: jwt?.email, aud: jwt?.aud, iss: jwt?.iss });

  const curl = (path, extra = "") =>
    sh(`curl -s -i "${API}${path}" ${extra}`);

  console.log("\n== health ==");
  const healthRaw = curl("/health");
  console.log(healthRaw);
  const health = parseHttp(healthRaw);
  assertStatus("health", health.status, 200);

  console.log("\n== debug/info (dev-only) ==");
  const debugRaw = curl("/debug/info");
  console.log(debugRaw);
  const debug = parseHttp(debugRaw);
  if (debug.status === 200) {
    const host = debug.json?.dbHost || debug.json?.databaseHost;
    if (host) console.log(`[debug] dbHost=${host}`);
  } else {
    console.log("[debug] /debug/info not available (ok if NODE_ENV=production)");
  }

  console.log("\n== admin/check (must be 200) ==");
  const checkRaw = curl("/admin/check", `-H "Authorization: Bearer ${token}"`);
  console.log(checkRaw);
  const check = parseHttp(checkRaw);

  if (check.status !== 200) {
    const hint =
      check.status === 403
        ? "Hint: user not in admin_users for the DB used by the API."
        : check.status === 500
          ? "Hint: DB connectivity issue (DNS/pooler/ssl)."
          : "Hint: auth/token issue.";
    console.error(`\n[FAIL] admin/check returned ${check.status}`);
    if (check.json) console.error("[body]", check.json);
    console.error(hint);
    process.exit(1);
  }

  console.log("\n== admin/instructors/pending ==");
  const pendingRaw = curl("/admin/instructors/pending", `-H "Authorization: Bearer ${token}"`);
  console.log(pendingRaw);
  const pending = parseHttp(pendingRaw);
  assertStatus("admin/instructors/pending", pending.status, 200);

  // Optional: approve first pending if present (never approve the current admin)
  let firstId = null;
  const pendingJson = pending.json;
  const mySub = jwt?.sub;

  if (Array.isArray(pendingJson?.items) && pendingJson.items[0]?.id) firstId = pendingJson.items[0].id;
  if (Array.isArray(pendingJson) && pendingJson[0]?.id) firstId = pendingJson[0].id;

  if (firstId && mySub && firstId === mySub) {
    console.log("\n[WARN] first pending is the current admin user. Skipping approve test.");
    firstId = null;
  }

  if (firstId) {
    console.log("\n== approve first pending ==");
    const approveRaw = curl(
      `/admin/instructors/${firstId}/approve`,
      `-X POST -H "Authorization: Bearer ${token}" -H "Content-Type: application/json" -d '{"status":"approved"}'`
    );
    console.log(approveRaw);
    const approve = parseHttp(approveRaw);
    assertStatus("approve", approve.status, 200);
  } else {
    console.log("\n(no pending instructors found, skipping approve test)");
  }

  console.log("\n[OK] admin smoke passed");
}

main().catch((e) => {
  console.error("Smoke failed:", e?.message || e);
  process.exit(1);
});

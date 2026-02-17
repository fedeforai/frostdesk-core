/**
 * Paid pilot gating: allowlist of instructor IDs.
 * Env: PILOT_INSTRUCTOR_IDS="uuid1,uuid2,..." (comma-separated, no spaces required).
 * Empty or missing env = no pilots (all instructors get 402 on gated routes).
 */

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

let cachedSet: Set<string> | null = null;

function parseAllowlist(): Set<string> {
  if (cachedSet !== null) return cachedSet;
  const raw = process.env.PILOT_INSTRUCTOR_IDS;
  if (!raw || typeof raw !== 'string') {
    cachedSet = new Set();
    return cachedSet;
  }
  const ids = raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && UUID_REGEX.test(s));
  cachedSet = new Set(ids);
  return cachedSet;
}

/**
 * Returns true if the given instructor ID is in the pilot allowlist.
 */
export function isPilotInstructor(instructorId: string): boolean {
  if (!instructorId || !UUID_REGEX.test(instructorId)) return false;
  return parseAllowlist().has(instructorId);
}

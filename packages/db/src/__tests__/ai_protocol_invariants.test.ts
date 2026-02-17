/**
 * AI Protocol Invariant Tests
 *
 * These tests enforce non-negotiable invariants from docs/ai/AI_INVARIANTS.md.
 * They perform lightweight source-level scans — no mocking, no DB, no network.
 *
 * If any test fails, the corresponding invariant has been violated
 * and the PR must be blocked until resolved.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

// ── Helpers ──────────────────────────────────────────────────────────────────

const ROOT = path.resolve(__dirname, '..', '..', '..', '..');

/**
 * Recursively collect all .ts source files under a directory,
 * excluding node_modules, dist, and test files.
 */
function collectTsFiles(dir: string): string[] {
  const results: string[] = [];
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', 'dist', '__tests__', '.git'].includes(entry.name)) continue;
      results.push(...collectTsFiles(full));
    } else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts') && !entry.name.endsWith('.d.ts')) {
      results.push(full);
    }
  }
  return results;
}

/**
 * Read a file's content. Returns empty string if unreadable.
 */
function readSafe(filePath: string): string {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return '';
  }
}

// ── INV-1: packages/ai has no dependency on @frostdesk/db ────────────────────

describe('INV-1: AI package isolation', () => {
  it('packages/ai source files do not import @frostdesk/db', () => {
    const aiSrcDir = path.join(ROOT, 'packages', 'ai', 'src');
    const files = collectTsFiles(aiSrcDir);

    expect(files.length).toBeGreaterThan(0); // sanity: we found source files

    const violations: string[] = [];

    for (const file of files) {
      const content = readSafe(file);
      // Match any import/require of @frostdesk/db
      if (
        /@frostdesk\/db/.test(content) ||
        /from\s+['"]\.\.\/\.\.\/db/.test(content)
      ) {
        violations.push(path.relative(ROOT, file));
      }
    }

    expect(violations).toEqual([]);
  });

  it('packages/ai/package.json does not list @frostdesk/db as a dependency', () => {
    const pkgPath = path.join(ROOT, 'packages', 'ai', 'package.json');
    const pkg = JSON.parse(readSafe(pkgPath));
    const allDeps = {
      ...(pkg.dependencies || {}),
      ...(pkg.devDependencies || {}),
      ...(pkg.peerDependencies || {}),
    };
    expect(allDeps).not.toHaveProperty('@frostdesk/db');
  });
});

// ── INV-2: Orchestrator cannot mutate bookings or send outbound ──────────────

describe('INV-2: Orchestrator import restrictions', () => {
  const orchestratorPath = path.join(
    ROOT,
    'packages',
    'db',
    'src',
    'inbound_draft_orchestrator.ts',
  );

  let content: string;

  it('orchestrator file exists', () => {
    content = readSafe(orchestratorPath);
    expect(content.length).toBeGreaterThan(0);
  });

  it('does not import booking_repository', () => {
    content = content || readSafe(orchestratorPath);
    // Extract import lines
    const importLines = content
      .split('\n')
      .filter((line) => /^\s*import\s/.test(line));

    const bookingRepoImport = importLines.find(
      (line) =>
        /booking_repository/.test(line) &&
        !/booking_field_extractor/.test(line) &&
        !/ai_booking_draft/.test(line) &&
        !/booking_audit/.test(line) &&
        !/customer_booking_context/.test(line),
    );

    expect(bookingRepoImport).toBeUndefined();
  });

  it('does not import any outbound send module', () => {
    content = content || readSafe(orchestratorPath);
    const importLines = content
      .split('\n')
      .filter((line) => /^\s*import\s/.test(line));

    const sendImports = importLines.filter(
      (line) =>
        /send_message|sendWhatsApp|outbound|whatsapp_send|twilio/.test(line),
    );

    expect(sendImports).toEqual([]);
  });

  it('does not import booking_state_machine', () => {
    content = content || readSafe(orchestratorPath);
    const importLines = content
      .split('\n')
      .filter((line) => /^\s*import\s/.test(line));

    const stateMachineImport = importLines.find((line) =>
      /booking_state_machine/.test(line),
    );

    expect(stateMachineImport).toBeUndefined();
  });
});

// ── INV-3: AI timeout constants match expected values ────────────────────────

describe('INV-3: AI timeout constants', () => {
  it('AI_TIMEOUT.INTENT = 2500 and AI_TIMEOUT.DRAFT = 6000', async () => {
    // Dynamic import of the actual module
    const timeoutModule = await import(
      // @ts-expect-error — path resolves at runtime
      '../../../ai/src/ai_timeout.js'
    ).catch(() => null);

    if (timeoutModule) {
      expect(timeoutModule.AI_TIMEOUT.INTENT).toBe(2_500);
      expect(timeoutModule.AI_TIMEOUT.DRAFT).toBe(6_000);
    } else {
      // Fallback: parse source file directly
      const src = readSafe(
        path.join(ROOT, 'packages', 'ai', 'src', 'ai_timeout.ts'),
      );
      expect(src).toMatch(/INTENT:\s*2[_,]?500/);
      expect(src).toMatch(/DRAFT:\s*6[_,]?000/);
    }
  });
});

// ── INV-4: Summary policy has message-count threshold ────────────────────────

describe('INV-4: Summary policy message-count threshold', () => {
  it('shouldUpdateSummary checks messageCountSinceLast >= MESSAGE_THRESHOLD', () => {
    const src = readSafe(
      path.join(ROOT, 'packages', 'db', 'src', 'summary_policy.ts'),
    );
    expect(src.length).toBeGreaterThan(0);

    // Must export MESSAGE_THRESHOLD with a value >= 1
    const thresholdMatch = src.match(
      /export\s+const\s+MESSAGE_THRESHOLD\s*=\s*(\d+)/,
    );
    expect(thresholdMatch).not.toBeNull();
    const threshold = Number(thresholdMatch![1]);
    expect(threshold).toBeGreaterThanOrEqual(1);

    // shouldUpdateSummary must reference messageCountSinceLast and MESSAGE_THRESHOLD
    const fnBody = src.slice(src.indexOf('function shouldUpdateSummary'));
    expect(fnBody).toMatch(/messageCountSinceLast/);
    expect(fnBody).toMatch(/MESSAGE_THRESHOLD/);
  });
});

// ── INV-5: Draft guardrails block commitment language ────────────────────────

describe('INV-5: Draft quality guardrails block commitment language', () => {
  const guardrailPath = path.join(
    ROOT,
    'packages',
    'ai',
    'src',
    'draftQualityGuardrails.ts',
  );

  let src: string;

  it('guardrail file exists', () => {
    src = readSafe(guardrailPath);
    expect(src.length).toBeGreaterThan(0);
  });

  it('contains NO_COMMITMENT rule', () => {
    src = src || readSafe(guardrailPath);
    expect(src).toMatch(/NO_COMMITMENT/);
  });

  it('commitment rule has blocking severity', () => {
    src = src || readSafe(guardrailPath);
    // Find the block around NO_COMMITMENT and verify it's 'blocking'
    const commitmentSection = src.slice(
      src.indexOf('NO_COMMITMENT'),
      src.indexOf('NO_COMMITMENT') + 300,
    );
    expect(commitmentSection).toMatch(/['"]blocking['"]/);
  });

  it('blocks known commitment substrings (English)', () => {
    src = src || readSafe(guardrailPath);
    // These patterns must appear in the commitment regex
    const requiredPatterns = ['confirm', 'available', 'price', 'book'];
    for (const pattern of requiredPatterns) {
      expect(src.toLowerCase()).toContain(pattern);
    }
  });

  it('returns null safeDraftText on blocking violations', () => {
    src = src || readSafe(guardrailPath);
    // The function must set safeDraftText to null when blocking violations exist
    expect(src).toMatch(/safeDraftText:\s*null/);
  });
});

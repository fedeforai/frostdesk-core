/**
 * Minimal unit test: policy_context includes cancellation fields and summary is deterministic.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./instructor_policy_document_repository.js', () => ({
  getInstructorPolicyDocument: vi.fn(),
}));

import { buildPolicyContext } from './instructor_policy_context.js';
import { getInstructorPolicyDocument } from './instructor_policy_document_repository.js';

const instructorId = '11111111-1111-1111-1111-111111111111';

describe('buildPolicyContext', () => {
  beforeEach(() => {
    vi.mocked(getInstructorPolicyDocument).mockReset();
  });

  it('policy_context includes cancellation fields', async () => {
    vi.mocked(getInstructorPolicyDocument).mockResolvedValue({
      instructor_id: instructorId,
      structured: {
        cancellation: {
          notice_hours: 24,
          refund_percent_before: 100,
          refund_percent_after: 50,
        },
      },
      freeform: '',
      version: 1,
      updated_by: null,
      updated_at: '2026-02-13T12:00:00Z',
    });

    const ctx = await buildPolicyContext(instructorId);

    expect(ctx.rules.some((r) => r.includes('Cancellation') && r.includes('24') && r.includes('refund'))).toBe(true);
    expect(ctx.summary).toContain('cancellation');
    expect(ctx.summary).toContain('24');
    expect(ctx.snippets.length).toBeGreaterThan(0);
  });

  it('summary is deterministic for same input', async () => {
    const doc = {
      instructor_id: instructorId,
      structured: {
        cancellation: { notice_hours: 48 },
        no_show: { charge_percent: 100 },
      },
      freeform: 'Custom terms apply.',
      version: 1,
      updated_by: null,
      updated_at: '2026-02-13T12:00:00Z',
    };
    vi.mocked(getInstructorPolicyDocument).mockResolvedValue(doc);

    const ctx1 = await buildPolicyContext(instructorId);
    const ctx2 = await buildPolicyContext(instructorId);

    expect(ctx1.summary).toBe(ctx2.summary);
    expect(ctx1.rules).toEqual(ctx2.rules);
    expect(ctx1.snippets).toEqual(ctx2.snippets);
  });
});

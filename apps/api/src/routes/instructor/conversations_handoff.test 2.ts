/**
 * Loop 5: Handoff & referrals — API tests.
 * GET /instructor/referrals, POST /instructor/conversations/:id/handoff.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import Fastify from 'fastify';
import { instructorConversationsHandoffRoutes } from './conversations_handoff.js';
import { ConversationNotFoundError, HandoffNotOwnerError, HandoffConflictError } from '@frostdesk/db';

const mockGetUserIdFromJwt = vi.fn();
const mockGetInstructorProfileByUserId = vi.fn();
const mockListReferralsForInstructor = vi.fn();
const mockIsReferredInstructor = vi.fn();
const mockRecordHandoff = vi.fn();

vi.mock('../../lib/auth_instructor.js', () => ({
  getUserIdFromJwt: (...args: unknown[]) => mockGetUserIdFromJwt(...args),
}));

vi.mock('@frostdesk/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@frostdesk/db')>();
  return {
    ...actual,
    getInstructorProfileByUserId: (...args: unknown[]) =>
      mockGetInstructorProfileByUserId(...args),
    listReferralsForInstructor: (...args: unknown[]) =>
      mockListReferralsForInstructor(...args),
    isReferredInstructor: (...args: unknown[]) => mockIsReferredInstructor(...args),
    recordHandoff: (...args: unknown[]) => mockRecordHandoff(...args),
  };
});

const INSTRUCTOR_ID = 'instructor-1';
const CONV_ID = 'conv-1';
const TO_INSTRUCTOR_ID = 'instructor-2';

function buildApp() {
  const app = Fastify();
  app.register(instructorConversationsHandoffRoutes);
  return app;
}

function mockAuth() {
  mockGetUserIdFromJwt.mockResolvedValue('user-id');
  mockGetInstructorProfileByUserId.mockResolvedValue({ id: INSTRUCTOR_ID });
}

describe('GET /instructor/referrals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth();
  });

  it('returns empty referrals list', async () => {
    mockListReferralsForInstructor.mockResolvedValue([]);
    const app = buildApp();

    const res = await app.inject({
      method: 'GET',
      url: '/instructor/referrals',
      headers: { authorization: 'Bearer token' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ referrals: [] });
    expect(mockListReferralsForInstructor).toHaveBeenCalledWith(INSTRUCTOR_ID);
    await app.close();
  });

  it('returns referrals with display_name and location', async () => {
    mockListReferralsForInstructor.mockResolvedValue([
      {
        instructor_id: TO_INSTRUCTOR_ID,
        display_name: 'Jane Doe',
        location: 'Resort A',
      },
    ]);
    const app = buildApp();

    const res = await app.inject({
      method: 'GET',
      url: '/instructor/referrals',
      headers: { authorization: 'Bearer token' },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.referrals).toHaveLength(1);
    expect(body.referrals[0]).toMatchObject({
      instructor_id: TO_INSTRUCTOR_ID,
      display_name: 'Jane Doe',
      location: 'Resort A',
    });
    await app.close();
  });
});

describe('POST /instructor/conversations/:id/handoff', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth();
    mockIsReferredInstructor.mockResolvedValue(true);
  });

  it('handoff success returns 200 with payload', async () => {
    const handoffAt = '2026-02-08T12:00:00.000Z';
    mockRecordHandoff.mockResolvedValue({
      conversation_id: CONV_ID,
      from_instructor_id: INSTRUCTOR_ID,
      to_instructor_id: TO_INSTRUCTOR_ID,
      handoff_at: handoffAt,
    });
    const app = buildApp();

    const res = await app.inject({
      method: 'POST',
      url: `/instructor/conversations/${CONV_ID}/handoff`,
      headers: { authorization: 'Bearer token', 'content-type': 'application/json' },
      payload: { to_instructor_id: TO_INSTRUCTOR_ID, reason: 'Busy this week' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      conversation_id: CONV_ID,
      from_instructor_id: INSTRUCTOR_ID,
      to_instructor_id: TO_INSTRUCTOR_ID,
      handoff_at: handoffAt,
    });
    expect(mockIsReferredInstructor).toHaveBeenCalledWith(INSTRUCTOR_ID, TO_INSTRUCTOR_ID);
    expect(mockRecordHandoff).toHaveBeenCalledWith({
      conversationId: CONV_ID,
      fromInstructorId: INSTRUCTOR_ID,
      toInstructorId: TO_INSTRUCTOR_ID,
      reason: 'Busy this week',
      createdBy: INSTRUCTOR_ID,
    });
    await app.close();
  });

  it('returns 400 when to_instructor_id missing', async () => {
    const app = buildApp();

    const res = await app.inject({
      method: 'POST',
      url: `/instructor/conversations/${CONV_ID}/handoff`,
      headers: { authorization: 'Bearer token', 'content-type': 'application/json' },
      payload: {},
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({
      ok: false,
      error: 'MISSING_PARAMETERS',
      message: 'to_instructor_id is required',
    });
    expect(mockRecordHandoff).not.toHaveBeenCalled();
    await app.close();
  });

  it('returns 400 when to_instructor_id is current owner', async () => {
    const app = buildApp();

    const res = await app.inject({
      method: 'POST',
      url: `/instructor/conversations/${CONV_ID}/handoff`,
      headers: { authorization: 'Bearer token', 'content-type': 'application/json' },
      payload: { to_instructor_id: INSTRUCTOR_ID },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({
      ok: false,
      error: 'invalid_payload',
      message: 'to_instructor_id must be different from current owner',
    });
    expect(mockRecordHandoff).not.toHaveBeenCalled();
    await app.close();
  });

  it('returns 403 when target is not in referrals', async () => {
    mockIsReferredInstructor.mockResolvedValue(false);
    const app = buildApp();

    const res = await app.inject({
      method: 'POST',
      url: `/instructor/conversations/${CONV_ID}/handoff`,
      headers: { authorization: 'Bearer token', 'content-type': 'application/json' },
      payload: { to_instructor_id: TO_INSTRUCTOR_ID },
    });

    expect(res.statusCode).toBe(403);
    expect(res.json()).toMatchObject({
      ok: false,
      error: 'HANDOFF_TARGET_NOT_REFERRED',
      message: 'Target instructor is not in your referrals',
    });
    expect(mockRecordHandoff).not.toHaveBeenCalled();
    await app.close();
  });

  it('returns 404 when conversation not found', async () => {
    mockRecordHandoff.mockRejectedValue(new ConversationNotFoundError(CONV_ID));
    const app = buildApp();

    const res = await app.inject({
      method: 'POST',
      url: `/instructor/conversations/${CONV_ID}/handoff`,
      headers: { authorization: 'Bearer token', 'content-type': 'application/json' },
      payload: { to_instructor_id: TO_INSTRUCTOR_ID },
    });

    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({
      ok: false,
      error: 'CONVERSATION_NOT_FOUND',
    });
    await app.close();
  });

  it('returns 403 when caller is not owner', async () => {
    mockRecordHandoff.mockRejectedValue(new HandoffNotOwnerError(CONV_ID));
    const app = buildApp();

    const res = await app.inject({
      method: 'POST',
      url: `/instructor/conversations/${CONV_ID}/handoff`,
      headers: { authorization: 'Bearer token', 'content-type': 'application/json' },
      payload: { to_instructor_id: TO_INSTRUCTOR_ID },
    });

    expect(res.statusCode).toBe(403);
    expect(res.json()).toMatchObject({
      ok: false,
      error: 'HANDOFF_NOT_OWNER',
    });
    await app.close();
  });

  it('returns 409 on concurrent handoff', async () => {
    mockRecordHandoff.mockRejectedValue(new HandoffConflictError(CONV_ID));
    const app = buildApp();

    const res = await app.inject({
      method: 'POST',
      url: `/instructor/conversations/${CONV_ID}/handoff`,
      headers: { authorization: 'Bearer token', 'content-type': 'application/json' },
      payload: { to_instructor_id: TO_INSTRUCTOR_ID },
    });

    expect(res.statusCode).toBe(409);
    expect(res.json()).toMatchObject({
      ok: false,
      error: 'HANDOFF_CONFLICT',
    });
    await app.close();
  });
});

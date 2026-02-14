/**
 * Loop 6: GET /instructor/conversations/:id/timeline — read-only decision timeline.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import Fastify from 'fastify';
import { instructorConversationTimelineRoutes } from './conversation_timeline.js';

const mockGetUserIdFromJwt = vi.fn();
const mockGetInstructorProfileByUserId = vi.fn();
const mockGetConversationById = vi.fn();
const mockGetConversationDecisionTimeline = vi.fn();

vi.mock('../../lib/auth_instructor.js', () => ({
  getUserIdFromJwt: (...args: unknown[]) => mockGetUserIdFromJwt(...args),
}));

vi.mock('@frostdesk/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@frostdesk/db')>();
  return {
    ...actual,
    getInstructorProfileByUserId: (...args: unknown[]) =>
      mockGetInstructorProfileByUserId(...args),
    getConversationById: (...args: unknown[]) => mockGetConversationById(...args),
    getConversationDecisionTimeline: (...args: unknown[]) =>
      mockGetConversationDecisionTimeline(...args),
  };
});

const INSTRUCTOR_ID = 'instructor-1';
const CONV_ID = 'conv-1';

function buildApp() {
  const app = Fastify();
  app.register(instructorConversationTimelineRoutes);
  return app;
}

function mockAuth() {
  mockGetUserIdFromJwt.mockResolvedValue('user-id');
  mockGetInstructorProfileByUserId.mockResolvedValue({ id: INSTRUCTOR_ID });
}

describe('GET /instructor/conversations/:id/timeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth();
  });

  it('returns 200 with empty timeline when no events', async () => {
    mockGetConversationById.mockResolvedValue({
      id: CONV_ID,
      instructor_id: INSTRUCTOR_ID,
    });
    mockGetConversationDecisionTimeline.mockResolvedValue([]);
    const app = buildApp();

    const res = await app.inject({
      method: 'GET',
      url: `/instructor/conversations/${CONV_ID}/timeline`,
      headers: { authorization: 'Bearer token' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      conversation_id: CONV_ID,
      timeline: [],
    });
    expect(mockGetConversationDecisionTimeline).toHaveBeenCalledWith(CONV_ID);
    await app.close();
  });

  it('returns 200 with timeline ordered by timestamp', async () => {
    mockGetConversationById.mockResolvedValue({
      id: CONV_ID,
      instructor_id: INSTRUCTOR_ID,
    });
    mockGetConversationDecisionTimeline.mockResolvedValue([
      {
        timestamp: '2026-02-08T10:00:00.000Z',
        type: 'message',
        actor_type: 'human',
        actor_id: null,
        summary: 'Customer message received',
        payload: { message_id: 'm1', direction: 'inbound' },
      },
      {
        timestamp: '2026-02-08T11:00:00.000Z',
        type: 'booking_state_change',
        actor_type: 'human',
        actor_id: null,
        summary: 'Booking state: draft → pending',
        payload: { booking_id: 'b1', from: 'draft', to: 'pending' },
      },
    ]);
    const app = buildApp();

    const res = await app.inject({
      method: 'GET',
      url: `/instructor/conversations/${CONV_ID}/timeline`,
      headers: { authorization: 'Bearer token' },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.conversation_id).toBe(CONV_ID);
    expect(body.timeline).toHaveLength(2);
    expect(body.timeline[0].type).toBe('message');
    expect(body.timeline[1].type).toBe('booking_state_change');
    expect(body.timeline[0]).toMatchObject({
      timestamp: '2026-02-08T10:00:00.000Z',
      type: 'message',
      actor_type: 'human',
      summary: 'Customer message received',
    });
    await app.close();
  });

  it('returns 404 when conversation not found', async () => {
    mockGetConversationById.mockResolvedValue(null);
    const app = buildApp();

    const res = await app.inject({
      method: 'GET',
      url: `/instructor/conversations/${CONV_ID}/timeline`,
      headers: { authorization: 'Bearer token' },
    });

    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({
      ok: false,
      error: 'CONVERSATION_NOT_FOUND',
    });
    expect(mockGetConversationDecisionTimeline).not.toHaveBeenCalled();
    await app.close();
  });

  it('returns 403 when caller is not owner', async () => {
    mockGetConversationById.mockResolvedValue({
      id: CONV_ID,
      instructor_id: 'other-instructor',
    });
    const app = buildApp();

    const res = await app.inject({
      method: 'GET',
      url: `/instructor/conversations/${CONV_ID}/timeline`,
      headers: { authorization: 'Bearer token' },
    });

    expect(res.statusCode).toBe(403);
    expect(res.json()).toMatchObject({
      ok: false,
      error: 'FORBIDDEN',
      message: 'You do not own this conversation',
    });
    expect(mockGetConversationDecisionTimeline).not.toHaveBeenCalled();
    await app.close();
  });
});

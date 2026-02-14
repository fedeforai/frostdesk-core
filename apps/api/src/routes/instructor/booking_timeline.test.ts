/**
 * Loop 6: GET /instructor/bookings/:id/timeline — read-only booking timeline.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import Fastify from 'fastify';
import { instructorBookingTimelineRoutes } from './booking_timeline.js';

const mockGetUserIdFromJwt = vi.fn();
const mockGetInstructorProfileByUserId = vi.fn();
const mockGetBookingInstructorId = vi.fn();
const mockGetBookingTimeline = vi.fn();

vi.mock('../../lib/auth_instructor.js', () => ({
  getUserIdFromJwt: (...args: unknown[]) => mockGetUserIdFromJwt(...args),
}));

vi.mock('@frostdesk/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@frostdesk/db')>();
  return {
    ...actual,
    getInstructorProfileByUserId: (...args: unknown[]) =>
      mockGetInstructorProfileByUserId(...args),
    getBookingInstructorId: (...args: unknown[]) => mockGetBookingInstructorId(...args),
    getBookingTimeline: (...args: unknown[]) => mockGetBookingTimeline(...args),
  };
});

const INSTRUCTOR_ID = 'instructor-1';
const BOOKING_ID = 'booking-1';

function buildApp() {
  const app = Fastify();
  app.register(instructorBookingTimelineRoutes);
  return app;
}

function mockAuth() {
  mockGetUserIdFromJwt.mockResolvedValue('user-id');
  mockGetInstructorProfileByUserId.mockResolvedValue({ id: INSTRUCTOR_ID });
}

describe('GET /instructor/bookings/:id/timeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth();
  });

  it('returns 200 with empty timeline when no audit events', async () => {
    mockGetBookingInstructorId.mockResolvedValue(INSTRUCTOR_ID);
    mockGetBookingTimeline.mockResolvedValue([]);
    const app = buildApp();

    const res = await app.inject({
      method: 'GET',
      url: `/instructor/bookings/${BOOKING_ID}/timeline`,
      headers: { authorization: 'Bearer token' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      booking_id: BOOKING_ID,
      timeline: [],
    });
    expect(mockGetBookingTimeline).toHaveBeenCalledWith(BOOKING_ID);
    await app.close();
  });

  it('returns 200 with timeline of booking_state_change events', async () => {
    mockGetBookingInstructorId.mockResolvedValue(INSTRUCTOR_ID);
    mockGetBookingTimeline.mockResolvedValue([
      {
        timestamp: '2026-02-08T10:00:00.000Z',
        type: 'booking_state_change',
        from: 'draft',
        to: 'pending',
        actor_type: 'human',
        reason: null,
      },
      {
        timestamp: '2026-02-08T11:00:00.000Z',
        type: 'booking_state_change',
        from: 'pending',
        to: 'confirmed',
        actor_type: 'human',
        reason: null,
      },
    ]);
    const app = buildApp();

    const res = await app.inject({
      method: 'GET',
      url: `/instructor/bookings/${BOOKING_ID}/timeline`,
      headers: { authorization: 'Bearer token' },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.booking_id).toBe(BOOKING_ID);
    expect(body.timeline).toHaveLength(2);
    expect(body.timeline[0]).toMatchObject({
      timestamp: '2026-02-08T10:00:00.000Z',
      type: 'booking_state_change',
      from: 'draft',
      to: 'pending',
      actor_type: 'human',
    });
    expect(body.timeline[1].to).toBe('confirmed');
    await app.close();
  });

  it('returns 404 when booking not found', async () => {
    mockGetBookingInstructorId.mockResolvedValue(null);
    const app = buildApp();

    const res = await app.inject({
      method: 'GET',
      url: `/instructor/bookings/${BOOKING_ID}/timeline`,
      headers: { authorization: 'Bearer token' },
    });

    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({
      ok: false,
      error: 'BOOKING_NOT_FOUND',
    });
    expect(mockGetBookingTimeline).not.toHaveBeenCalled();
    await app.close();
  });

  it('returns 403 when caller is not booking owner', async () => {
    mockGetBookingInstructorId.mockResolvedValue('other-instructor');
    const app = buildApp();

    const res = await app.inject({
      method: 'GET',
      url: `/instructor/bookings/${BOOKING_ID}/timeline`,
      headers: { authorization: 'Bearer token' },
    });

    expect(res.statusCode).toBe(403);
    expect(res.json()).toMatchObject({
      ok: false,
      error: 'FORBIDDEN',
      message: 'You do not own this booking',
    });
    expect(mockGetBookingTimeline).not.toHaveBeenCalled();
    await app.close();
  });
});

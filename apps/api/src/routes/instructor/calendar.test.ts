/**
 * Loop 4: Calendar conflicts endpoint — minimal tests.
 * Read-only. No conflicts, overlapping, booking_id exclude, 400, 403, 404.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import Fastify from 'fastify';
import { instructorCalendarRoutes } from './calendar.js';

const mockGetUserIdFromJwt = vi.fn();
const mockGetInstructorProfileByUserId = vi.fn();
const mockGetCalendarConflicts = vi.fn();
const mockGetBookingInstructorId = vi.fn();

vi.mock('../../lib/auth_instructor.js', () => ({
  getUserIdFromJwt: (...args: unknown[]) => mockGetUserIdFromJwt(...args),
}));

vi.mock('@frostdesk/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@frostdesk/db')>();
  return {
    ...actual,
    getInstructorProfileByUserId: (...args: unknown[]) =>
      mockGetInstructorProfileByUserId(...args),
    getCalendarConflicts: (...args: unknown[]) => mockGetCalendarConflicts(...args),
    getBookingInstructorId: (...args: unknown[]) => mockGetBookingInstructorId(...args),
  };
});

const INSTRUCTOR_ID = 'instructor-1';
const START = '2026-02-10T09:00:00Z';
const END = '2026-02-10T10:00:00Z';

function buildApp() {
  const app = Fastify();
  app.register(instructorCalendarRoutes);
  return app;
}

function mockAuth() {
  mockGetUserIdFromJwt.mockResolvedValue('user-id');
  mockGetInstructorProfileByUserId.mockResolvedValue({ id: INSTRUCTOR_ID });
}

describe('GET /instructor/calendar/conflicts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth();
  });

  it('returns has_conflicts false when no conflicts', async () => {
    mockGetCalendarConflicts.mockResolvedValue([]);
    const app = buildApp();

    const res = await app.inject({
      method: 'GET',
      url: `/instructor/calendar/conflicts?start_time=${encodeURIComponent(START)}&end_time=${encodeURIComponent(END)}`,
      headers: { authorization: 'Bearer token' },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toEqual({ has_conflicts: false, conflicts: [] });
    expect(mockGetCalendarConflicts).toHaveBeenCalledWith({
      instructorId: INSTRUCTOR_ID,
      startTimeUtc: START,
      endTimeUtc: END,
      excludeBookingId: null,
    });
    await app.close();
  });

  it('returns has_conflicts true when overlapping event', async () => {
    mockGetCalendarConflicts.mockResolvedValue([
      {
        source: 'external_calendar',
        start_time: '2026-02-10T09:00:00Z',
        end_time: '2026-02-10T10:30:00Z',
        duration_minutes: 90,
        title: 'Busy',
        provider: 'google',
      },
    ]);
    const app = buildApp();

    const res = await app.inject({
      method: 'GET',
      url: `/instructor/calendar/conflicts?start_time=${encodeURIComponent(START)}&end_time=${encodeURIComponent(END)}`,
      headers: { authorization: 'Bearer token' },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.has_conflicts).toBe(true);
    expect(body.conflicts).toHaveLength(1);
    expect(body.conflicts[0].source).toBe('external_calendar');
    expect(body.conflicts[0].duration_minutes).toBe(90);
    await app.close();
  });

  it('passes booking_id for exclude-self and excludes from params when provided', async () => {
    mockGetBookingInstructorId.mockResolvedValue(INSTRUCTOR_ID);
    mockGetCalendarConflicts.mockResolvedValue([]);
    const app = buildApp();

    const res = await app.inject({
      method: 'GET',
      url: `/instructor/calendar/conflicts?start_time=${encodeURIComponent(START)}&end_time=${encodeURIComponent(END)}&booking_id=booking-123`,
      headers: { authorization: 'Bearer token' },
    });

    expect(res.statusCode).toBe(200);
    expect(mockGetCalendarConflicts).toHaveBeenCalledWith({
      instructorId: INSTRUCTOR_ID,
      startTimeUtc: START,
      endTimeUtc: END,
      excludeBookingId: 'booking-123',
    });
    await app.close();
  });

  it('returns 400 when start_time missing', async () => {
    const app = buildApp();

    const res = await app.inject({
      method: 'GET',
      url: `/instructor/calendar/conflicts?end_time=${encodeURIComponent(END)}`,
      headers: { authorization: 'Bearer token' },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ ok: false, error: 'MISSING_PARAMETERS' });
    await app.close();
  });

  it('returns 400 when end_time missing', async () => {
    const app = buildApp();

    const res = await app.inject({
      method: 'GET',
      url: `/instructor/calendar/conflicts?start_time=${encodeURIComponent(START)}`,
      headers: { authorization: 'Bearer token' },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ ok: false, error: 'MISSING_PARAMETERS' });
    await app.close();
  });

  it('returns 400 when start_time >= end_time', async () => {
    const app = buildApp();

    const res = await app.inject({
      method: 'GET',
      url: `/instructor/calendar/conflicts?start_time=${encodeURIComponent(END)}&end_time=${encodeURIComponent(START)}`,
      headers: { authorization: 'Bearer token' },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ ok: false, error: 'invalid_payload' });
    await app.close();
  });

  it('returns 404 when booking_id does not exist', async () => {
    mockGetBookingInstructorId.mockResolvedValue(null);
    const app = buildApp();

    const res = await app.inject({
      method: 'GET',
      url: `/instructor/calendar/conflicts?start_time=${encodeURIComponent(START)}&end_time=${encodeURIComponent(END)}&booking_id=nonexistent`,
      headers: { authorization: 'Bearer token' },
    });

    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({ ok: false, error: 'BOOKING_NOT_FOUND' });
    await app.close();
  });

  it('returns 403 when booking_id belongs to another instructor', async () => {
    mockGetBookingInstructorId.mockResolvedValue('other-instructor');
    const app = buildApp();

    const res = await app.inject({
      method: 'GET',
      url: `/instructor/calendar/conflicts?start_time=${encodeURIComponent(START)}&end_time=${encodeURIComponent(END)}&booking_id=other-booking`,
      headers: { authorization: 'Bearer token' },
    });

    expect(res.statusCode).toBe(403);
    expect(res.json()).toMatchObject({ ok: false, error: 'FORBIDDEN' });
    await app.close();
  });
});

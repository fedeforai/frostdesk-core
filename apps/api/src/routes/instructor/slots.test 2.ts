/**
 * Integration test: GET /instructor/slots/sellable
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import Fastify from 'fastify';
import { instructorSlotsRoutes } from './slots.js';

const mockGetUserIdFromJwt = vi.fn();
const mockGetInstructorProfileByUserId = vi.fn();
const mockComputeSellableSlots = vi.fn();

vi.mock('../../lib/auth_instructor.js', () => ({
  getUserIdFromJwt: (...args: unknown[]) => mockGetUserIdFromJwt(...args),
}));

vi.mock('@frostdesk/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@frostdesk/db')>();
  return {
    ...actual,
    getInstructorProfileByUserId: (...args: unknown[]) => mockGetInstructorProfileByUserId(...args),
    computeSellableSlots: (...args: unknown[]) => mockComputeSellableSlots(...args),
  };
});

const INSTRUCTOR_ID = '11111111-1111-1111-1111-111111111111';
const FROM = '2026-02-16T00:00:00.000Z';
const TO = '2026-02-17T00:00:00.000Z';

function buildApp() {
  const app = Fastify();
  app.register(instructorSlotsRoutes);
  return app;
}

function mockAuth() {
  mockGetUserIdFromJwt.mockResolvedValue('user-id');
  mockGetInstructorProfileByUserId.mockResolvedValue({ id: INSTRUCTOR_ID });
}

describe('GET /instructor/slots/sellable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth();
  });

  it('returns error when auth fails', async () => {
    mockGetUserIdFromJwt.mockRejectedValue(new Error('Missing token'));
    const app = buildApp();

    const res = await app.inject({
      method: 'GET',
      url: `/instructor/slots/sellable?from=${encodeURIComponent(FROM)}&to=${encodeURIComponent(TO)}`,
    });

    expect(res.statusCode).toBeGreaterThanOrEqual(400);
    const body = res.json();
    expect(body.ok).toBe(false);
    await app.close();
  });

  it('returns 404 when profile not found', async () => {
    mockGetInstructorProfileByUserId.mockResolvedValue(null);
    const app = buildApp();

    const res = await app.inject({
      method: 'GET',
      url: `/instructor/slots/sellable?from=${encodeURIComponent(FROM)}&to=${encodeURIComponent(TO)}`,
      headers: { authorization: 'Bearer token' },
    });

    expect(res.statusCode).toBe(404);
    await app.close();
  });

  it('returns 400 when from or to missing', async () => {
    const app = buildApp();

    const res = await app.inject({
      method: 'GET',
      url: '/instructor/slots/sellable?from=2026-02-16T00:00:00.000Z',
      headers: { authorization: 'Bearer token' },
    });

    expect(res.statusCode).toBe(400);
    await app.close();
  });

  it('returns 200 and slots from computeSellableSlots', async () => {
    mockComputeSellableSlots.mockResolvedValue([
      { start_utc: '2026-02-16T09:00:00.000Z', end_utc: '2026-02-16T10:00:00.000Z' },
    ]);
    const app = buildApp();

    const res = await app.inject({
      method: 'GET',
      url: `/instructor/slots/sellable?from=${encodeURIComponent(FROM)}&to=${encodeURIComponent(TO)}`,
      headers: { authorization: 'Bearer token' },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(Array.isArray(body.slots)).toBe(true);
    expect(body.slots).toHaveLength(1);
    expect(body.slots[0]).toEqual({ start_utc: '2026-02-16T09:00:00.000Z', end_utc: '2026-02-16T10:00:00.000Z' });
    expect(mockComputeSellableSlots).toHaveBeenCalledWith({
      instructorId: INSTRUCTOR_ID,
      fromUtc: FROM,
      toUtc: TO,
      timezone: 'UTC',
    });
    await app.close();
  });
});

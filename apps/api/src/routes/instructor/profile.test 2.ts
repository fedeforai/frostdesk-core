/**
 * Integration-style test: GET /instructor/profile (mock auth, returns 200 when profile found).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import Fastify from 'fastify';
import { instructorProfileRoutes } from './profile.js';

const mockGetUserIdFromJwt = vi.fn();
const mockGetInstructorProfileDefinitiveByUserId = vi.fn();
const mockGetInstructorProfileByUserId = vi.fn();
const mockPatchInstructorProfileByUserId = vi.fn();
const mockUpdateInstructorProfileByUserId = vi.fn();

vi.mock('../../lib/auth_instructor.js', () => ({
  getUserIdFromJwt: (...args: unknown[]) => mockGetUserIdFromJwt(...args),
}));

vi.mock('@frostdesk/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@frostdesk/db')>();
  return {
    ...actual,
    getInstructorProfileDefinitiveByUserId: (...args: unknown[]) =>
      mockGetInstructorProfileDefinitiveByUserId(...args),
    getInstructorProfileByUserId: (...args: unknown[]) => mockGetInstructorProfileByUserId(...args),
    patchInstructorProfileByUserId: (...args: unknown[]) => mockPatchInstructorProfileByUserId(...args),
    updateInstructorProfileByUserId: (...args: unknown[]) => mockUpdateInstructorProfileByUserId(...args),
  };
});

const USER_ID = 'user-11111111-1111-1111-1111-111111111111';
const INSTRUCTOR_ID = 'inst-22222222-2222-2222-2222-222222222222';

function buildApp() {
  const app = Fastify();
  app.register(instructorProfileRoutes);
  return app;
}

describe('GET /instructor/profile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserIdFromJwt.mockResolvedValue(USER_ID);
  });

  it('returns 401 when auth fails', async () => {
    mockGetUserIdFromJwt.mockRejectedValue(new Error('Missing token'));
    const app = buildApp();

    const res = await app.inject({
      method: 'GET',
      url: '/instructor/profile',
    });

    expect(res.statusCode).toBeGreaterThanOrEqual(400);
    const body = res.json();
    expect(body.ok).toBe(false);
    await app.close();
  });

  it('returns 404 when profile not found', async () => {
    mockGetInstructorProfileDefinitiveByUserId.mockResolvedValue(null);
    mockGetInstructorProfileByUserId.mockResolvedValue(null);
    const app = buildApp();

    const res = await app.inject({
      method: 'GET',
      url: '/instructor/profile',
      headers: { authorization: 'Bearer token' },
    });

    expect(res.statusCode).toBe(404);
    expect(res.json().ok).toBe(false);
    await app.close();
  });

  it('returns 200 with legacy profile when definitive returns null', async () => {
    mockGetInstructorProfileDefinitiveByUserId.mockResolvedValue(null);
    mockGetInstructorProfileByUserId.mockResolvedValue({
      id: INSTRUCTOR_ID,
      full_name: 'Mario',
      base_resort: 'Cervinia',
      working_language: 'Italian',
      contact_email: 'mario@example.com',
    });
    const app = buildApp();

    const res = await app.inject({
      method: 'GET',
      url: '/instructor/profile',
      headers: { authorization: 'Bearer token' },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(body.profile).toBeDefined();
    expect(body.profile.id).toBe(INSTRUCTOR_ID);
    expect(body.profile.full_name).toBe('Mario');
    expect(body.profile.base_resort).toBe('Cervinia');
    expect(body.profile.working_language).toBe('Italian');
    expect(body.profile.contact_email).toBe('mario@example.com');
    await app.close();
  });

  it('returns 200 with definitive profile when available', async () => {
    mockGetInstructorProfileDefinitiveByUserId.mockResolvedValue({
      id: INSTRUCTOR_ID,
      user_id: USER_ID,
      full_name: 'Mario',
      display_name: 'Mario R.',
      slug: 'mario-r',
      profile_status: 'active',
      timezone: 'Europe/Rome',
      availability_mode: 'manual',
      calendar_sync_enabled: false,
      marketing_fields: {},
      operational_fields: {},
      pricing_config: {},
      ai_config: {},
      compliance: {},
      approval_status: 'approved',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      base_resort: 'Cervinia',
      working_language: 'Italian',
      contact_email: 'mario@example.com',
      onboarding_completed_at: null,
    });
    const app = buildApp();

    const res = await app.inject({
      method: 'GET',
      url: '/instructor/profile',
      headers: { authorization: 'Bearer token' },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(body.profile.id).toBe(INSTRUCTOR_ID);
    expect(body.profile.full_name).toBe('Mario');
    expect(body.profile.display_name).toBe('Mario R.');
    expect(body.profile.profile_status).toBe('active');
    expect(body.profile.base_resort).toBe('Cervinia');
    expect(body.profile.contact_email).toBe('mario@example.com');
    await app.close();
  });
});

describe('PATCH /instructor/profile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserIdFromJwt.mockResolvedValue(USER_ID);
  });

  it('returns 200 and updates display_name when body is valid', async () => {
    const updatedProfile = {
      id: INSTRUCTOR_ID,
      user_id: USER_ID,
      full_name: 'Mario',
      display_name: 'Mario R.',
      slug: null,
      profile_status: 'active',
      timezone: 'Europe/Rome',
      availability_mode: 'manual' as const,
      calendar_sync_enabled: false,
      marketing_fields: {},
      operational_fields: {},
      pricing_config: {},
      ai_config: {},
      compliance: {},
      approval_status: 'approved' as const,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-02T00:00:00Z',
      base_resort: 'Cervinia',
      working_language: 'Italian',
      contact_email: 'mario@example.com',
      onboarding_completed_at: null,
    };
    mockPatchInstructorProfileByUserId.mockResolvedValue(updatedProfile);
    const app = buildApp();

    const res = await app.inject({
      method: 'PATCH',
      url: '/instructor/profile',
      headers: { authorization: 'Bearer token', 'content-type': 'application/json' },
      payload: { display_name: 'Mario R.' },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(body.profile).toBeDefined();
    expect(body.profile.display_name).toBe('Mario R.');
    expect(mockPatchInstructorProfileByUserId).toHaveBeenCalledWith(
      USER_ID,
      expect.objectContaining({ display_name: 'Mario R.' })
    );
    await app.close();
  });
});

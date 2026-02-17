import { describe, it, expect, beforeEach, vi } from 'vitest';
import Fastify from 'fastify';
import { adminRoutes } from '../admin.js';
import { requireAdminUser, InstructorAuthError, AdminOnlyError } from '../../lib/auth_instructor.js';

vi.mock('../../lib/auth_instructor.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/auth_instructor.js')>();
  return {
    ...actual,
    requireAdminUser: vi.fn(),
  };
});

async function buildApp() {
  const app = Fastify();
  await app.register(adminRoutes);
  return app;
}

describe('GET /admin/check', () => {
  beforeEach(() => {
    vi.mocked(requireAdminUser).mockReset();
  });

  it('returns 401 and body.error === "UNAUTHENTICATED" (string) when no Authorization', async () => {
    vi.mocked(requireAdminUser).mockRejectedValue(new InstructorAuthError('Missing or invalid Authorization header'));
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/admin/check' });
    await app.close();
    expect(res.statusCode).toBe(401);
    const body = res.json();
    expect(body).toHaveProperty('ok', false);
    expect(body).toHaveProperty('error', 'UNAUTHENTICATED');
    expect(typeof body.error).toBe('string');
  });

  it('returns 403 and body.error === "ADMIN_ONLY" (string) when valid token but non-admin', async () => {
    vi.mocked(requireAdminUser).mockRejectedValue(new AdminOnlyError('Admin access required'));
    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/admin/check',
      headers: { authorization: 'Bearer fake-token' },
    });
    await app.close();
    expect(res.statusCode).toBe(403);
    const body = res.json();
    expect(body).toHaveProperty('ok', false);
    expect(body).toHaveProperty('error', 'ADMIN_ONLY');
    expect(typeof body.error).toBe('string');
  });

  it('body.error is never an object', async () => {
    vi.mocked(requireAdminUser).mockRejectedValue(new InstructorAuthError('Missing Bearer token'));
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/admin/check' });
    await app.close();
    const body = res.json();
    expect(body.ok).toBe(false);
    expect(typeof body.error).toBe('string');
    expect(body.error).not.toBeNull();
  });
});

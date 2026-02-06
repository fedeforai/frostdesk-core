import { describe, it, expect, beforeEach, vi } from 'vitest';
import Fastify from 'fastify';
import { adminFeatureFlagsRoutes } from '../feature_flags.js';

// Mock the feature flag service
vi.mock('../../../services/feature_flag_service.js', () => ({
  getFeatureFlagStatus: vi.fn()
}));

// Mock JWT admin auth (requireAdminUser)
vi.mock('../../../lib/auth_instructor.js', () => ({
  requireAdminUser: vi.fn()
}));

import { getFeatureFlagStatus } from '../../../services/feature_flag_service.js';
import { requireAdminUser } from '../../../lib/auth_instructor.js';

// Minimal test app builder
function buildTestApp(options: { admin: boolean }) {
  const app = Fastify();

  (requireAdminUser as any).mockImplementation(async () => {
    if (!options.admin) {
      const error: any = new Error('Admin access required');
      error.code = 'UNAUTHENTICATED';
      error.name = 'InstructorAuthError';
      throw error;
    }
    return 'test-admin-user-id';
  });

  app.register(adminFeatureFlagsRoutes);

  return app;
}

describe('GET /admin/feature-flags/:key', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns enabled flag when admin and params are valid', async () => {
    const app = buildTestApp({ admin: true });
    (getFeatureFlagStatus as any).mockResolvedValue({ enabled: true });

    const res = await app.inject({
      method: 'GET',
      url: '/admin/feature-flags/whatsapp_inbound?env=dev'
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      ok: true,
      enabled: true
    });

    await app.close();
  });

  it('returns 400 if env is missing', async () => {
    const app = buildTestApp({ admin: true });

    const res = await app.inject({
      method: 'GET',
      url: '/admin/feature-flags/whatsapp_inbound'
    });

    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body).toHaveProperty('ok', false);
    expect(body).toHaveProperty('error', 'MISSING_PARAMETERS');

    await app.close();
  });

  it('returns 400 if env is invalid', async () => {
    const app = buildTestApp({ admin: true });

    const res = await app.inject({
      method: 'GET',
      url: '/admin/feature-flags/whatsapp_inbound?env=banana'
    });

    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body).toHaveProperty('ok', false);
    expect(body).toHaveProperty('error', 'INVALID_ENV');

    await app.close();
  });

  it('returns 401 if not admin', async () => {
    const app = buildTestApp({ admin: false });

    const res = await app.inject({
      method: 'GET',
      url: '/admin/feature-flags/whatsapp_inbound?env=dev'
    });

    expect(res.statusCode).toBe(401);
    const body = res.json();
    expect(body).toHaveProperty('ok', false);
    expect(body).toHaveProperty('error', 'UNAUTHENTICATED');

    await app.close();
  });
});

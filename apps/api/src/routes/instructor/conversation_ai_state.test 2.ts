/**
 * Instructor PATCH /instructor/conversations/:id/ai-state — ownership and validation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import Fastify from 'fastify';
import { instructorConversationAiStateRoutes } from './conversation_ai_state.js';

const mockGetUserIdFromJwt = vi.fn();
const mockGetInstructorProfileByUserId = vi.fn();
const mockGetInstructorInbox = vi.fn();
const mockSetConversationAiState = vi.fn();
const mockGetConversationAiState = vi.fn();
const mockIsValidUUID = vi.fn();

vi.mock('../../lib/auth_instructor.js', () => ({
  getUserIdFromJwt: (...args: unknown[]) => mockGetUserIdFromJwt(...args),
}));

vi.mock('@frostdesk/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@frostdesk/db')>();
  return {
    ...actual,
    getInstructorProfileByUserId: (...args: unknown[]) =>
      mockGetInstructorProfileByUserId(...args),
    getInstructorInbox: (...args: unknown[]) => mockGetInstructorInbox(...args),
    setConversationAiState: (...args: unknown[]) => mockSetConversationAiState(...args),
    getConversationAiState: (...args: unknown[]) => mockGetConversationAiState(...args),
    isValidUUID: (id: string) => mockIsValidUUID(id),
  };
});

const CONVERSATION_ID = '11111111-1111-4111-a111-111111111111';
const INSTRUCTOR_ID = '22222222-2222-4222-a222-222222222222';

function buildApp() {
  const app = Fastify();
  app.register(instructorConversationAiStateRoutes);
  return app;
}

function mockAuthOwned() {
  mockGetUserIdFromJwt.mockResolvedValue('user-id');
  mockGetInstructorProfileByUserId.mockResolvedValue({
    id: INSTRUCTOR_ID,
    onboarding_completed_at: new Date().toISOString(),
  });
  mockGetInstructorInbox.mockResolvedValue([
    { conversation_id: CONVERSATION_ID },
  ]);
  mockIsValidUUID.mockReturnValue(true);
  mockSetConversationAiState.mockResolvedValue(undefined);
  mockGetConversationAiState.mockResolvedValue('ai_paused_by_human');
}

describe('PATCH /instructor/conversations/:id/ai-state', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('200 and returns ai_state when owner sets ai_paused_by_human', async () => {
    mockAuthOwned();
    const app = buildApp();

    const res = await app.inject({
      method: 'PATCH',
      url: `/instructor/conversations/${CONVERSATION_ID}/ai-state`,
      headers: { authorization: 'Bearer token', 'content-type': 'application/json' },
      payload: { ai_state: 'ai_paused_by_human' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ ok: true, ai_state: 'ai_paused_by_human' });
    expect(mockSetConversationAiState).toHaveBeenCalledWith({
      conversationId: CONVERSATION_ID,
      nextState: 'ai_paused_by_human',
      actorType: 'human',
      actorId: 'user-id',
      reason: 'instructor_ai_state_change',
    });
    await app.close();
  });

  it('200 when owner sets ai_on', async () => {
    mockAuthOwned();
    mockGetConversationAiState.mockResolvedValue('ai_on');
    const app = buildApp();

    const res = await app.inject({
      method: 'PATCH',
      url: `/instructor/conversations/${CONVERSATION_ID}/ai-state`,
      headers: { authorization: 'Bearer token', 'content-type': 'application/json' },
      payload: { ai_state: 'ai_on' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ ok: true, ai_state: 'ai_on' });
    await app.close();
  });

  it('400 when ai_state missing', async () => {
    mockAuthOwned();
    const app = buildApp();

    const res = await app.inject({
      method: 'PATCH',
      url: `/instructor/conversations/${CONVERSATION_ID}/ai-state`,
      headers: { authorization: 'Bearer token', 'content-type': 'application/json' },
      payload: {},
    });

    expect(res.statusCode).toBe(400);
    const body = res.json() as { error?: unknown; message?: string };
    expect(body.message).toContain('ai_state');
    await app.close();
  });

  it('400 when ai_state invalid', async () => {
    mockAuthOwned();
    const app = buildApp();

    const res = await app.inject({
      method: 'PATCH',
      url: `/instructor/conversations/${CONVERSATION_ID}/ai-state`,
      headers: { authorization: 'Bearer token', 'content-type': 'application/json' },
      payload: { ai_state: 'invalid' },
    });

    expect(res.statusCode).toBe(400);
    await app.close();
  });

  it('404 when conversation not owned', async () => {
    mockGetUserIdFromJwt.mockResolvedValue('user-id');
    mockGetInstructorProfileByUserId.mockResolvedValue({
      id: INSTRUCTOR_ID,
      onboarding_completed_at: new Date().toISOString(),
    });
    mockGetInstructorInbox.mockResolvedValue([]);
    mockIsValidUUID.mockReturnValue(true);
    const app = buildApp();

    const res = await app.inject({
      method: 'PATCH',
      url: `/instructor/conversations/${CONVERSATION_ID}/ai-state`,
      headers: { authorization: 'Bearer token', 'content-type': 'application/json' },
      payload: { ai_state: 'ai_paused_by_human' },
    });

    expect(res.statusCode).toBe(404);
    expect(mockSetConversationAiState).not.toHaveBeenCalled();
    await app.close();
  });

  it('404 when profile not found', async () => {
    mockGetUserIdFromJwt.mockResolvedValue('user-id');
    mockGetInstructorProfileByUserId.mockResolvedValue(null);
    const app = buildApp();

    const res = await app.inject({
      method: 'PATCH',
      url: `/instructor/conversations/${CONVERSATION_ID}/ai-state`,
      headers: { authorization: 'Bearer token', 'content-type': 'application/json' },
      payload: { ai_state: 'ai_paused_by_human' },
    });

    expect(res.statusCode).toBe(404);
    expect(mockSetConversationAiState).not.toHaveBeenCalled();
    await app.close();
  });

  it('403 when onboarding not completed', async () => {
    mockGetUserIdFromJwt.mockResolvedValue('user-id');
    mockGetInstructorProfileByUserId.mockResolvedValue({
      id: INSTRUCTOR_ID,
      onboarding_completed_at: null,
    });
    const app = buildApp();

    const res = await app.inject({
      method: 'PATCH',
      url: `/instructor/conversations/${CONVERSATION_ID}/ai-state`,
      headers: { authorization: 'Bearer token', 'content-type': 'application/json' },
      payload: { ai_state: 'ai_paused_by_human' },
    });

    expect(res.statusCode).toBe(403);
    expect(mockSetConversationAiState).not.toHaveBeenCalled();
    await app.close();
  });
});

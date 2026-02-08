import type { FastifyInstance } from 'fastify';
import {
  getInstructorProfileByUserId,
  getConversationById,
  getInstructorInbox,
  getActiveDraftForConversation,
  getDraftById,
  markDraftUsed,
  markDraftIgnored,
  computeEffectiveState,
  getInstructorDraftKpiSummary,
  InstructorDraftNotFoundError,
} from '@frostdesk/db';
import { getUserIdFromJwt } from '../../lib/auth_instructor.js';
import { normalizeError } from '../../errors/normalize_error.js';
import { mapErrorToHttp } from '../../errors/error_http_map.js';
import { ERROR_CODES } from '../../errors/error_codes.js';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type UseBody = { edited?: unknown; finalText?: unknown };

function parseUseBody(body: unknown): { edited: boolean; finalText: string } | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as UseBody;
  const finalText = typeof b.finalText === 'string' ? b.finalText.trim() : '';
  if (finalText.length === 0) return null;
  const edited = typeof b.edited === 'boolean' ? b.edited : (b.finalText !== undefined);
  return { edited, finalText };
}

/**
 * STEP 4.1 — Instructor draft lifecycle and KPIs.
 * GET /instructor/conversations/:id/draft
 * POST /instructor/drafts/:draftId/use
 * POST /instructor/drafts/:draftId/ignore
 * GET /instructor/kpis/summary?window=7d|30d
 */
export async function instructorDraftRoutes(app: FastifyInstance): Promise<void> {
  // GET /instructor/conversations/:id/draft
  app.get<{ Params: { id: string } }>('/instructor/conversations/:id/draft', async (request, reply) => {
    try {
      const userId = await getUserIdFromJwt(request);
      const profile = await getInstructorProfileByUserId(userId);
      if (!profile) {
        return reply.status(404).send({
          ok: false,
          error: { code: ERROR_CODES.NOT_FOUND },
          message: 'Instructor profile not found',
        });
      }
      if (!profile.onboarding_completed_at) {
        return reply.status(403).send({
          ok: false,
          error: { code: ERROR_CODES.ONBOARDING_REQUIRED },
          message: 'Not authorized',
        });
      }
      const conversationId = request.params.id;
      if (!conversationId || !UUID_REGEX.test(conversationId)) {
        return reply.status(400).send({
          ok: false,
          error: { code: ERROR_CODES.INVALID_PAYLOAD },
          message: 'Invalid or missing conversation id',
        });
      }
      const conv = await getConversationById(conversationId);
      if (!conv) {
        return reply.status(404).send({
          ok: false,
          error: { code: ERROR_CODES.CONVERSATION_NOT_FOUND },
          message: 'Conversation not found',
        });
      }
      const instructorId = String(conv.instructor_id);
      if (instructorId !== profile.id) {
        return reply.status(403).send({
          ok: false,
          error: { code: ERROR_CODES.ADMIN_ONLY },
          message: 'Not authorized',
        });
      }
      const draft = await getActiveDraftForConversation({ conversationId, instructorId });
      if (!draft) {
        return reply.send({ ok: true, draft: null });
      }
      const effectiveState = computeEffectiveState(draft);
      return reply.send({
        ok: true,
        draft: {
          id: draft.id,
          conversationId: draft.conversation_id,
          state: draft.state,
          effectiveState,
          text: draft.draft_text,
          createdAt: draft.created_at,
          expiresAt: draft.expires_at,
        },
      });
    } catch (error) {
      const normalized = normalizeError(error);
      const httpStatus = mapErrorToHttp(normalized.error);
      return reply.status(httpStatus).send({
        ok: false,
        error: normalized.error,
        ...(normalized.message ? { message: normalized.message } : {}),
      });
    }
  });

  // POST /instructor/drafts/:draftId/use
  app.post<{
    Params: { draftId: string };
    Body: unknown;
  }>('/instructor/drafts/:draftId/use', async (request, reply) => {
    try {
      const userId = await getUserIdFromJwt(request);
      const profile = await getInstructorProfileByUserId(userId);
      if (!profile) {
        return reply.status(404).send({
          ok: false,
          error: { code: ERROR_CODES.NOT_FOUND },
          message: 'Instructor profile not found',
        });
      }
      if (!profile.onboarding_completed_at) {
        return reply.status(403).send({
          ok: false,
          error: { code: ERROR_CODES.ONBOARDING_REQUIRED },
          message: 'Not authorized',
        });
      }
      const draftId = request.params.draftId;
      if (!draftId || !UUID_REGEX.test(draftId)) {
        return reply.status(400).send({
          ok: false,
          error: { code: ERROR_CODES.INVALID_PAYLOAD },
          message: 'Invalid or missing draft id',
        });
      }
      const parsed = parseUseBody(request.body);
      if (!parsed) {
        return reply.status(400).send({
          ok: false,
          error: { code: ERROR_CODES.MISSING_TEXT },
          message: 'Body must include non-empty finalText',
        });
      }
      const draft = await getDraftById(draftId);
      if (!draft || draft.instructor_id !== profile.id) {
        return reply.status(404).send({
          ok: false,
          error: { code: ERROR_CODES.NOT_FOUND },
          message: 'Draft not found or not owned',
        });
      }
      const mode = parsed.edited ? 'edited' : (draft.draft_text === parsed.finalText ? 'exact' : 'edited');
      await markDraftUsed({ draftId, instructorId: profile.id, mode });
      return reply.send({ ok: true });
    } catch (error) {
      if (error instanceof InstructorDraftNotFoundError) {
        return reply.status(404).send({
          ok: false,
          error: { code: ERROR_CODES.NOT_FOUND },
          message: 'Draft not found or not owned',
        });
      }
      const normalized = normalizeError(error);
      const httpStatus = mapErrorToHttp(normalized.error);
      return reply.status(httpStatus).send({
        ok: false,
        error: normalized.error,
        ...(normalized.message ? { message: normalized.message } : {}),
      });
    }
  });

  // POST /instructor/drafts/:draftId/ignore
  app.post<{ Params: { draftId: string } }>('/instructor/drafts/:draftId/ignore', async (request, reply) => {
    try {
      const userId = await getUserIdFromJwt(request);
      const profile = await getInstructorProfileByUserId(userId);
      if (!profile) {
        return reply.status(404).send({
          ok: false,
          error: { code: ERROR_CODES.NOT_FOUND },
          message: 'Instructor profile not found',
        });
      }
      if (!profile.onboarding_completed_at) {
        return reply.status(403).send({
          ok: false,
          error: { code: ERROR_CODES.ONBOARDING_REQUIRED },
          message: 'Not authorized',
        });
      }
      const draftId = request.params.draftId;
      if (!draftId || !UUID_REGEX.test(draftId)) {
        return reply.status(400).send({
          ok: false,
          error: { code: ERROR_CODES.INVALID_PAYLOAD },
          message: 'Invalid or missing draft id',
        });
      }
      const draft = await getDraftById(draftId);
      if (!draft || draft.instructor_id !== profile.id) {
        return reply.status(404).send({
          ok: false,
          error: { code: ERROR_CODES.NOT_FOUND },
          message: 'Draft not found or not owned',
        });
      }
      await markDraftIgnored({ draftId, instructorId: profile.id });
      return reply.send({ ok: true });
    } catch (error) {
      if (error instanceof InstructorDraftNotFoundError) {
        return reply.status(404).send({
          ok: false,
          error: { code: ERROR_CODES.NOT_FOUND },
          message: 'Draft not found or not owned',
        });
      }
      const normalized = normalizeError(error);
      const httpStatus = mapErrorToHttp(normalized.error);
      return reply.status(httpStatus).send({
        ok: false,
        error: normalized.error,
        ...(normalized.message ? { message: normalized.message } : {}),
      });
    }
  });

  // GET /instructor/kpis/summary?window=7d|30d
  app.get<{ Querystring: { window?: string } }>('/instructor/kpis/summary', async (request, reply) => {
    try {
      const userId = await getUserIdFromJwt(request);
      const profile = await getInstructorProfileByUserId(userId);
      if (!profile) {
        return reply.status(404).send({
          ok: false,
          error: { code: ERROR_CODES.NOT_FOUND },
          message: 'Instructor profile not found',
        });
      }
      if (!profile.onboarding_completed_at) {
        return reply.status(403).send({
          ok: false,
          error: { code: ERROR_CODES.ONBOARDING_REQUIRED },
          message: 'Not authorized',
        });
      }
      const windowParam = (request.query?.window ?? '7d').toLowerCase();
      const window = windowParam === '30d' ? '30d' : '7d';
      const drafts = await getInstructorDraftKpiSummary(profile.id, window);
      return reply.send({
        ok: true,
        window,
        drafts: {
          generated: drafts.generated,
          usedExact: drafts.usedExact,
          usedEdited: drafts.usedEdited,
          used: drafts.used,
          ignored: drafts.ignored,
          expired: drafts.expired,
          usageRate: drafts.usageRate,
        },
      });
    } catch (error) {
      const normalized = normalizeError(error);
      const httpStatus = mapErrorToHttp(normalized.error);
      return reply.status(httpStatus).send({
        ok: false,
        error: normalized.error,
        ...(normalized.message ? { message: normalized.message } : {}),
      });
    }
  });
}

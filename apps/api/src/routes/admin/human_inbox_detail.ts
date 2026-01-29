import { FastifyInstance } from 'fastify';
import { getHumanInboxDetailReadModel } from '@frostdesk/db/src/human_inbox_detail_service.js';
import { buildAIDecisionSnapshot } from '@frostdesk/db/src/ai_decision_snapshot.js';
import { listAISnapshotsByConversationId } from '@frostdesk/db/src/ai_snapshot_repository.js';
import { normalizeError } from '../../errors/normalize_error.js';
import { mapErrorToHttp } from '../../errors/error_http_map.js';
import { ERROR_CODES } from '../../errors/error_codes.js';

/**
 * Admin Human Inbox Detail Routes (READ-ONLY)
 * 
 * WHAT IT DOES:
 * - Exposes GET /admin/human-inbox/:conversationId endpoint
 * - Enforces admin access via service layer
 * - Returns human inbox detail read model
 * 
 * WHAT IT DOES NOT DO:
 * - No mutations
 * - No SQL
 * - No business logic
 * - No direct repository calls
 */

export async function adminHumanInboxDetailRoutes(app: FastifyInstance) {
  // Helper to extract userId from request
  const getUserId = (request: any): string => {
    // Try header first, then query param
    const userId = (request.headers['x-user-id'] as string) || (request.query as any)?.userId;
    if (!userId || typeof userId !== 'string') {
      throw new Error('User ID required');
    }
    return userId;
  };

  app.get('/admin/human-inbox/:conversationId', async (request, reply) => {
    try {
      const userId = getUserId(request);
      const { conversationId } = request.params as { conversationId?: string };

      if (!conversationId) {
        const normalized = normalizeError({ code: ERROR_CODES.MISSING_PARAMETERS });
        const httpStatus = mapErrorToHttp(normalized.error);
        return reply.status(httpStatus).send({
          ok: false,
          error: normalized.error,
          ...(normalized.message ? { message: normalized.message } : {}),
        });
      }

      // Call service (admin guard enforced inside service)
      const detail = await getHumanInboxDetailReadModel({
        conversationId,
        userId,
      });

      if (detail === null) {
        const normalized = normalizeError({ code: ERROR_CODES.NOT_FOUND });
        const httpStatus = mapErrorToHttp(normalized.error);
        return reply.status(httpStatus).send({
          ok: false,
          error: normalized.error,
          ...(normalized.message ? { message: normalized.message } : {}),
        });
      }

      const aiDecision = await buildAIDecisionSnapshot({
        conversationId,
      });

      const snapshots = await listAISnapshotsByConversationId(conversationId);
      const ai_snapshots_by_message_id: Record<string, (typeof snapshots)[number]> = {};
      for (const snapshot of snapshots) {
        ai_snapshots_by_message_id[snapshot.message_id] = snapshot;
      }

      return reply.send({
        ok: true,
        detail,
        ai_decision: aiDecision,
        ai_snapshots_by_message_id: snapshots.length > 0 ? ai_snapshots_by_message_id : undefined,
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

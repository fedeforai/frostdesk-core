import { FastifyInstance } from 'fastify';
import {
  getAdminConversations,
} from '@frostdesk/db/src/admin_conversation_service.js';
import {
  getAdminBookings,
  adminOverrideBookingStatus,
} from '@frostdesk/db/src/admin_booking_service.js';
import {
  getAdminBookingDetail,
} from '@frostdesk/db/src/admin_booking_detail_service.js';
import {
  getAdminMessages,
} from '@frostdesk/db/src/admin_message_service.js';
import { UnauthorizedError, isAdmin, getUserRole } from '@frostdesk/db/src/admin_access.js';
import { BookingNotFoundError } from '@frostdesk/db/src/booking_repository.js';
import { InvalidBookingTransitionError } from '@frostdesk/db/src/booking_state_machine.js';
import { adminFeatureFlagsRoutes } from './admin/feature_flags.js';
import { adminHumanInboxRoutes } from './admin/human_inbox.js';
import { adminHumanInboxDetailRoutes } from './admin/human_inbox_detail.js';
import { adminBookingLifecycleRoutes } from './admin/booking_lifecycle.js';
import { adminIntentConfidenceRoutes } from './admin/intent_confidence.js';
import { adminAIGatingRoutes } from './admin/ai_gating.js';
import { adminAIDraftRoutes } from './admin/ai_draft.js';
import { adminSendAIDraftRoutes } from './admin/send_ai_draft.js';
import { normalizeError } from '../errors/normalize_error.js';
import { mapErrorToHttp } from '../errors/error_http_map.js';
import { ERROR_CODES } from '../errors/error_codes.js';

export interface AdminListResponse<T> {
  items: T[];
  limit: number;
  offset: number;
  total?: number;
}

export interface AdminError {
  code: string;
}

export async function adminRoutes(fastify: FastifyInstance) {
  // Helper to extract userId from request
  const getUserId = (request: any): string => {
    // Try header first, then query param
    const userId = (request.headers['x-user-id'] as string) || (request.query as any)?.userId;
    if (!userId || typeof userId !== 'string') {
      throw new Error('User ID required');
    }
    return userId;
  };

  // GET /admin/check - Lightweight endpoint to check if user is admin
  fastify.get('/admin/check', async (request, reply) => {
    try {
      const userId = getUserId(request);
      const admin = await isAdmin(userId);
      return { ok: true, isAdmin: admin };
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

  // GET /admin/user-role - Get authenticated user's role
  fastify.get('/admin/user-role', async (request, reply) => {
    try {
      const userId = getUserId(request);
      const role = await getUserRole(userId);
      return { ok: true, role };
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

  // GET /admin/conversations
  // Ordered by created_at DESC (newest first)
  fastify.get('/admin/conversations', async (request, reply) => {
    try {
      const userId = getUserId(request);
      const query = request.query as {
        limit?: string;
        offset?: string;
        instructorId?: string;
        status?: string;
      };

      const limit = query.limit ? Number(query.limit) : 50;
      const offset = query.offset ? Number(query.offset) : 0;

      const items = await getAdminConversations({
        userId,
        limit,
        offset,
        instructorId: query.instructorId,
        status: query.status,
      });

      const response: AdminListResponse<typeof items[0]> = {
        items,
        limit,
        offset,
      };

      return { ok: true, data: response };
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

  // GET /admin/bookings
  // Ordered by booking_date DESC, start_time DESC (newest bookings first, then by start time)
  // dateFrom/dateTo: ISO 8601 date strings (YYYY-MM-DD or full ISO datetime)
  fastify.get('/admin/bookings', async (request, reply) => {
    try {
      const userId = getUserId(request);
      const query = request.query as {
        limit?: string;
        offset?: string;
        instructorId?: string;
        status?: string;
        dateFrom?: string;
        dateTo?: string;
      };

      const limit = query.limit ? Number(query.limit) : 50;
      const offset = query.offset ? Number(query.offset) : 0;

      const items = await getAdminBookings({
        userId,
        limit,
        offset,
        instructorId: query.instructorId,
        status: query.status,
        dateFrom: query.dateFrom,
        dateTo: query.dateTo,
      });

      const response: AdminListResponse<typeof items[0]> = {
        items,
        limit,
        offset,
      };

      return { ok: true, data: response };
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

  // POST /admin/bookings/:id/override-status
  fastify.post('/admin/bookings/:id/override-status', async (request, reply) => {
    try {
      const userId = getUserId(request);
      const bookingId = (request.params as any).id;
      const body = request.body as {
        newStatus: string;
        reason?: string;
      };

      if (!body.newStatus || typeof body.newStatus !== 'string') {
        const normalized = normalizeError({ code: ERROR_CODES.MISSING_PARAMETERS });
        const httpStatus = mapErrorToHttp(normalized.error);
        return reply.status(httpStatus).send({
          ok: false,
          error: normalized.error,
          ...(normalized.message ? { message: normalized.message } : {}),
        });
      }

      const result = await adminOverrideBookingStatus({
        userId,
        bookingId,
        newStatus: body.newStatus as any,
        reason: body.reason,
      });

      return { ok: true, data: result };
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

  // GET /admin/bookings/:id
  fastify.get('/admin/bookings/:id', async (request, reply) => {
    try {
      const userId = getUserId(request);
      const bookingId = (request.params as any).id;

      const result = await getAdminBookingDetail({
        userId,
        bookingId,
      });

      return { ok: true, data: result };
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

  // GET /admin/messages
  // Ordered by created_at DESC (newest messages first)
  // dateFrom/dateTo: ISO 8601 date strings (YYYY-MM-DD or full ISO datetime)
  fastify.get('/admin/messages', async (request, reply) => {
    try {
      const userId = getUserId(request);
      const query = request.query as {
        limit?: string;
        offset?: string;
        conversationId?: string;
        instructorId?: string;
        direction?: string;
        dateFrom?: string;
        dateTo?: string;
      };

      const limit = query.limit ? Number(query.limit) : 50;
      const offset = query.offset ? Number(query.offset) : 0;

      const items = await getAdminMessages({
        userId,
        limit,
        offset,
        conversationId: query.conversationId,
        instructorId: query.instructorId,
        direction: query.direction as 'inbound' | 'outbound' | undefined,
        dateFrom: query.dateFrom,
        dateTo: query.dateTo,
      });

      const response: AdminListResponse<typeof items[0]> = {
        items,
        limit,
        offset,
      };

      return { ok: true, data: response };
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

  // Register feature flags routes
  await adminFeatureFlagsRoutes(fastify);

  // Register human inbox routes
  await adminHumanInboxRoutes(fastify);

  // Register human inbox detail routes
  await adminHumanInboxDetailRoutes(fastify);

  // Register booking lifecycle routes
  await adminBookingLifecycleRoutes(fastify);

  // Register intent confidence routes
  await adminIntentConfidenceRoutes(fastify);

  // Register AI gating routes
  await adminAIGatingRoutes(fastify);

  // Register AI draft routes
  await adminAIDraftRoutes(fastify);

  // Register send AI draft routes
  await adminSendAIDraftRoutes(fastify);

  // Register AI feature flags routes
  // Disabled for pilot stability
  // const { adminAIFeatureFlagsRoutes } = await import('./admin/ai_feature_flags.js');
  // await adminAIFeatureFlagsRoutes(fastify);

  // Register AI quota routes
  const { adminAIQuotaRoutes } = await import('./admin/ai_quota.js');
  await adminAIQuotaRoutes(fastify);

  // Register system health routes
  const { adminSystemHealthRoutes } = await import('./admin/system_health.js');
  await adminSystemHealthRoutes(fastify);

  // Register system degradation routes
  const { adminSystemDegradationRoutes } = await import('./admin/system_degradation.js');
  await adminSystemDegradationRoutes(fastify);

  // Register dashboard routes
  const { adminDashboardRoutes } = await import('./admin/dashboard.js');
  await adminDashboardRoutes(fastify);

  // Register KPI routes
  const { adminKPIRoutes } = await import('./admin/kpi.js');
  await adminKPIRoutes(fastify);

  // Register conversation timeline routes
  const { adminConversationTimelineRoutes } = await import('./admin/conversation_timeline.js');
  await adminConversationTimelineRoutes(fastify);

  // Register outbound message routes
  const { adminOutboundMessageRoutes } = await import('./admin/outbound_message.js');
  await adminOutboundMessageRoutes(fastify);

  // Register conversation AI mode routes
  const { adminConversationAIModeRoutes } = await import('./admin/conversation_ai_mode.js');
  await adminConversationAIModeRoutes(fastify);
}

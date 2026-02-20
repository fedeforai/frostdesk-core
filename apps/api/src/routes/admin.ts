import { FastifyInstance } from 'fastify';
import {
  getAdminConversations,
  getAdminBookings,
  adminOverrideBookingStatus,
  getAdminBookingDetail,
  getAdminMessages,
  insertAuditEvent,
  listAuditLog,
  listAllInstructorProfiles,
  UnauthorizedError,
  isAdmin,
  getUserRole,
  BookingNotFoundError,
  InvalidBookingTransitionError,
} from '@frostdesk/db';
import { adminFeatureFlagsRoutes } from './admin/feature_flags.js';
import { adminHumanInboxRoutes } from './admin/human_inbox.js';
import { adminHumanInboxDetailRoutes } from './admin/human_inbox_detail.js';
import { adminBookingLifecycleRoutes } from './admin/booking_lifecycle.js';
import { adminIntentConfidenceRoutes } from './admin/intent_confidence.js';
import { adminAIGatingRoutes } from './admin/ai_gating.js';
import { adminAIDraftRoutes } from './admin/ai_draft.js';
import { adminSendAIDraftRoutes } from './admin/send_ai_draft.js';
import { adminInstructorApprovalRoutes } from './admin/instructor_approval.js';
import { normalizeError } from '../errors/normalize_error.js';
import { mapErrorToHttp } from '../errors/error_http_map.js';
import { ERROR_CODES } from '../errors/error_codes.js';
import { requireAdminUser } from '../lib/auth_instructor.js';

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
  // GET /admin/check - JWT-based; uses requireAdminUser so client gets 401/403/200. Error shape: error as string (ErrorCode).
  fastify.get('/admin/check', async (request, reply) => {
    try {
      await requireAdminUser(request);
      return reply.send({ ok: true, isAdmin: true });
    } catch (error) {
      const normalized = normalizeError(error);
      const httpStatus = mapErrorToHttp(normalized.error);
      return reply.status(httpStatus).send({
        ok: false,
        isAdmin: false,
        error: normalized.error,
        ...(normalized.message ? { message: normalized.message } : {}),
      });
    }
  });

  // GET /admin/user-role - Get authenticated user's role
  fastify.get('/admin/user-role', async (request, reply) => {
    try {
      const userId = await requireAdminUser(request);
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
      const userId = await requireAdminUser(request);
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
      const userId = await requireAdminUser(request);
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
      const userId = await requireAdminUser(request);
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

      try {
        await insertAuditEvent({
          actor_type: 'admin',
          actor_id: userId,
          action: 'admin_override_booking_status',
          entity_type: 'booking',
          entity_id: bookingId,
          request_id: (request as any).id ?? null,
          ip: request.ip ?? null,
          user_agent: request.headers['user-agent'] ?? null,
          payload: { new_status: result.status },
        });
      } catch (auditErr) {
        request.log.error({ err: auditErr }, 'Audit write failed (admin override booking status)');
      }

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
      const userId = await requireAdminUser(request);
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
      const userId = await requireAdminUser(request);
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

  // GET /admin/audit — read-only, cursor pagination, raw audit rows
  fastify.get('/admin/audit', async (request, reply) => {
    try {
      await requireAdminUser(request);
      const query = request.query as {
        entity_type?: string;
        entity_id?: string;
        limit?: string;
        cursor?: string;
      };
      const limitRaw = query.limit != null ? Number(query.limit) : 20;
      const limit = Math.min(100, Math.max(1, Number.isFinite(limitRaw) ? limitRaw : 20));
      const { items, next_cursor } = await listAuditLog({
        entity_type: query.entity_type ?? undefined,
        entity_id: query.entity_id ?? undefined,
        limit,
        cursor: query.cursor ?? null,
      });
      return { ok: true, data: { items, next_cursor, limit } };
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

  // GET /admin/instructors — list all instructor profiles with performance metrics
  fastify.get('/admin/instructors', async (request, reply) => {
    try {
      await requireAdminUser(request);
      const query = request.query as {
        limit?: string;
        offset?: string;
        approval_status?: string;
      };
      const limit = query.limit ? Number(query.limit) : 50;
      const offset = query.offset ? Number(query.offset) : 0;
      let result;
      try {
        result = await listAllInstructorProfiles({
          limit,
          offset,
          approval_status: query.approval_status ?? undefined,
        });
      } catch (listError) {
        const err = listError as Error;
        request.log.warn(
          { err: listError, message: err?.message, stack: err?.stack },
          'listAllInstructorProfiles failed, returning empty list'
        );
        return { ok: true, data: { items: [], total: 0 } };
      }
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

  // Register comprehensive dashboard route
  const { adminDashboardComprehensiveRoutes } = await import('./admin/dashboard_comprehensive.js');
  await adminDashboardComprehensiveRoutes(fastify);

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

  // Register admin instructor WhatsApp (manual verify)
  const { adminInstructorWhatsappRoutes } = await import('./admin/instructor_whatsapp.js');
  await adminInstructorWhatsappRoutes(fastify);

  // Register admin instructor approval (pending list + approve/reject)
  await adminInstructorApprovalRoutes(fastify);

  // Loop B: AI telemetry & cost metrics
  const { adminAiMetricsRoutes } = await import('./admin/ai_metrics.js');
  await adminAiMetricsRoutes(fastify);

  // AI cost dashboard (enriched cost tracking)
  const { adminAiCostRoutes } = await import('./admin/ai_cost.js');
  await adminAiCostRoutes(fastify);

  // Admin reports (Excel export)
  const { adminReportsDailyRoutes } = await import('./admin/reports_daily.js');
  await adminReportsDailyRoutes(fastify);

  const { adminReportsWeeklyRoutes } = await import('./admin/reports_weekly.js');
  await adminReportsWeeklyRoutes(fastify);

  // Investor report (PDF)
  const { adminReportsInvestorRoutes } = await import('./admin/reports_investor.js');
  await adminReportsInvestorRoutes(fastify);

  // Report archive (list stored reports from Supabase Storage)
  const { adminReportsArchiveRoutes } = await import('./admin/reports_archive.js');
  await adminReportsArchiveRoutes(fastify);
}

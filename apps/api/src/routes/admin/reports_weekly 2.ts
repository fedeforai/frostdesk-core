import { FastifyInstance } from 'fastify';
import {
  getComprehensiveDashboardReadModel,
  getComprehensiveDashboard,
} from '@frostdesk/db';
import { requireAdminUser } from '../../lib/auth_instructor.js';
import { normalizeError } from '../../errors/normalize_error.js';
import { mapErrorToHttp } from '../../errors/error_http_map.js';
import { buildWeeklyReport } from '../../report_builders/weekly_report.js';
import {
  uploadReport,
  buildWeeklyReportPath,
} from '../../lib/reports_storage.js';

const ENV_LABEL = process.env.NODE_ENV ?? 'development';
const CRON_SECRET = process.env.ADMIN_REPORTS_CRON_SECRET ?? '';

export async function adminReportsWeeklyRoutes(app: FastifyInstance) {
  // ── GET /admin/reports/weekly — download ─────────────────────────
  app.get('/admin/reports/weekly', async (request, reply) => {
    try {
      const userId = await requireAdminUser(request);
      const dashboard = await getComprehensiveDashboardReadModel({ userId });
      const buffer = await buildWeeklyReport(dashboard, ENV_LABEL);

      const now = new Date();
      const ts = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `frostdesk-weekly-report_${ts}_${ENV_LABEL}.xlsx`;

      return reply
        .header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        .header('Content-Disposition', `attachment; filename="${filename}"`)
        .header('Content-Length', buffer.length)
        .send(buffer);
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

  // ── POST /admin/reports/weekly/store — generate + upload ─────────
  app.post('/admin/reports/weekly/store', async (request, reply) => {
    try {
      // Auth: cron secret header
      const secret = (request.headers as Record<string, string>)['x-admin-cron-secret'] ?? '';
      if (!CRON_SECRET || secret !== CRON_SECRET) {
        request.log.warn('[weekly/store] Rejected: invalid or missing x-admin-cron-secret');
        return reply.status(403).send({
          ok: false,
          error: 'FORBIDDEN',
          message: 'Invalid or missing x-admin-cron-secret header',
        });
      }

      request.log.info('[weekly/store] Cron trigger received — generating weekly report');

      // Cron: no admin user context — use raw repository function
      const dashboard = await getComprehensiveDashboard();
      const buffer = await buildWeeklyReport(dashboard, ENV_LABEL);

      request.log.info(`[weekly/store] Report built: ${buffer.length} bytes`);

      const now = new Date();
      const storagePath = buildWeeklyReportPath(now, ENV_LABEL);

      const fullPath = await uploadReport({
        type: 'weekly',
        path: storagePath,
        buffer,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      request.log.info(
        `[weekly/store] Uploaded to storage: path=${fullPath}, size=${buffer.length}, env=${ENV_LABEL}, generatedAt=${dashboard.generated_at}`,
      );

      return reply.send({
        ok: true,
        data: {
          path: fullPath,
          size: buffer.length,
          generatedAt: dashboard.generated_at,
          env: ENV_LABEL,
        },
      });
    } catch (error) {
      request.log.error({ err: error }, '[weekly/store] Failed to generate or upload weekly report');
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

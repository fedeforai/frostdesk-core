import { FastifyInstance } from 'fastify';
import { getComprehensiveDashboardReadModel } from '@frostdesk/db';
import { requireAdminUser } from '../../lib/auth_instructor.js';
import { normalizeError } from '../../errors/normalize_error.js';
import { mapErrorToHttp } from '../../errors/error_http_map.js';
import { buildDailyReport } from '../../report_builders/daily_report.js';

const ENV_LABEL = process.env.NODE_ENV ?? 'development';

export async function adminReportsDailyRoutes(app: FastifyInstance) {
  app.get('/admin/reports/daily', async (request, reply) => {
    try {
      const userId = await requireAdminUser(request);

      const dashboard = await getComprehensiveDashboardReadModel({ userId });

      const buffer = await buildDailyReport(dashboard, ENV_LABEL);

      const now = new Date();
      const ts = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `frostdesk-daily-report_${ts}_${ENV_LABEL}.xlsx`;

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
}

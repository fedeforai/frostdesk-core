import { FastifyInstance } from 'fastify';
import { getComprehensiveDashboardReadModel } from '@frostdesk/db';
import { requireAdminUser } from '../../lib/auth_instructor.js';
import { normalizeError } from '../../errors/normalize_error.js';
import { mapErrorToHttp } from '../../errors/error_http_map.js';
import { buildInvestorReport } from '../../report_builders/investor_report.js';

const ENV_LABEL = process.env.NODE_ENV ?? 'development';

export async function adminReportsInvestorRoutes(app: FastifyInstance) {
  // ── GET /admin/reports/investor — download PDF ───────────────────
  app.get('/admin/reports/investor', async (request, reply) => {
    try {
      const userId = await requireAdminUser(request);
      const dashboard = await getComprehensiveDashboardReadModel({ userId });
      const buffer = await buildInvestorReport(dashboard, ENV_LABEL);

      const dateStr = new Date().toISOString().slice(0, 10);
      const filename = `frostdesk-investor-snapshot_${dateStr}_${ENV_LABEL}.pdf`;

      return reply
        .header('Content-Type', 'application/pdf')
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

import { FastifyInstance } from 'fastify';
import { requireAdminUser } from '../../lib/auth_instructor.js';
import { normalizeError } from '../../errors/normalize_error.js';
import { mapErrorToHttp } from '../../errors/error_http_map.js';
import {
  listReports,
  getSignedUrl,
  type ReportType,
} from '../../lib/reports_storage.js';

const VALID_TYPES: ReportType[] = ['daily', 'weekly', 'investor'];
const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 20;

export async function adminReportsArchiveRoutes(app: FastifyInstance) {
  // ── GET /admin/reports/archive?type=daily|weekly|investor&limit=20 ──
  app.get('/admin/reports/archive', async (request, reply) => {
    try {
      await requireAdminUser(request);

      const query = request.query as {
        type?: string;
        limit?: string;
      };

      // Validate type
      const reportType = query.type as ReportType | undefined;
      if (!reportType || !VALID_TYPES.includes(reportType)) {
        return reply.status(400).send({
          ok: false,
          error: 'INVALID_PARAMETERS',
          message: `type is required and must be one of: ${VALID_TYPES.join(', ')}`,
        });
      }

      // Parse limit
      const rawLimit = query.limit ? Number(query.limit) : DEFAULT_LIMIT;
      const limit = Math.min(MAX_LIMIT, Math.max(1, Number.isFinite(rawLimit) ? rawLimit : DEFAULT_LIMIT));

      // List files from storage
      const files = await listReports({ type: reportType, limit });

      // Generate signed URLs for each file
      const items = await Promise.all(
        files.map(async (f) => {
          let downloadUrl: string | null = null;
          try {
            downloadUrl = await getSignedUrl(f.path, 3600);
          } catch {
            // Signed URL generation may fail if file was deleted — skip gracefully
          }
          return {
            name: f.name,
            path: f.path,
            created_at: f.created_at,
            size: f.size,
            download_url: downloadUrl,
          };
        }),
      );

      return reply.send({
        ok: true,
        data: {
          type: reportType,
          items,
          count: items.length,
          limit,
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

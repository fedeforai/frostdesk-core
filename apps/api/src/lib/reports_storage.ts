import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase Storage helper for report archival.
 *
 * Server-side only. Uses SUPABASE_SERVICE_ROLE_KEY for full access.
 * No DB tables — purely Storage bucket operations.
 *
 * Bucket path conventions:
 *   daily/YYYY-MM-DD/daily_YYYY-MM-DDTHH-mm-ssZ_<env>.xlsx
 *   weekly/YYYY-Www/weekly_YYYY-Www_<env>.xlsx
 *   investor/YYYY-MM/investor_YYYY-MM_<env>.pdf
 */

const BUCKET_NAME = process.env.REPORTS_BUCKET_NAME ?? 'reports';

// ── Singleton client ─────────────────────────────────────────────────────

let _client: SupabaseClient | null = null;

function getStorageClient(): SupabaseClient {
  if (_client) return _client;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      '[reports_storage] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. ' +
      'Storage operations require the service role key (server-side only).'
    );
  }

  _client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return _client;
}

// ── Public types ─────────────────────────────────────────────────────────

export type ReportType = 'daily' | 'weekly' | 'investor';

export interface ReportFileInfo {
  name: string;
  path: string;
  created_at: string | null;
  size: number | null;
}

export interface UploadReportParams {
  type: ReportType;
  path: string;
  buffer: Buffer;
  contentType: string;
}

export interface ListReportsParams {
  type: ReportType;
  limit?: number;
  folder?: string;
}

// ── Bucket bootstrap ─────────────────────────────────────────────────────

/**
 * Attempts to create the reports bucket if it doesn't exist.
 * Best-effort: swallows "already exists" errors gracefully.
 * Should be called once at app startup.
 */
export async function ensureReportsBucketExists(): Promise<void> {
  const client = getStorageClient();
  const { error } = await client.storage.createBucket(BUCKET_NAME, {
    public: false,
    fileSizeLimit: 50 * 1024 * 1024, // 50 MB
  });

  if (error) {
    const msg = error.message ?? '';
    // "Bucket already exists" or "duplicate" → not an error
    if (
      msg.includes('already exists') ||
      msg.includes('duplicate') ||
      msg.includes('Duplicate')
    ) {
      return;
    }
    // Permissions issue (RLS on storage.buckets) — log but don't crash
    console.warn(
      `[reports_storage] ensureReportsBucketExists warning: ${msg}. ` +
      'If the bucket already exists in Supabase, this is safe to ignore. ' +
      'Otherwise create it manually in the Supabase dashboard.'
    );
  }
}

// ── Upload ───────────────────────────────────────────────────────────────

/**
 * Uploads a report file to the storage bucket.
 *
 * @param params.type    - Report type (determines root folder)
 * @param params.path    - Full path within the type folder, e.g.
 *                         "2026-02-16/daily_2026-02-16T17-30-00Z_production.xlsx"
 * @param params.buffer  - File contents
 * @param params.contentType - MIME type
 * @returns The full storage path on success
 * @throws Error on upload failure
 */
export async function uploadReport(params: UploadReportParams): Promise<string> {
  const { type, path, buffer, contentType } = params;
  const fullPath = `${type}/${path}`;
  const client = getStorageClient();

  const { error } = await client.storage
    .from(BUCKET_NAME)
    .upload(fullPath, buffer, {
      contentType,
      upsert: true,
    });

  if (error) {
    throw new Error(`[reports_storage] Upload failed for ${fullPath}: ${error.message}`);
  }

  return fullPath;
}

// ── List ─────────────────────────────────────────────────────────────────

/**
 * Lists report files under a given type folder.
 *
 * @param params.type   - Report type folder (daily / weekly / investor)
 * @param params.limit  - Max files to return (default 20)
 * @param params.folder - Optional sub-folder within type (e.g. "2026-02-16")
 * @returns Array of file info objects, newest first
 */
export async function listReports(params: ListReportsParams): Promise<ReportFileInfo[]> {
  const { type, limit = 20, folder } = params;
  const listPath = folder ? `${type}/${folder}` : type;
  const client = getStorageClient();

  const { data, error } = await client.storage
    .from(BUCKET_NAME)
    .list(listPath, {
      limit,
      offset: 0,
      sortBy: { column: 'created_at', order: 'desc' },
    });

  if (error) {
    throw new Error(`[reports_storage] List failed for ${listPath}: ${error.message}`);
  }

  if (!data) return [];

  return data
    .filter((f) => f.name && !f.name.startsWith('.'))
    .map((f) => ({
      name: f.name,
      path: `${listPath}/${f.name}`,
      created_at: f.created_at ?? null,
      size: f.metadata?.size ?? null,
    }));
}

// ── Signed URL ──────────────────────────────────────────────────────────

/**
 * Creates a time-limited signed download URL for a report file.
 *
 * @param storagePath - Full path inside the bucket (e.g. "daily/2026-02-16/daily_...xlsx")
 * @param expiresInSeconds - URL validity in seconds (default 3600 = 1h)
 * @returns Signed URL string
 * @throws Error on failure
 */
export async function getSignedUrl(
  storagePath: string,
  expiresInSeconds: number = 3600,
): Promise<string> {
  const client = getStorageClient();

  const { data, error } = await client.storage
    .from(BUCKET_NAME)
    .createSignedUrl(storagePath, expiresInSeconds);

  if (error || !data?.signedUrl) {
    throw new Error(
      `[reports_storage] Signed URL failed for ${storagePath}: ${error?.message ?? 'no URL returned'}`,
    );
  }

  return data.signedUrl;
}

// ── Path builders ────────────────────────────────────────────────────────

/**
 * Builds a conventional storage path for a daily report.
 *
 * Convention: daily/YYYY-MM-DD/daily_YYYY-MM-DDTHH-mm-ssZ_<env>.xlsx
 */
export function buildDailyReportPath(date: Date, env: string): string {
  const dateStr = date.toISOString().slice(0, 10); // YYYY-MM-DD
  const ts = date.toISOString().replace(/[:.]/g, '-').slice(0, 19); // YYYY-MM-DDTHH-mm-ss
  return `${dateStr}/daily_${ts}Z_${env}.xlsx`;
}

/**
 * Builds a conventional storage path for a weekly report.
 *
 * Convention: weekly/YYYY-Www/weekly_YYYY-Www_<env>.xlsx
 */
export function buildWeeklyReportPath(date: Date, env: string): string {
  const year = date.getFullYear();
  const jan1 = new Date(year, 0, 1);
  const weekNum = Math.ceil(((date.getTime() - jan1.getTime()) / 86_400_000 + jan1.getDay() + 1) / 7);
  const weekStr = `${year}-W${String(weekNum).padStart(2, '0')}`;
  return `${weekStr}/weekly_${weekStr}_${env}.xlsx`;
}

/**
 * Builds a conventional storage path for an investor report.
 *
 * Convention: investor/YYYY-MM/investor_YYYY-MM_<env>.pdf
 */
export function buildInvestorReportPath(date: Date, env: string): string {
  const monthStr = date.toISOString().slice(0, 7); // YYYY-MM
  return `${monthStr}/investor_${monthStr}_${env}.pdf`;
}

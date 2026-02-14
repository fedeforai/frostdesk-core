import { sql } from './client.js';

export type AuditEventActorType = 'admin' | 'system' | 'instructor';
export type AuditEventEntityType =
  | 'booking'
  | 'conversation'
  | 'message'
  | 'whatsapp_account'
  | 'feature_flag'
  | 'instructor'
  | 'instructor_policy'
  | 'customer';
export type AuditEventSeverity = 'info' | 'warn' | 'error';

export interface InsertAuditEventParams {
  actor_type: AuditEventActorType;
  actor_id: string | null;
  action: string;
  entity_type: AuditEventEntityType;
  entity_id: string | null;
  severity?: AuditEventSeverity;
  request_id?: string | null;
  ip?: string | null;
  user_agent?: string | null;
  payload?: Record<string, unknown> | null;
}

/**
 * Inserts one row into audit_log. Append-only; no updates/deletes.
 * Throws on DB errors (caller must handle fail-open).
 */
export async function insertAuditEvent(params: InsertAuditEventParams): Promise<void> {
  await sql`
    INSERT INTO audit_log (
      actor_type,
      actor_id,
      action,
      entity_type,
      entity_id,
      severity,
      request_id,
      ip,
      user_agent,
      payload
    )
    VALUES (
      ${params.actor_type},
      ${params.actor_id},
      ${params.action},
      ${params.entity_type},
      ${params.entity_id},
      ${params.severity ?? 'info'},
      ${params.request_id ?? null},
      ${params.ip ?? null},
      ${params.user_agent ?? null},
      ${params.payload ? JSON.stringify(params.payload) : null}
    )
  `;
}

export interface AuditLogRow {
  id: string;
  created_at: string;
  actor_type: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  severity: string;
  request_id: string | null;
  ip: string | null;
  user_agent: string | null;
  payload: Record<string, unknown> | null;
}

export interface ListAuditLogParams {
  entity_type?: string;
  entity_id?: string;
  limit: number;
  cursor?: string | null;
}

export interface ListAuditLogResult {
  items: AuditLogRow[];
  next_cursor: string | null;
}

/**
 * Lists audit log rows, newest first. Cursor pagination via (created_at, id).
 * No joins, raw rows only.
 */
export async function listAuditLog(params: ListAuditLogParams): Promise<ListAuditLogResult> {
  const { entity_type, entity_id, limit, cursor } = params;
  let cursorCreatedAt: string | null = null;
  let cursorId: string | null = null;
  if (cursor) {
    try {
      const decoded = JSON.parse(Buffer.from(cursor, 'base64').toString('utf8'));
      cursorCreatedAt = decoded.created_at ?? null;
      cursorId = decoded.id ?? null;
    } catch {
      /* invalid cursor: ignore and start from latest */
    }
  }

  const safeLimit = Math.min(Math.max(1, limit), 100);
  const fetchCount = safeLimit + 1;
  const et = entity_type ?? null;
  const eid = entity_id ?? null;

  let rows: AuditLogRow[];
  if (cursorCreatedAt && cursorId) {
    rows = await sql<AuditLogRow[]>`
      SELECT id, created_at, actor_type, actor_id, action, entity_type, entity_id, severity, request_id, ip, user_agent, payload
      FROM audit_log
      WHERE (${et}::text IS NULL OR entity_type = ${et})
        AND (${eid}::text IS NULL OR entity_id = ${eid})
        AND (created_at, id) < (${cursorCreatedAt}::timestamptz, ${cursorId}::uuid)
      ORDER BY created_at DESC, id DESC
      LIMIT ${fetchCount}
    `;
  } else {
    rows = await sql<AuditLogRow[]>`
      SELECT id, created_at, actor_type, actor_id, action, entity_type, entity_id, severity, request_id, ip, user_agent, payload
      FROM audit_log
      WHERE (${et}::text IS NULL OR entity_type = ${et})
        AND (${eid}::text IS NULL OR entity_id = ${eid})
      ORDER BY created_at DESC, id DESC
      LIMIT ${fetchCount}
    `;
  }
  const hasMore = rows.length > safeLimit;
  const items = hasMore ? rows.slice(0, safeLimit) : rows;
  const last = items[items.length - 1];
  const next_cursor =
    hasMore && last
      ? Buffer.from(JSON.stringify({ created_at: last.created_at, id: last.id })).toString('base64')
      : null;

  return { items, next_cursor };
}

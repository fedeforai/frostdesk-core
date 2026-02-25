/**
 * Outbound send jobs queue (WhatsApp).
 * Enqueue outbound messages for reliable delivery with retry.
 */

import { sql } from './client.js';

function txAsSql(tx: unknown): typeof sql {
  return tx as unknown as typeof sql;
}

const DEFAULT_MAX_PENDING = 10_000;

function getMaxPending(): number {
  const n = process.env.OUTBOUND_QUEUE_MAX_PENDING;
  if (n === undefined || n === '') return DEFAULT_MAX_PENDING;
  const parsed = parseInt(n, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_PENDING;
}

export class OutboundQueueFullError extends Error {
  constructor(public readonly pendingCount: number) {
    super(`Outbound queue full: ${pendingCount} pending jobs`);
    this.name = 'OutboundQueueFullError';
  }
}

export type OutboundSendJobStatus = 'pending' | 'sent' | 'failed' | 'dead';

export interface EnqueueOutboundSendParams {
  messageId: string;
  conversationId: string;
  to: string;
  text: string;
  idempotencyKey?: string | null;
}

export interface EnqueueOutboundSendResult {
  jobId: string;
  messageId: string;
  alreadyEnqueued: boolean;
}

/**
 * Enqueues an outbound WhatsApp send job. Idempotent on idempotencyKey.
 * On unique violation for idempotency_key, returns existing job's messageId with alreadyEnqueued: true.
 */
export async function enqueueOutboundSend(
  params: EnqueueOutboundSendParams
): Promise<EnqueueOutboundSendResult> {
  const maxPending = getMaxPending();
  const pendingRows = await sql<Array<{ count: string }>>`
    SELECT count(*)::text AS count FROM outbound_send_jobs WHERE status = 'pending'
  `;
  const pendingCount = parseInt(pendingRows[0]?.count ?? '0', 10);
  if (pendingCount >= maxPending) {
    throw new OutboundQueueFullError(pendingCount);
  }

  const idempotencyKey = params.idempotencyKey?.trim() || null;

  if (idempotencyKey) {
    const existing = await sql<Array<{ id: string; message_id: string }>>`
      SELECT id, message_id
      FROM outbound_send_jobs
      WHERE idempotency_key = ${idempotencyKey}
        AND status IN ('pending', 'sent')
      LIMIT 1
    `;
    if (existing.length > 0) {
      return {
        jobId: existing[0].id,
        messageId: existing[0].message_id,
        alreadyEnqueued: true,
      };
    }
  }

  try {
    const now = new Date().toISOString();
    const result = await sql<Array<{ id: string; message_id: string }>>`
      INSERT INTO outbound_send_jobs (
        message_id,
        conversation_id,
        destination_phone,
        message_text,
        idempotency_key,
        status,
        attempts,
        max_attempts,
        next_retry_at,
        created_at,
        updated_at
      )
      VALUES (
        ${params.messageId}::uuid,
        ${params.conversationId}::uuid,
        ${params.to},
        ${params.text},
        ${idempotencyKey},
        'pending',
        0,
        5,
        ${now}::timestamptz,
        ${now}::timestamptz,
        ${now}::timestamptz
      )
      RETURNING id, message_id
    `;

    if (result.length === 0) {
      throw new Error('enqueueOutboundSend: no row returned');
    }

    return {
      jobId: result[0].id,
      messageId: result[0].message_id,
      alreadyEnqueued: false,
    };
  } catch (err: any) {
    if (err?.code === '23505') {
      const existing = await sql<Array<{ id: string; message_id: string }>>`
        SELECT id, message_id
        FROM outbound_send_jobs
        WHERE idempotency_key = ${idempotencyKey}
        LIMIT 1
      `;
      if (existing.length > 0) {
        return {
          jobId: existing[0].id,
          messageId: existing[0].message_id,
          alreadyEnqueued: true,
        };
      }
    }
    throw err;
  }
}

export interface OutboundSendJobRow {
  id: string;
  message_id: string;
  conversation_id: string;
  destination_phone: string;
  message_text: string;
  status: string;
  attempts: number;
  max_attempts: number;
}

/**
 * Claims the next pending job ready for retry (FOR UPDATE SKIP LOCKED).
 * In the same transaction sets next_retry_at = now() + 60s so other workers skip it until we finish.
 * Returns null if none available.
 */
export async function claimNextPendingJob(): Promise<OutboundSendJobRow | null> {
  return sql.begin(async (tx) => {
    const db = txAsSql(tx);
    const now = new Date().toISOString();
    const rows = await db<OutboundSendJobRow[]>`
      SELECT id, message_id, conversation_id, destination_phone, message_text, status, attempts, max_attempts
      FROM outbound_send_jobs
      WHERE status = 'pending'
        AND (next_retry_at IS NULL OR next_retry_at <= ${now}::timestamptz)
      ORDER BY next_retry_at ASC NULLS FIRST
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    `;
    if (rows.length === 0) return null;
    const job = rows[0];
    const claimUntil = new Date(Date.now() + 60_000).toISOString();
    await db`
      UPDATE outbound_send_jobs
      SET next_retry_at = ${claimUntil}::timestamptz, updated_at = ${now}::timestamptz
      WHERE id = ${job.id}::uuid
    `;
    return job;
  });
}

/**
 * Marks a job as sent and records external_message_id.
 */
export async function markOutboundJobSent(
  jobId: string,
  externalMessageId?: string | null
): Promise<void> {
  const now = new Date().toISOString();
  await sql`
    UPDATE outbound_send_jobs
    SET status = 'sent',
        external_message_id = ${externalMessageId ?? null},
        updated_at = ${now}::timestamptz
    WHERE id = ${jobId}::uuid
  `;
}

/**
 * Marks a job as failed (retry) or dead. Sets next_retry_at for retry, or status = 'dead' when attempts >= max_attempts.
 */
export async function markOutboundJobFailed(
  jobId: string,
  params: {
    attempts: number;
    maxAttempts: number;
    lastError: string;
  }
): Promise<void> {
  const now = new Date().toISOString();
  const isDead = params.attempts >= params.maxAttempts;
  const status = isDead ? 'dead' : 'pending';
  const backoffSeconds = Math.min(Math.pow(2, params.attempts), 900);
  const nextRetryAt = isDead ? null : new Date(Date.now() + backoffSeconds * 1000).toISOString();

  await sql`
    UPDATE outbound_send_jobs
    SET status = ${status},
        attempts = ${params.attempts},
        last_error = ${params.lastError},
        next_retry_at = ${nextRetryAt}::timestamptz,
        updated_at = ${now}::timestamptz
    WHERE id = ${jobId}::uuid
  `;
}

export interface OutboundQueueStats {
  pending: number;
  dead_last_24h: number;
  sent_last_24h: number;
}

/**
 * Returns queue stats for observability and admin dashboard.
 */
export async function getOutboundQueueStats(): Promise<OutboundQueueStats> {
  const now = new Date();
  const since = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  const [pendingRes, deadRes, sentRes] = await Promise.all([
    sql<Array<{ count: string }>>`
      SELECT count(*)::text AS count FROM outbound_send_jobs WHERE status = 'pending'
    `,
    sql<Array<{ count: string }>>`
      SELECT count(*)::text AS count FROM outbound_send_jobs WHERE status = 'dead' AND updated_at >= ${since}::timestamptz
    `,
    sql<Array<{ count: string }>>`
      SELECT count(*)::text AS count FROM outbound_send_jobs WHERE status = 'sent' AND updated_at >= ${since}::timestamptz
    `,
  ]);

  return {
    pending: parseInt(pendingRes[0]?.count ?? '0', 10),
    dead_last_24h: parseInt(deadRes[0]?.count ?? '0', 10),
    sent_last_24h: parseInt(sentRes[0]?.count ?? '0', 10),
  };
}

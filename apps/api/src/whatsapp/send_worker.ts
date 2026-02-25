/**
 * Outbound WhatsApp send worker. Polls outbound_send_jobs and sends via Meta API.
 * Runs in the same process as the API (setInterval). Retry with exponential backoff.
 */

import {
  claimNextPendingJob,
  markOutboundJobSent,
  markOutboundJobFailed,
  getConversationById,
  getInstructorWhatsappAccount,
} from '@frostdesk/db';
import { sendWhatsAppText } from '../integrations/whatsapp_cloud_api.js';
import { allowOutboundSend } from './rate_limiter.js';
import type { FastifyBaseLogger } from 'fastify';

const POLL_INTERVAL_MS = 2000;
const MAX_JOBS_PER_TICK = 5;

export interface SendWorkerOptions {
  log: FastifyBaseLogger;
  enabled?: boolean;
}

/**
 * Processes one pending job: claim, send via Meta API, update status.
 */
export async function processOneOutboundJob(
  log: FastifyBaseLogger
): Promise<boolean> {
  const job = await claimNextPendingJob();
  if (!job) return false;

  const start = Date.now();
  try {
    // Multi-tenant: use instructor's phone_number_id (and token when stored) for this conversation
    let phoneNumberId: string | null = null;
    let token: string | null = null;
    const conversation = await getConversationById(job.conversation_id);
    if (conversation?.instructor_id) {
      const instructorId =
        typeof conversation.instructor_id === 'string'
          ? conversation.instructor_id
          : String(conversation.instructor_id);
      const account = await getInstructorWhatsappAccount(instructorId);
      if (account?.phone_number_id) {
        phoneNumberId = account.phone_number_id;
        // Per-instructor token can be added to instructor_whatsapp_accounts later; for now env token is used
      }
    }

    const result = await sendWhatsAppText({
      to: job.destination_phone,
      text: job.message_text,
      phoneNumberId: phoneNumberId ?? undefined,
      token: token ?? undefined,
      context: { conversationId: job.conversation_id, messageId: job.message_id },
    });

    await markOutboundJobSent(job.id, result.externalMessageId);

    log.info(
      {
        event: 'whatsapp.send.sent',
        job_id: job.id,
        message_id: job.message_id,
        conversation_id: job.conversation_id,
        attempt: job.attempts + 1,
        duration_ms: Date.now() - start,
      },
      'Outbound WhatsApp send succeeded'
    );
    return true;
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    const attempts = job.attempts + 1;
    const isDead = attempts >= job.max_attempts;

    await markOutboundJobFailed(job.id, {
      attempts,
      maxAttempts: job.max_attempts,
      lastError: errorMessage,
    });

    log[isDead ? 'error' : 'warn'](
      {
        event: isDead ? 'whatsapp.send.dead' : 'whatsapp.send.failed',
        job_id: job.id,
        message_id: job.message_id,
        conversation_id: job.conversation_id,
        attempt: attempts,
        error_code: err instanceof Error ? (err as any).code : undefined,
        duration_ms: Date.now() - start,
      },
      isDead ? 'Outbound WhatsApp send dead (max attempts)' : 'Outbound WhatsApp send failed, will retry'
    );
    return true;
  }
}

/**
 * Starts the outbound send worker (polling every POLL_INTERVAL_MS).
 * Call the returned function to stop.
 */
export function startOutboundSendWorker(options: SendWorkerOptions): () => void {
  const { log, enabled = true } = options;

  if (!enabled) {
    log.info('Outbound send worker disabled');
    return () => {};
  }

  const tick = async () => {
    try {
      for (let i = 0; i < MAX_JOBS_PER_TICK; i++) {
        if (!allowOutboundSend()) break;
        const processed = await processOneOutboundJob(log);
        if (!processed) break;
      }
    } catch (err) {
      log.error({ err }, 'Outbound send worker tick error');
    }
  };

  const intervalId = setInterval(tick, POLL_INTERVAL_MS);
  log.info({ intervalMs: POLL_INTERVAL_MS }, 'Outbound send worker started');

  return () => {
    clearInterval(intervalId);
    log.info('Outbound send worker stopped');
  };
}

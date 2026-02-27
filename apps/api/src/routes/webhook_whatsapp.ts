import { FastifyInstance } from 'fastify';
import { normalizeError } from '../errors/normalize_error.js';
import { mapErrorToHttp } from '../errors/error_http_map.js';
import { ERROR_CODES } from '../errors/error_codes.js';
import {
  resolveConversationByChannel,
  persistInboundMessageWithInboxBridge,
  persistOutboundMessageFromEcho,
  orchestrateInboundDraft,
  insertAuditEvent,
  upsertCustomer,
  linkConversationToCustomer,
  normalizePhoneE164,
  getInstructorIdByPhoneNumberId,
  autoAssociatePhoneNumberId,
  connectInstructorWhatsappAccount,
} from '@frostdesk/db';
import { verifyWhatsAppSignature } from '../lib/whatsapp_webhook_verify.js';

/**
 * WhatsApp Webhook Routes (Pilot)
 *
 * WHAT IT DOES:
 * - Exposes POST /webhook/whatsapp endpoint
 * - Verifies Meta's X-Hub-Signature-256 (HMAC-SHA256 with App Secret)
 * - Parses and validates WhatsApp webhook payloads
 * - Resolves conversation via channel identity mapping
 * - Persists inbound message (inbound_messages + messages)
 * - Triggers AI draft orchestration (classification + optional draft)
 * - Idempotent on external_message_id
 *
 * WHAT IT DOES NOT DO:
 * - No autonomous outbound send
 * - No booking creation
 */

/**
 * Resolves the instructor_id for a webhook message.
 * Priority: phone_number_id lookup → auto-associate by display_phone_number → DEFAULT_INSTRUCTOR_ID.
 */
async function resolveInstructorId(
  phoneNumberId: string | undefined,
  displayPhoneNumber: string | undefined,
  log: { info: (obj: unknown, msg?: string) => void },
): Promise<string | number> {
  const defaultId = process.env.DEFAULT_INSTRUCTOR_ID ?? 1;

  if (!phoneNumberId) return defaultId;

  const instructorId = await getInstructorIdByPhoneNumberId(phoneNumberId);
  if (instructorId) return instructorId;

  if (displayPhoneNumber) {
    const normalizedDisplay = normalizePhoneE164(displayPhoneNumber);
    if (normalizedDisplay) {
      const associatedId = await autoAssociatePhoneNumberId(normalizedDisplay, phoneNumberId);
      if (associatedId) {
        log.info(
          { phoneNumberId, displayPhoneNumber: normalizedDisplay, instructorId: associatedId },
          'Auto-associated WhatsApp phone_number_id to instructor',
        );
        return associatedId;
      }
    }
  }

  if (typeof defaultId === 'string' && defaultId.includes('-')) {
    try {
      const displayNorm = displayPhoneNumber ? normalizePhoneE164(displayPhoneNumber) : null;
      if (displayNorm) {
        await connectInstructorWhatsappAccount(defaultId, displayNorm);
      }
    } catch { /* fail-open: default instructor may already have an account */ }
  }

  return defaultId;
}

export async function webhookWhatsAppRoutes(fastify: FastifyInstance) {
  // GET: Meta webhook verification (Callback URL validation)
  fastify.get('/webhook/whatsapp', async (request, reply) => {
    const query = request.query as {
      'hub.mode'?: string;
      'hub.verify_token'?: string;
      'hub.challenge'?: string;
    };
    const mode = query['hub.mode'];
    const verifyToken = query['hub.verify_token'];
    const challenge = query['hub.challenge'];

    if (!mode || !verifyToken || !challenge) {
      return reply.status(400).send({ ok: false, error: 'Missing hub.mode, hub.verify_token or hub.challenge' });
    }

    const expectedToken = process.env.META_WHATSAPP_VERIFY_TOKEN || process.env.META_VERIFY_TOKEN;
    if (!expectedToken || verifyToken !== expectedToken) {
      request.log.warn('WhatsApp webhook verification failed: token mismatch or META_WHATSAPP_VERIFY_TOKEN unset');
      return reply.status(403).send({ ok: false, error: 'Invalid verify token' });
    }

    if (mode === 'subscribe') {
      return reply.type('text/plain').send(challenge);
    }

    return reply.status(400).send({ ok: false, error: 'Invalid hub.mode' });
  });

  // Raw body parser — scoped to this plugin (signature verification needs raw bytes).
  fastify.addContentTypeParser(
    'application/json',
    { parseAs: 'buffer' },
    (_req, body, done) => {
      done(null, body);
    },
  );

  fastify.post('/webhook/whatsapp', async (request, reply) => {
    try {
      // ── Signature verification ──────────────────────────────────────────
      const appSecret = process.env.META_APP_SECRET || process.env.META_WHATSAPP_APP_SECRET;
      const skipVerify = process.env.NODE_ENV !== 'production'
        && process.env.SKIP_WHATSAPP_SIGNATURE_VERIFY === '1';

      if (!skipVerify) {
        if (!appSecret) {
          request.log.error('META_APP_SECRET / META_WHATSAPP_APP_SECRET not configured — rejecting webhook');
          return reply.status(500).send({
            ok: false,
            error: 'WEBHOOK_SECRET_NOT_CONFIGURED',
            message: 'WhatsApp webhook secret not configured',
          });
        }

        const signature = request.headers['x-hub-signature-256'] as string | undefined;
        const rawBody = request.body as Buffer;

        if (!signature || !verifyWhatsAppSignature(rawBody, signature, appSecret)) {
          request.log.warn({ hasSignature: !!signature }, 'WhatsApp webhook signature verification failed');
          return reply.status(401).send({
            ok: false,
            error: 'INVALID_SIGNATURE',
            message: 'Webhook signature verification failed',
          });
        }
      }

      // Parse the raw buffer into JSON for subsequent processing
      const body = JSON.parse(
        Buffer.isBuffer(request.body)
          ? (request.body as Buffer).toString('utf-8')
          : JSON.stringify(request.body),
      ) as {
        entry?: Array<{
          changes?: Array<{
            value?: {
              metadata?: { display_phone_number?: string; phone_number_id?: string };
              messages?: Array<{
                id?: string;
                from?: string;
                to?: string;
                timestamp?: string;
                type?: string;
                text?: { body?: string };
              }>;
            };
          }>;
        }>;
      };

      // Extract first message: entry[0].changes[0].value.messages[0]
      if (!body.entry || !Array.isArray(body.entry) || body.entry.length === 0) {
        const normalized = normalizeError({ code: ERROR_CODES.INVALID_PAYLOAD });
        const httpStatus = mapErrorToHttp(normalized.error);
        return reply.status(httpStatus).send({
          ok: false,
          error: {
            code: normalized.error,
            message: normalized.message || 'Missing entry array in payload',
          },
        });
      }

      const entry = body.entry[0];
      if (!entry.changes || !Array.isArray(entry.changes) || entry.changes.length === 0) {
        const normalized = normalizeError({ code: ERROR_CODES.INVALID_PAYLOAD });
        const httpStatus = mapErrorToHttp(normalized.error);
        return reply.status(httpStatus).send({
          ok: false,
          error: {
            code: normalized.error,
            message: normalized.message || 'Missing changes array in entry',
          },
        });
      }

      const change = entry.changes[0];
      if (!change.value || !change.value.messages || !Array.isArray(change.value.messages) || change.value.messages.length === 0) {
        const normalized = normalizeError({ code: ERROR_CODES.INVALID_PAYLOAD });
        const httpStatus = mapErrorToHttp(normalized.error);
        return reply.status(httpStatus).send({
          ok: false,
          error: {
            code: normalized.error,
            message: normalized.message || 'Missing messages array in change value',
          },
        });
      }

      const message = change.value.messages[0];

      // Validate required fields
      if (!message.id) {
        const normalized = normalizeError({ code: ERROR_CODES.INVALID_PAYLOAD });
        const httpStatus = mapErrorToHttp(normalized.error);
        return reply.status(httpStatus).send({
          ok: false,
          error: {
            code: normalized.error,
            message: normalized.message || 'Missing message.id',
          },
        });
      }

      if (!message.from) {
        const normalized = normalizeError({ code: ERROR_CODES.INVALID_PAYLOAD });
        const httpStatus = mapErrorToHttp(normalized.error);
        return reply.status(httpStatus).send({
          ok: false,
          error: {
            code: normalized.error,
            message: normalized.message || 'Missing message.from',
          },
        });
      }

      if (!message.timestamp) {
        const normalized = normalizeError({ code: ERROR_CODES.INVALID_PAYLOAD });
        const httpStatus = mapErrorToHttp(normalized.error);
        return reply.status(httpStatus).send({
          ok: false,
          error: {
            code: normalized.error,
            message: normalized.message || 'Missing message.timestamp',
          },
        });
      }

      const value = change.value;
      const phoneNumberId = value.metadata?.phone_number_id;
      const displayPhone = value.metadata?.display_phone_number?.trim() ?? '';

      // Resolve instructor from webhook metadata (multi-tenant routing). Set in echo path or inbound path below.
      let instructorIdForConversation: string;

      // Message echo: business replied from WhatsApp app (from = business number). Sync to inbox.
      const businessPhone = value.metadata?.display_phone_number;
      const fromNormalized = normalizePhoneE164(message.from) ?? message.from;
      const businessNormalized = businessPhone ? (normalizePhoneE164(businessPhone) ?? businessPhone) : '';
      const isEcho = Boolean(
        businessNormalized &&
        fromNormalized &&
        businessNormalized === fromNormalized
      );

      if (isEcho) {
        if (!message.to || !message.text?.body) {
          request.log.warn(
            { messageId: message.id, hasTo: !!message.to, hasText: !!message.text?.body },
            'WhatsApp echo missing to or text.body, skipping sync'
          );
          return reply.status(200).send({ ok: true });
        }
        const customerIdentifier = normalizePhoneE164(message.to) ?? message.to;
        instructorIdForConversation = (await resolveInstructorId(
          value.metadata?.phone_number_id,
          value.metadata?.display_phone_number,
          request.log,
        )) as string;
        const conversation = await resolveConversationByChannel(
          'whatsapp',
          customerIdentifier,
          instructorIdForConversation as string
        );
        const conversationId = conversation?.id;
        if (
          typeof conversationId !== 'string' ||
          !conversationId.match(/^[0-9a-fA-F-]{36}$/)
        ) {
          request.log.warn(
            { customerIdentifier, conversationId },
            'WhatsApp echo: no conversation found for recipient, skipping sync'
          );
          return reply.status(200).send({ ok: true });
        }
        await persistOutboundMessageFromEcho({
          conversationId,
          channel: 'whatsapp',
          externalMessageId: message.id,
          messageText: message.text.body,
          receivedAt: new Date(Number(message.timestamp) * 1000),
          rawPayload: { ...message, channel: 'whatsapp', echo: true },
        });
        try {
          await insertAuditEvent({
            actor_type: 'system',
            actor_id: null,
            action: 'outbound_message_echo_received',
            entity_type: 'conversation',
            entity_id: conversationId,
            severity: 'info',
            request_id: request.id ?? null,
            payload: { channel: 'whatsapp', message_id: message.id },
          });
        } catch {
          /* audit fail-open */
        }
        return reply.status(200).send({ ok: true });
      }

      // Support only text messages (inbound path)
      if (message.type !== 'text') {
        const normalized = normalizeError({ code: ERROR_CODES.INVALID_PAYLOAD });
        const httpStatus = mapErrorToHttp(normalized.error);
        return reply.status(httpStatus).send({
          ok: false,
          error: {
            code: normalized.error,
            message: normalized.message || `Unsupported message type: ${message.type}. Only 'text' is supported`,
          },
        });
      }

      if (!message.text || !message.text.body) {
        const normalized = normalizeError({ code: ERROR_CODES.INVALID_PAYLOAD });
        const httpStatus = mapErrorToHttp(normalized.error);
        return reply.status(httpStatus).send({
          ok: false,
          error: {
            code: normalized.error,
            message: normalized.message || 'Missing message.text.body',
          },
        });
      }

      // Normalize WhatsApp message to canonical format
      // CM-1: Normalize phone to E.164 to prevent duplicate customers/conversations.
      // WhatsApp may send "447712345021" or "+447712345021" — both must resolve to same identity.
      const normalizedMessage = {
        external_id: message.id,
        channel: 'whatsapp' as const,
        sender_identifier: normalizePhoneE164(message.from) ?? message.from,
        text: message.text.body,
        received_at: new Date(Number(message.timestamp) * 1000),
      };

      // Resolve instructor from webhook metadata (multi-tenant routing).
      // Priority: phone_number_id → auto-associate display_phone_number → DEFAULT_INSTRUCTOR_ID.
      instructorIdForConversation = (await resolveInstructorId(
        value.metadata?.phone_number_id,
        value.metadata?.display_phone_number,
        request.log,
      )) as string;

      const conversation = await resolveConversationByChannel(
        'whatsapp',
        normalizedMessage.sender_identifier,
        instructorIdForConversation
      );

      // Fail-fast: resolved conversation must have a valid UUID id
      const conversationId = conversation?.id;
      if (
        typeof conversationId !== 'string' ||
        !conversationId.match(/^[0-9a-fA-F-]{36}$/)
      ) {
        const normalized = normalizeError({ code: ERROR_CODES.INVARIANT_FAILED });
        const httpStatus = mapErrorToHttp(normalized.error);
        return reply.status(httpStatus).send({
          ok: false,
          error: {
            code: normalized.error,
            message: normalized.message || 'Resolved conversation has no valid id',
          },
        });
      }

      // CM-2: Upsert customer profile and link to conversation (fail-open)
      try {
        const instructorIdStr =
          typeof instructorIdForConversation === 'string'
            ? instructorIdForConversation
            : String(instructorIdForConversation);

        const customer = await upsertCustomer({
          instructorId: instructorIdStr,
          phoneNumber: normalizedMessage.sender_identifier,
          source: 'whatsapp',
        });

        const linked = await linkConversationToCustomer(conversationId, customer.id);
        if (linked) {
          try {
            await insertAuditEvent({
              actor_type: 'system',
              actor_id: null,
              action: 'customer_linked',
              entity_type: 'conversation',
              entity_id: conversationId,
              severity: 'info',
              payload: {
                customer_id: customer.id,
                phone: normalizedMessage.sender_identifier,
                source: 'whatsapp_ingestion',
              },
            });
          } catch { /* audit fail-open */ }
        }
      } catch (linkErr) {
        request.log.warn({ err: linkErr }, 'Customer linking failed (non-fatal)');
      }

      // PILOT MODE v1: message_type intentionally removed. Direction + channel are sufficient.
      // Persist message with inbox bridge (idempotent: checks external_id before insert)
      // This function inserts into both inbound_messages and messages tables atomically
      await persistInboundMessageWithInboxBridge({
        conversationId: conversationId,
        channel: normalizedMessage.channel,
        externalMessageId: normalizedMessage.external_id,
        senderIdentity: normalizedMessage.sender_identifier,
        messageText: normalizedMessage.text,
        // PILOT MODE v1: messageType removed (column not in schema)
        receivedAt: normalizedMessage.received_at,
        rawPayload: {
          ...message,
          // PILOT MODE v1: message_type removed from payload
          channel: normalizedMessage.channel,
        },
      });

      // Phase C1: inbound message audit (metadata only, fail-open)
      try {
        await insertAuditEvent({
          actor_type: 'system',
          actor_id: null,
          action: 'inbound_message_received',
          entity_type: 'conversation',
          entity_id: conversationId,
          severity: 'info',
          request_id: request.id ?? null,
          ip: request.ip ?? null,
          user_agent: request.headers['user-agent'] ?? null,
          payload: {
            channel: 'whatsapp',
            direction: 'inbound',
            message_type: message.type ?? 'text',
          },
        });
      } catch (auditErr) {
        request.log.error({ err: auditErr }, 'Audit write failed (inbound_message_received)');
      }

      // F2.4.1: Orchestrate AI classification and draft generation (idempotent)
      try {
        const orchResult = await orchestrateInboundDraft({
          conversationId: conversationId,
          externalMessageId: normalizedMessage.external_id,
          messageText: normalizedMessage.text,
          channel: normalizedMessage.channel,
          language: 'it', // TODO: detect from message or payload
          requestId: request.id ?? null,
        });

        // Loop A: Log AI span telemetry (fail-open)
        try {
          const { logAiSpan } = await import('../lib/logger.js');
          logAiSpan({
            request_id: (request as any).id ?? null,
            conversation_id: conversationId,
            task: 'intent_classification',
            model: orchResult.timedOut ? 'timeout-fallback' : 'stub-v1',
            latency_ms: orchResult.classificationElapsedMs ?? 0,
            timed_out: orchResult.timedOut ?? false,
            confidence_band: orchResult.confidenceBand ?? null,
          });
        } catch { /* telemetry is best-effort */ }
      } catch {
        // Orchestration failure should not break webhook response
        // Log error but return 200 OK (message was persisted)
      }

      return reply.status(200).send({ ok: true });
    } catch (error) {
      // Normalize any unexpected errors
      const normalized = normalizeError(error);
      const httpStatus = mapErrorToHttp(normalized.error);
      return reply.status(httpStatus).send({
        ok: false,
        error: {
          code: normalized.error,
          message: normalized.message || 'Failed to parse WhatsApp payload',
        },
      });
    }
  });
}

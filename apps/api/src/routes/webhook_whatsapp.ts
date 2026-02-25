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
  connectInstructorWhatsappAccount,
} from '@frostdesk/db';
import { verifyWhatsappSignature } from '../lib/whatsapp_signature.js';

/**
 * WhatsApp Webhook Routes (Pilot)
 *
 * WHAT IT DOES:
 * - Exposes POST /webhook/whatsapp endpoint
 * - Verifies request signature via X-Hub-Signature-256 (META_WHATSAPP_APP_SECRET)
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
      // ── Signature verification ──────────────────────────────────────────────
      const secret = process.env.META_WHATSAPP_APP_SECRET;
      if (!secret || typeof secret !== 'string' || !secret.trim()) {
        request.log.warn('META_WHATSAPP_APP_SECRET not configured');
        return reply.status(500).send({
          ok: false,
          error: 'Webhook secret not configured',
        });
      }

      const signature = request.headers['x-hub-signature-256'] as string | undefined;
      if (!signature || typeof signature !== 'string') {
        request.log.warn('Missing X-Hub-Signature-256 header');
        return reply.status(400).send({
          ok: false,
          error: 'Missing X-Hub-Signature-256 header',
        });
      }

      const rawBody = Buffer.isBuffer(request.body) ? request.body.toString('utf8') : String(request.body);
      if (!verifyWhatsappSignature({ payload: rawBody, signature, secret })) {
        request.log.warn('WhatsApp webhook signature verification failed');
        return reply.status(401).send({
          ok: false,
          error: 'Invalid signature',
        });
      }

      // Parse WhatsApp payload structure (inbound + message echo when business replies from phone)
      type WhatsAppWebhookPayload = {
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
      let body: WhatsAppWebhookPayload;
      try {
        body = JSON.parse(rawBody) as WhatsAppWebhookPayload;
      } catch (parseErr) {
        request.log.warn({ err: parseErr }, 'WhatsApp webhook body JSON parse failed');
        return reply.status(400).send({
          ok: false,
          error: 'Invalid JSON body',
        });
      }

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

      // Resolve instructor from Meta phone_number_id (multi-tenant). Auto-link unknown numbers to default instructor.
      const defaultInstructorId =
        process.env.DEFAULT_INSTRUCTOR_ID?.trim() || '00000000-0000-0000-0000-000000000001';
      let instructorIdForConversation: string;
      if (typeof phoneNumberId === 'string' && phoneNumberId) {
        const resolved = await getInstructorIdByPhoneNumberId(phoneNumberId);
        if (resolved) {
          instructorIdForConversation = resolved;
        } else {
          // First time we see this phone_number_id: link it to the default instructor so future lookups succeed.
          try {
            await connectInstructorWhatsappAccount({
              instructorId: defaultInstructorId,
              phoneNumber: displayPhone || 'unknown',
              phoneNumberId,
            });
          } catch (err) {
            request.log.warn({ err, phoneNumberId, defaultInstructorId }, 'Auto-link phone_number_id to default instructor failed');
          }
          instructorIdForConversation = defaultInstructorId;
        }
      } else {
        instructorIdForConversation = defaultInstructorId;
      }

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

      // Resolve conversation by channel and customer identifier (instructor already resolved above from phone_number_id).
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
        const instructorIdStr = instructorIdForConversation;

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

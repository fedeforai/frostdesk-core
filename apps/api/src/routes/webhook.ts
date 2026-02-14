import { FastifyInstance } from 'fastify';
import {
  findChannelIdentityMapping,
  insertChannelIdentityMapping,
  resolveConversationForInboundMessage,
  findInboundMessageByExternalId,
  insertInboundMessage,
  createMessage,
  sql,
  sendAIReply,
  ensureValidUUID,
} from '@frostdesk/db';
import { sendWhatsAppAck } from '../integrations/whatsapp_outbound.js';
import { normalizeError } from '../errors/normalize_error.js';
import { mapErrorToHttp } from '../errors/error_http_map.js';
import { ERROR_CODES } from '../errors/error_codes.js';
import { generateAIReply } from '@frostdesk/ai';
// PILOT STUB — services disabled
// import { classifyAndStoreIntent } from '@frostdesk/services/src/intent_classification_service.js';

// PILOT STUB — Temporary stub for classifyAndStoreIntent until @frostdesk/services package is available
async function classifyAndStoreIntent(_params: {
  message_id: string;
  text: string;
  channel: string;
}): Promise<void> {
  // No-op: intent classification disabled during pilot
  return Promise.resolve();
}

/**
 * OUT OF PILOT SCOPE – DO NOT USE FOR WHATSAPP IN v1
 * 
 * PILOT MODE v1: This webhook route is LEGACY and should NOT handle WhatsApp inbound messages.
 * WhatsApp inbound MUST go ONLY through webhook_whatsapp.ts.
 * 
 * This route requires message_type which is not in the pilot schema.
 */
export async function webhookRoutes(fastify: FastifyInstance) {
  // GET /webhook - Meta WhatsApp webhook verification
  fastify.get('/webhook', async (request, reply) => {
    try {
      const query = request.query as {
        'hub.mode'?: string;
        'hub.verify_token'?: string;
        'hub.challenge'?: string;
      };

      const mode = query['hub.mode'];
      const verifyToken = query['hub.verify_token'];
      const challenge = query['hub.challenge'];

      // Check for missing parameters
      if (!mode || !verifyToken || !challenge) {
        const normalized = normalizeError({ code: ERROR_CODES.MISSING_PARAMETERS });
        const httpStatus = mapErrorToHttp(normalized.error);
        return reply.status(httpStatus).send({
          ok: false,
          error: normalized.error,
          ...(normalized.message ? { message: normalized.message } : {}),
        });
      }

      // Verify mode and token
      const expectedToken = process.env.META_VERIFY_TOKEN;
      if (mode === 'subscribe' && verifyToken === expectedToken) {
        // Return raw text body with challenge (no JSON)
        return reply.type('text/plain').send(challenge);
      }

      // Invalid verification
      const normalized = normalizeError({ code: ERROR_CODES.INVALID_PAYLOAD });
      const httpStatus = mapErrorToHttp(normalized.error);
      return reply.status(httpStatus).send({
        ok: false,
        error: normalized.error,
        ...(normalized.message ? { message: normalized.message } : {}),
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

  fastify.post('/webhook', async (request, reply) => {
    try {
      // Parse Meta WhatsApp payload
      const body = request.body as {
        object?: string;
        entry?: Array<{
          id?: string;
          changes?: Array<{
            value?: {
              messaging_product?: string;
              metadata?: {
                phone_number_id?: string;
              };
              messages?: Array<{
                id?: string;
                from?: string;
                timestamp?: string;
                type?: string;
                text?: {
                  body?: string;
                };
              }>;
            };
          }>;
        }>;
      };

      // Validate payload structure
      if (!body.entry || !Array.isArray(body.entry) || body.entry.length === 0) {
        const normalized = normalizeError({ code: ERROR_CODES.MISSING_PARAMETERS });
        const httpStatus = mapErrorToHttp(normalized.error);
        return reply.status(httpStatus).send({
          ok: false,
          error: normalized.error,
          ...(normalized.message ? { message: normalized.message } : {}),
        });
      }

      // Process each entry
      for (const entry of body.entry) {
        if (!entry.changes || !Array.isArray(entry.changes)) {
          continue;
        }

        for (const change of entry.changes) {
          if (!change.value || !change.value.messages || !Array.isArray(change.value.messages)) {
            continue;
          }

          const phoneNumberId = change.value.metadata?.phone_number_id;

          // Process each message
          for (const message of change.value.messages) {
            // Extract required fields
            const externalMessageId = message.id;
            const from = message.from;
            const timestamp = message.timestamp;
            const messageType = message.type;
            const textBody = message.type === 'text' ? message.text?.body : null;

            // Validate required fields
            if (!externalMessageId || !from || !timestamp || !messageType) {
              continue; // Skip invalid messages, but continue processing others
            }

            // Resolve channel identity to get conversation_id
            const channel = 'whatsapp';
            const externalIdentity = from;
            let conversationId: string;

            // Check for existing channel identity mapping
            const mapping = await findChannelIdentityMapping(channel, externalIdentity);

            if (mapping) {
              // Validate conversation_id from mapping is a valid UUID
              // This prevents corrupted database rows from propagating non-UUID values like "1"
              conversationId = ensureValidUUID(mapping.conversation_id);
            } else {
              // Unmapped: create conversation and mapping
              // Use default instructor_id = 1 (as per existing patterns)
              const conversation = await resolveConversationForInboundMessage({
                instructorId: '1',
                customerIdentifier: externalIdentity,
              });
              // Ensure conversation.id is a valid UUID (defensive check)
              conversationId = ensureValidUUID(conversation.id);

              // Create channel identity mapping
              try {
                await insertChannelIdentityMapping(channel, externalIdentity, conversationId);
              } catch (error) {
                // Mapping might already exist (race condition), continue anyway
                // The message persistence will still work with the conversation_id
              }
            }

            // Idempotency check: skip if message already exists
            const existing = await findInboundMessageByExternalId(channel, externalMessageId);
            if (existing) {
              continue; // Message already persisted, skip
            }

            // Persist inbound message
            const inboundMessageId = await insertInboundMessage({
              channel,
              conversation_id: conversationId,
              external_message_id: externalMessageId,
              sender_identity: externalIdentity,
              message_type: messageType,
              message_text: textBody || null,
              raw_payload: message,
              received_at: new Date(Number(timestamp) * 1000).toISOString(),
            });

            // Classify intent for text messages (passive observer)
            if (messageType === 'text' && textBody) {
              try {
                await classifyAndStoreIntent({
                  message_id: inboundMessageId,
                  text: textBody,
                  channel,
                });
              } catch (error) {
                // Silently fail, do not affect webhook response
              }
            }

            // Generate and persist AI reply for WhatsApp text messages
            if (channel === 'whatsapp' && messageType === 'text' && textBody) {
              try {
                const aiReply = await generateAIReply({
                  lastMessageText: textBody,
                });
                await sendAIReply({
                  conversationId,
                  replyText: aiReply.replyText,
                });
              } catch (error) {
                // Silently fail, webhook must return 200
              }
            }

            // Send ACK for text messages (once per conversation)
            if (messageType === 'text') {
              try {
                // Check if outbound already sent (simple SQL query)
                const existingOutbound = await sql<Array<{ id: string }>>`
                  SELECT id FROM messages 
                  WHERE conversation_id = ${conversationId} 
                    AND direction = 'outbound' 
                  LIMIT 1
                `;

                if (existingOutbound.length === 0 && phoneNumberId) {
                  // Send ACK via Meta API
                  await sendWhatsAppAck({
                    phoneNumberId,
                    to: from,
                    messageText: 'Hi! We received your message. An instructor will get back to you shortly.',
                  });

                  // Persist outbound message
                  await createMessage({
                    conversation_id: conversationId,
                    direction: 'outbound',
                    content: 'Hi! We received your message. An instructor will get back to you shortly.',
                    raw_payload: '{}', // Minimal payload, no need to store full Meta response
                  });
                }
              } catch (error) {
                // Log error but don't fail webhook (Meta retries on non-200)
                // Fastify logger will handle this
              }
            }
          }
        }
      }

      // Always return 200 OK for valid payloads (Meta retries if not 200)
      return reply.status(200).send({ ok: true });
    } catch (error) {
      // For Meta webhooks, we should still return 200 to avoid retries
      // But log the error internally (Fastify logger handles this)
      // Return 200 to prevent Meta from retrying
      return reply.status(200).send({ ok: true });
    }
  });
}

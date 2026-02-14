/**
 * Instructor customers: list, detail, add note.
 * Ownership: instructor can only access their own customers.
 */

import type { FastifyInstance } from 'fastify';
import type { AuditEventEntityType } from '@frostdesk/db';
import {
  listInstructorCustomers,
  getCustomerById,
  listNotesByCustomerId,
  createCustomerNote,
  computeCustomerValueScore,
  upsertCustomer,
  getCustomerStats,
  insertAuditEvent,
} from '@frostdesk/db';
import { getUserIdFromJwt } from '../../lib/auth_instructor.js';
import {
  getInstructorProfileByUserId,
  getInstructorProfileDefinitiveByUserId,
} from '@frostdesk/db';
import { normalizeError } from '../../errors/normalize_error.js';
import { mapErrorToHttp } from '../../errors/error_http_map.js';
import { ERROR_CODES } from '../../errors/error_codes.js';
import { isPilotInstructor } from '../../lib/pilot_instructor.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function getInstructorId(request: { headers?: { authorization?: string } }): Promise<string> {
  const userId = await getUserIdFromJwt(request);
  const definitive = await getInstructorProfileDefinitiveByUserId(userId);
  if (definitive) return definitive.id;
  const legacy = await getInstructorProfileByUserId(userId);
  if (legacy) return legacy.id;
  const e = new Error('Instructor profile not found');
  (e as any).code = ERROR_CODES.NOT_FOUND;
  throw e;
}

function isValidUUID(id: string): boolean {
  return UUID_REGEX.test(id);
}

export async function instructorCustomersRoutes(app: FastifyInstance): Promise<void> {
  // GET /instructor/customers — list (optional search, limit, offset)
  app.get<{ Querystring: { search?: string; limit?: string; offset?: string } }>(
    '/instructor/customers',
    async (request, reply) => {
      try {
        const instructorId = await getInstructorId(request);
        const q = request.query || {};
        const limit = Math.min(500, Math.max(1, parseInt(String(q.limit || '100'), 10) || 100));
        const offset = Math.max(0, parseInt(String(q.offset || '0'), 10) || 0);
        const items = await listInstructorCustomers({
          instructorId,
          search: typeof q.search === 'string' ? q.search : undefined,
          limit,
          offset,
        });
        return reply.send({ items: items ?? [] });
      } catch (err) {
        const normalized = normalizeError(err);
        const status = mapErrorToHttp(normalized.error);
        return reply.status(status).send({ ok: false, error: normalized.error, message: normalized.message });
      }
    }
  );

  // GET /instructor/customers/:id — detail (customer + notes + stats)
  app.get<{ Params: { id: string } }>('/instructor/customers/:id', async (request, reply) => {
    try {
      const instructorId = await getInstructorId(request);
      const id = (request.params as { id: string }).id?.trim();
      if (!id || !isValidUUID(id)) {
        return reply.status(400).send({
          ok: false,
          error: ERROR_CODES.MISSING_PARAMETERS,
          message: 'Valid customer UUID required',
        });
      }
      const customer = await getCustomerById(id, instructorId);
      if (!customer) {
        return reply.status(404).send({
          ok: false,
          error: ERROR_CODES.NOT_FOUND,
          message: 'Customer not found',
        });
      }
      const notes = await listNotesByCustomerId(id, 50);
      const statsRow = await getCustomerStats(id);
      const value_score = computeCustomerValueScore({
        lastSeenAt: customer.last_seen_at,
        notesCount: statsRow.notesCount,
        bookingsCount: statsRow.bookingsCount,
        firstSeenAt: customer.first_seen_at,
      });
      const stats = {
        notes_count: statsRow.notesCount,
        bookings_count: statsRow.bookingsCount,
        value_score,
      };
      return reply.send({ customer, notes, stats });
    } catch (err) {
      const normalized = normalizeError(err);
      const status = mapErrorToHttp(normalized.error);
      return reply.status(status).send({ ok: false, error: normalized.error, message: normalized.message });
    }
  });

  // POST /instructor/customers/:id/notes — add note
  app.post<{ Params: { id: string }; Body: { content?: string } }>(
    '/instructor/customers/:id/notes',
    async (request, reply) => {
      try {
        const instructorId = await getInstructorId(request);
        if (!isPilotInstructor(instructorId)) {
          return reply.status(402).send({
            ok: false,
            error: ERROR_CODES.PILOT_ONLY,
            message: 'This feature is only available for pilot instructors.',
          });
        }
        const id = (request.params as { id: string }).id?.trim();
        if (!id || !isValidUUID(id)) {
          return reply.status(400).send({
            ok: false,
            error: ERROR_CODES.MISSING_PARAMETERS,
            message: 'Valid customer UUID required',
          });
        }
        const customer = await getCustomerById(id, instructorId);
        if (!customer) {
          return reply.status(404).send({
            ok: false,
            error: ERROR_CODES.NOT_FOUND,
            message: 'Customer not found',
          });
        }
        const content = typeof request.body?.content === 'string' ? request.body.content : '';
        if (!content.trim()) {
          return reply.status(400).send({
            ok: false,
            error: ERROR_CODES.MISSING_PARAMETERS,
            message: 'Note content is required',
          });
        }
        const note = await createCustomerNote({
          customerId: id,
          instructorId,
          content: content.trim(),
        });
        await insertAuditEvent({
          actor_type: 'instructor',
          actor_id: instructorId,
          action: 'customer_note_added',
          entity_type: 'customer' as AuditEventEntityType,
          entity_id: id,
          payload: { customerId: id, noteId: note.id },
        }).catch(() => { /* fail-open */ });
        return reply.status(201).send({ ok: true, id: note.id, note });
      } catch (err) {
        const normalized = normalizeError(err);
        const status = mapErrorToHttp(normalized.error);
        return reply.status(status).send({ ok: false, error: normalized.error, message: normalized.message });
      }
    }
  );

  // POST /instructor/customers — create/upsert customer (phone_number required)
  app.post<{ Body: { phone_number?: string; phoneNumber?: string; display_name?: string; displayName?: string; source?: string } }>(
    '/instructor/customers',
    async (request, reply) => {
      try {
        const instructorId = await getInstructorId(request);
        if (!isPilotInstructor(instructorId)) {
          return reply.status(402).send({
            ok: false,
            error: ERROR_CODES.PILOT_ONLY,
            message: 'This feature is only available for pilot instructors.',
          });
        }
        const b = request.body || {};
        const phoneNumber =
          typeof b.phone_number === 'string'
            ? b.phone_number.trim()
            : typeof b.phoneNumber === 'string'
              ? b.phoneNumber.trim()
              : '';
        if (!phoneNumber) {
          return reply.status(400).send({
            ok: false,
            error: ERROR_CODES.MISSING_PARAMETERS,
            message: 'phone_number is required',
          });
        }
        const displayName =
          typeof b.display_name === 'string'
            ? b.display_name.trim()
            : typeof b.displayName === 'string'
              ? b.displayName.trim()
              : undefined;
        const source =
          typeof b.source === 'string' && ['whatsapp', 'web', 'referral', 'manual'].includes(b.source)
            ? b.source
            : 'whatsapp';
        const customer = await upsertCustomer({
          instructorId,
          phoneNumber,
          displayName: displayName || null,
          source,
        });
        return reply.status(201).send({ ok: true, id: customer.id, customer });
      } catch (err) {
        const normalized = normalizeError(err);
        const status = mapErrorToHttp(normalized.error);
        return reply.status(status).send({ ok: false, error: normalized.error, message: normalized.message });
      }
    }
  );
}

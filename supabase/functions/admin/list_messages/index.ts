import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { requireAdmin } from '../_shared/admin_guard.ts';
import { mapErrorToResponse } from '../_shared/error_mapper.ts';
import { parseQuery } from '../_shared/parse_query.ts';
import { getAdminMessages } from '../../../../packages/db/src/admin_message_service.js';

Deno.serve(async (req: Request) => {
  try {
    // Auth check and admin guard
    const userId = await requireAdmin(req);

    // Parse query parameters
    const query = parseQuery(req.url);

    // Call admin service with all query params
    const items = await getAdminMessages({
      userId,
      limit: query.limit,
      offset: query.offset,
      conversationId: query.conversationId as string | undefined,
      instructorId: query.instructorId as string | undefined,
      direction: query.direction as 'inbound' | 'outbound' | undefined,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
    });

    // Return standard response shape
    const response = {
      items,
      limit: query.limit,
      offset: query.offset,
    };

    return new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    const { status, body } = mapErrorToResponse(error);
    return new Response(JSON.stringify(body), {
      headers: { 'Content-Type': 'application/json' },
      status,
    });
  }
});

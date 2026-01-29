import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { requireAdmin } from '../_shared/admin_guard.ts';
import { mapErrorToResponse } from '../_shared/error_mapper.ts';
import { parseQuery } from '../_shared/parse_query.ts';
import { getAdminConversations } from '../../../../packages/db/src/admin_conversation_service.js';

Deno.serve(async (req: Request) => {
  try {
    // Auth check and admin guard
    const userId = await requireAdmin(req);

    // Parse query parameters
    const query = parseQuery(req.url);

    // Call admin service
    const items = await getAdminConversations({
      userId,
      limit: query.limit,
      offset: query.offset,
      instructorId: query.instructorId as string | undefined,
      status: query.status as string | undefined,
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

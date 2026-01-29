import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { requireAdmin } from '../_shared/admin_guard.ts';
import { mapErrorToResponse } from '../_shared/error_mapper.ts';
import { parseQuery } from '../_shared/parse_query.ts';
import { listInboundMessagesService } from '../../../../packages/db/src/inbound_messages_service.js';

Deno.serve(async (req: Request) => {
  try {
    await requireAdmin(req);

    const query = parseQuery(req.url);
    const conversationId = query.conversationId as string | undefined;
    const limit = query.limit ? Number(query.limit) : undefined;

    const items = await listInboundMessagesService(conversationId, limit);

    return new Response(JSON.stringify({ items }), {
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

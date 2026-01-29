import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { requireAdmin } from '../_shared/admin_guard.ts';
import { mapErrorToResponse } from '../_shared/error_mapper.ts';
import { parseQuery } from '../_shared/parse_query.ts';
import { getConversationTimeline } from '../../../../packages/services/src/conversation_surfacing_service.js';

/**
 * Admin Edge Function: Conversation Timeline (READ-ONLY)
 * 
 * WHAT IT DOES:
 * - Accepts GET requests only
 * - Requires admin authentication
 * - Parses conversation_id from query params
 * - Calls getConversationTimeline() service
 * - Returns conversation timeline with messages ordered chronologically
 * - Returns 404 if conversation not found
 * - Returns 400 if conversation_id is missing or invalid
 * 
 * WHAT IT DOES NOT DO:
 * - No INSERT
 * - No UPDATE
 * - No DELETE
 * - No routing logic
 * - No AI calls
 * - No automation
 * - No inference
 * - No side effects
 * - No mutations
 */
Deno.serve(async (req: Request) => {
  try {
    await requireAdmin(req);

    if (req.method !== 'GET') {
      return new Response(JSON.stringify({ error: { code: 'METHOD_NOT_ALLOWED' } }), {
        headers: { 'Content-Type': 'application/json' },
        status: 405,
      });
    }

    const query = parseQuery(req.url);
    const conversationId = query.conversation_id as string | undefined;

    if (!conversationId || typeof conversationId !== 'string' || conversationId.trim() === '') {
      return new Response(JSON.stringify({ error: { code: 'BAD_REQUEST' } }), {
        headers: { 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const timeline = await getConversationTimeline(conversationId);

    if (timeline === null) {
      return new Response(JSON.stringify({ error: { code: 'NOT_FOUND' } }), {
        headers: { 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    return new Response(JSON.stringify(timeline), {
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

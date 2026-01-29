import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { requireAdmin } from '../_shared/admin_guard.ts';
import { mapErrorToResponse } from '../_shared/error_mapper.ts';
import { resolveChannelIdentity } from '../../../../packages/services/src/channel_identity_resolver.js';

/**
 * Resolves a channel identity to a conversation_id.
 * 
 * WHAT IT DOES:
 * - Accepts POST requests with channel and external_identity
 * - Requires admin authentication
 * - Calls resolver service to find existing mapping
 * - Returns resolution result:
 *   - If mapped: { status: "mapped", conversation_id: string }
 *   - If unmapped: { status: "unmapped" }
 * - Provides deterministic, explicit resolution
 * 
 * WHAT IT DOES NOT DO:
 * - No INSERT
 * - No UPDATE
 * - No conversation creation
 * - No mapping creation
 * - No AI calls
 * - No routing
 * - No side effects
 * - No mutations of any kind
 */
Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: "METHOD_NOT_ALLOWED" }), {
      headers: { 'Content-Type': 'application/json' },
      status: 405,
    });
  }

  try {
    await requireAdmin(req);

    const body = await req.json().catch(() => null);
    
    if (!body || typeof body.channel !== 'string' || typeof body.external_identity !== 'string') {
      return new Response(JSON.stringify({ error: "INVALID_INPUT" }), {
        headers: { 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const resolution = await resolveChannelIdentity(body.channel, body.external_identity);

    return new Response(JSON.stringify(resolution), {
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

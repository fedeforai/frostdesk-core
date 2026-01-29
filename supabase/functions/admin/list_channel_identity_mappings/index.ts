import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { requireAdmin } from '../_shared/admin_guard.ts';
import { mapErrorToResponse } from '../_shared/error_mapper.ts';
import { listChannelIdentityMappings } from '../../../../packages/db/src/channel_identity_mapping_service.js';

Deno.serve(async (req: Request) => {
  try {
    await requireAdmin(req);

    const items = await listChannelIdentityMappings();

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

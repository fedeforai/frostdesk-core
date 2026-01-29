import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { requireAdmin } from '../_shared/admin_guard.ts';
import { mapErrorToResponse } from '../_shared/error_mapper.ts';
import { getAdminBookingDetail } from '../../../../packages/db/src/admin_booking_detail_service.js';

Deno.serve(async (req: Request) => {
  try {
    // Auth check and admin guard
    const userId = await requireAdmin(req);

    // Extract bookingId from URL path
    // URL format: /get_booking_detail/{bookingId}
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const bookingId = pathParts[pathParts.length - 1];

    if (!bookingId) {
      return new Response(JSON.stringify({ error: { code: 'missing_booking_id' } }), {
        headers: { 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Call admin service
    const result = await getAdminBookingDetail({
      userId,
      bookingId,
    });

    // Return aggregated result (no transformation)
    return new Response(JSON.stringify(result), {
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

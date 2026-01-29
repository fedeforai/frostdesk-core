import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { requireAdmin } from '../_shared/admin_guard.ts';
import { mapErrorToResponse } from '../_shared/error_mapper.ts';
import { adminOverrideBookingStatus } from '../../../../packages/db/src/admin_booking_service.js';

Deno.serve(async (req: Request) => {
  try {
    // Auth check and admin guard
    const userId = await requireAdmin(req);

    // Extract bookingId from URL path
    // URL format: /override_booking_status/{bookingId}
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const bookingId = pathParts[pathParts.length - 1];

    if (!bookingId) {
      return new Response(JSON.stringify({ error: { code: 'missing_booking_id' } }), {
        headers: { 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Parse JSON body
    const body = await req.json() as {
      newStatus: string;
      reason?: string;
    };

    if (!body.newStatus || typeof body.newStatus !== 'string') {
      return new Response(JSON.stringify({ error: { code: 'missing_newStatus' } }), {
        headers: { 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Call admin service
    const booking = await adminOverrideBookingStatus({
      userId,
      bookingId,
      newStatus: body.newStatus as any,
      reason: body.reason,
    });

    // Return standard response shape
    const response = {
      booking,
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

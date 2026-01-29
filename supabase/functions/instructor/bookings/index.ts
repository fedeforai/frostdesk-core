import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';
import {
  createBookingService,
  getBookingService,
  listInstructorBookingsService,
} from '../../../../packages/db/src/booking_service.js';

Deno.serve(async (req: Request) => {
  if (!req.headers.get('Authorization')) {
    return new Response(JSON.stringify({ error: { code: 'unauthorized' } }), {
      headers: { 'Content-Type': 'application/json' },
      status: 401,
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || Deno.env.get('SUPABASE_PROJECT_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  
  if (!supabaseUrl || !supabaseAnonKey) {
    return new Response(JSON.stringify({ error: { code: 'internal_error' } }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: req.headers.get('Authorization')!,
      },
    },
  });

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return new Response(JSON.stringify({ error: { code: 'unauthorized' } }), {
      headers: { 'Content-Type': 'application/json' },
      status: 401,
    });
  }

  const url = new URL(req.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  const bookingId = pathParts[pathParts.length - 1];

  try {
    // GET /instructor/bookings
    if (req.method === 'GET' && pathParts.length === 2) {
      const items = await listInstructorBookingsService(user.id);
      return new Response(JSON.stringify({ items }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // GET /instructor/bookings/:id
    if (req.method === 'GET' && pathParts.length === 3) {
      const booking = await getBookingService(user.id, bookingId);
      if (!booking) {
        return new Response(JSON.stringify({ error: { code: 'not_found' } }), {
          headers: { 'Content-Type': 'application/json' },
          status: 404,
        });
      }
      return new Response(JSON.stringify(booking), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
      }

    // POST /instructor/bookings
    if (req.method === 'POST') {
      const body = await req.json();

      const result = await createBookingService(user.id, {
        customerName: body.customerName,
        startTime: body.startTime,
        endTime: body.endTime,
        serviceId: body.serviceId ?? null,
        meetingPointId: body.meetingPointId ?? null,
        notes: body.notes ?? null,
      });

      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json' },
        status: 201,
      });
    }

    return new Response(JSON.stringify({ error: { code: 'method_not_allowed' } }), {
      headers: { 'Content-Type': 'application/json' },
      status: 405,
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: { code: 'internal_error' } }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

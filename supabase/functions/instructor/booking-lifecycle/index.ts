import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { getBookingLifecycleByIdService } from '../../../../packages/db/src/booking_lifecycle_service.js';

Deno.serve(async (req: Request) => {
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: "METHOD_NOT_ALLOWED" }), {
      headers: { 'Content-Type': 'application/json' },
      status: 405,
    });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "UNAUTHORIZED" }), {
      headers: { 'Content-Type': 'application/json' },
      status: 401,
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || Deno.env.get('SUPABASE_PROJECT_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  
  if (!supabaseUrl || !supabaseAnonKey) {
    return new Response(JSON.stringify({ error: "FAILED_TO_LOAD_BOOKING_LIFECYCLE" }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  });

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "UNAUTHORIZED" }), {
      headers: { 'Content-Type': 'application/json' },
      status: 401,
    });
  }

  const url = new URL(req.url);
  const bookingId = url.searchParams.get('bookingId');

  if (!bookingId) {
    return new Response(JSON.stringify({ error: "BOOKING_ID_REQUIRED" }), {
      headers: { 'Content-Type': 'application/json' },
      status: 400,
    });
  }

  try {
    const result = await getBookingLifecycleByIdService(user.id, bookingId);
    
    if (result === null) {
      return new Response(JSON.stringify({ error: "BOOKING_NOT_FOUND" }), {
        headers: { 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch {
    return new Response(JSON.stringify({ error: "FAILED_TO_LOAD_BOOKING_LIFECYCLE" }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

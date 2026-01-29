import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { getInstructorBookingAuditLogsService } from '../../../../packages/db/src/booking_audit_log_service.js';

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
    return new Response(JSON.stringify({ error: "FAILED_TO_LOAD_BOOKING_AUDIT_LOGS" }), {
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

  try {
    const result = await getInstructorBookingAuditLogsService(user.id);
    
    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch {
    return new Response(JSON.stringify({ error: "FAILED_TO_LOAD_BOOKING_AUDIT_LOGS" }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

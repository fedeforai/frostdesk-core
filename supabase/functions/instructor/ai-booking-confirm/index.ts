import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { confirmAIBookingDraftService } from '../../../../packages/db/src/ai_booking_confirm_service.js';

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return json(405, { error: 'METHOD_NOT_ALLOWED' });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return json(401, { error: 'UNAUTHORIZED' });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || Deno.env.get('SUPABASE_PROJECT_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  
  if (!supabaseUrl || !supabaseAnonKey) {
    return json(500, { error: 'FAILED_TO_CONFIRM_AI_DRAFT' });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData?.user) {
    return json(401, { error: 'UNAUTHORIZED' });
  }

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return json(400, { error: 'INVALID_JSON' });
  }

  // Explicit confirmation required
  if (payload?.confirmed !== true) {
    return json(400, { error: 'CONFIRMATION_REQUIRED' });
  }

  // Minimal required fields
  if (!payload?.requestId || !payload?.startTime || !payload?.endTime) {
    return json(400, { error: 'MISSING_REQUIRED_FIELDS' });
  }

  const userAgent = req.headers.get('user-agent');
  const ipAddress =
    req.headers.get('x-forwarded-for') ??
    req.headers.get('cf-connecting-ip') ??
    null;

  try {
    const result = await confirmAIBookingDraftService(userData.user.id, {
      requestId: String(payload.requestId),
      startTime: String(payload.startTime),
      endTime: String(payload.endTime),
      serviceId: payload.serviceId ?? null,
      meetingPointId: payload.meetingPointId ?? null,
      customerName: payload.customerName ?? null,
      notes: payload.notes ?? null,
      draftPayload: payload.draftPayload ?? {},
      userAgent: userAgent ?? null,
      ipAddress: ipAddress ? String(ipAddress) : null,
    });

    return json(201, { bookingId: result.bookingId });
  } catch {
    return json(500, { error: 'FAILED_TO_CONFIRM_AI_DRAFT' });
  }
});

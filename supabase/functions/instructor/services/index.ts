import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';
import {
  getInstructorServicesService,
  createInstructorServiceService,
  updateInstructorServiceService,
} from '../../../../packages/db/src/instructor_services_service.js';

Deno.serve(async (req: Request) => {
  try {
    // Standard Supabase auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: { code: 'unauthorized' } }), {
        headers: { 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    // Get Supabase URL and anon key from environment
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || Deno.env.get('SUPABASE_PROJECT_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(JSON.stringify({ error: { code: 'internal_error' } }), {
        headers: { 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    // Create Supabase client with auth header
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    // Get user from auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: { code: 'unauthorized' } }), {
        headers: { 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const userId = user.id;

    // GET: List services
    if (req.method === 'GET') {
      const services = await getInstructorServicesService(userId);
      
      return new Response(JSON.stringify(services), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // POST: Create service
    if (req.method === 'POST') {
      const body = await req.json();
      const { discipline, duration_minutes, price_amount, currency, notes } = body;

      // Validate required fields
      if (!discipline || duration_minutes === undefined || price_amount === undefined || !currency) {
        return new Response(JSON.stringify({ error: { code: 'invalid_input' } }), {
          headers: { 'Content-Type': 'application/json' },
          status: 400,
        });
      }

      const service = await createInstructorServiceService(userId, {
        discipline: discipline.trim(),
        duration_minutes: Number(duration_minutes),
        price_amount: Number(price_amount),
        currency: currency.trim(),
        notes: notes ? notes.trim() : null,
      });

      return new Response(JSON.stringify(service), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // PUT: Update service
    if (req.method === 'PUT') {
      const url = new URL(req.url);
      const pathParts = url.pathname.split('/');
      const serviceId = pathParts[pathParts.length - 1];

      if (!serviceId) {
        return new Response(JSON.stringify({ error: { code: 'invalid_input' } }), {
          headers: { 'Content-Type': 'application/json' },
          status: 400,
        });
      }

      const body = await req.json();
      const { discipline, duration_minutes, price_amount, currency, notes, is_active } = body;

      // Validate required fields
      if (!discipline || duration_minutes === undefined || price_amount === undefined || !currency || is_active === undefined) {
        return new Response(JSON.stringify({ error: { code: 'invalid_input' } }), {
          headers: { 'Content-Type': 'application/json' },
          status: 400,
        });
      }

      const service = await updateInstructorServiceService(userId, serviceId, {
        discipline: discipline.trim(),
        duration_minutes: Number(duration_minutes),
        price_amount: Number(price_amount),
        currency: currency.trim(),
        notes: notes ? notes.trim() : null,
        is_active: Boolean(is_active),
      });

      return new Response(JSON.stringify(service), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Method not allowed
    return new Response(JSON.stringify({ error: { code: 'method_not_allowed' } }), {
      headers: { 'Content-Type': 'application/json' },
      status: 405,
    });
  } catch (error) {
    // Default to 500
    return new Response(JSON.stringify({ error: { code: 'internal_error' } }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

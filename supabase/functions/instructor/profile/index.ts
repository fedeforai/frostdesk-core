import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';
import {
  getInstructorProfileService,
  updateInstructorProfileService,
} from '../../../../packages/db/src/instructor_profile_service.js';

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

    // GET: Retrieve profile
    if (req.method === 'GET') {
      const profile = await getInstructorProfileService(userId);
      
      return new Response(JSON.stringify(profile), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // POST: Update profile
    if (req.method === 'POST') {
      const body = await req.json();
      const { full_name, base_resort, working_language, contact_email } = body;

      // Validate required fields
      if (!full_name || !base_resort || !working_language || !contact_email) {
        return new Response(JSON.stringify({ error: { code: 'invalid_input' } }), {
          headers: { 'Content-Type': 'application/json' },
          status: 400,
        });
      }

      const profile = await updateInstructorProfileService(userId, {
        full_name: full_name.trim(),
        base_resort: base_resort.trim(),
        working_language: working_language.trim(),
        contact_email: contact_email.trim(),
      });

      return new Response(JSON.stringify(profile), {
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

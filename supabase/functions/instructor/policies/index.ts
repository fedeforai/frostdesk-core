import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';
import {
  listInstructorPoliciesService,
  createInstructorPolicyService,
  updateInstructorPolicyService,
} from '../../../../packages/db/src/instructor_policies_service.js';

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

    // GET: List policies
    if (req.method === 'GET') {
      const policies = await listInstructorPoliciesService(userId);
      
      return new Response(JSON.stringify(policies), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // POST: Create policy
    if (req.method === 'POST') {
      const body = await req.json();
      const { policy_type, title, content, version, valid_from, valid_to, is_active } = body;

      // Validate required fields
      if (!policy_type || !title || !content || version === undefined || is_active === undefined) {
        return new Response(JSON.stringify({ error: { code: 'invalid_input' } }), {
          headers: { 'Content-Type': 'application/json' },
          status: 400,
        });
      }

      const policy = await createInstructorPolicyService(userId, {
        policy_type: policy_type.trim(),
        title: title.trim(),
        content: content.trim(),
        version: Number(version),
        valid_from: valid_from ? valid_from.trim() : null,
        valid_to: valid_to ? valid_to.trim() : null,
        is_active: Boolean(is_active),
      });

      return new Response(JSON.stringify(policy), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // PUT: Update policy
    if (req.method === 'PUT') {
      const url = new URL(req.url);
      const pathParts = url.pathname.split('/');
      const policyId = pathParts[pathParts.length - 1];

      if (!policyId) {
        return new Response(JSON.stringify({ error: { code: 'invalid_input' } }), {
          headers: { 'Content-Type': 'application/json' },
          status: 400,
        });
      }

      const body = await req.json();
      const { policy_type, title, content, version, valid_from, valid_to, is_active } = body;

      // Validate required fields
      if (!policy_type || !title || !content || version === undefined || is_active === undefined) {
        return new Response(JSON.stringify({ error: { code: 'invalid_input' } }), {
          headers: { 'Content-Type': 'application/json' },
          status: 400,
        });
      }

      const policy = await updateInstructorPolicyService(userId, policyId, {
        policy_type: policy_type.trim(),
        title: title.trim(),
        content: content.trim(),
        version: Number(version),
        valid_from: valid_from ? valid_from.trim() : null,
        valid_to: valid_to ? valid_to.trim() : null,
        is_active: Boolean(is_active),
      });

      return new Response(JSON.stringify(policy), {
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

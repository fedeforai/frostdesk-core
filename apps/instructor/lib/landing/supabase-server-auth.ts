import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Supabase server client that reads auth from cookies (for Server Components / Route Handlers).
 */
export async function getSupabaseServerAuth() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  const cookieStore = await cookies();
  return createServerClient(url, key, {
    cookies: {
      get(name: string) {
        let value = cookieStore.get(name)?.value;
        if (value && typeof value === "string" && value.startsWith("base64-")) {
          try {
            value = Buffer.from(value.slice(7), "base64").toString("utf8");
          } catch {
            // leave unchanged
          }
        }
        return value;
      },
      set() {},
      remove() {},
    },
  });
}

export async function getServerSession() {
  const supabase = await getSupabaseServerAuth();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
  return data?.session ?? null;
}

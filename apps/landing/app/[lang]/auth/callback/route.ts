import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/en";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/en";

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return NextResponse.redirect(new URL(safeNext, requestUrl.origin));
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(url, key, {
    cookies: {
      get(name: string) {
        const value = cookieStore.get(name)?.value;
        if (value && typeof value === "string" && value.startsWith("base64-")) {
          try {
            return Buffer.from(value.slice(7), "base64").toString("utf8");
          } catch {
            return value;
          }
        }
        return value;
      },
      set(name: string, value: string, options: { path?: string; maxAge?: number; httpOnly?: boolean; sameSite?: "lax" | "strict" | "none"; secure?: boolean }) {
        cookieStore.set({ name, value, ...options });
      },
      remove(name: string, options: { path?: string }) {
        cookieStore.set({ name, value: "", ...options });
      },
    },
  });

  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(new URL(safeNext, requestUrl.origin));
}

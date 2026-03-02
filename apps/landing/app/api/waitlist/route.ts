import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { waitlistSchema } from "@/lib/waitlist-schema";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = waitlistSchema.safeParse({
      ...body,
      consent: body.consent === true || body.consent === "true",
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors?.consent?.[0] ?? "Validation failed" },
        { status: 400 }
      );
    }
    const supabase = createServerSupabaseClient();
    const { error } = await supabase.from("waitlist").insert({
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone ?? null,
      resort: parsed.data.resort ?? null,
      instructor_type: parsed.data.instructor_type ?? null,
      languages: parsed.data.languages ?? null,
      experience: parsed.data.experience ?? null,
      high_season_weeks: parsed.data.high_season_weeks ?? null,
      lang: body.lang ?? "en",
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message ?? "Server error" },
      { status: 500 }
    );
  }
}

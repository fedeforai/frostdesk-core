import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/supabase-server-auth";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getLang, getTranslations } from "@/lib/translations";

const ALLOWED_STATUSES = ["invited", "active"] as const;

export default async function OnboardingPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale = getLang(lang);
  const t = getTranslations(locale);

  const session = await getServerSession();
  if (!session?.user?.email) {
    redirect(`/${locale}/login?next=/${locale}/onboarding`);
  }

  const supabase = createServerSupabaseClient();
  const { data: row } = await supabase
    .from("waitlist")
    .select("status")
    .eq("email", session.user.email)
    .maybeSingle();

  const status = (row?.status as string) ?? "waitlist";
  if (!ALLOWED_STATUSES.includes(status as (typeof ALLOWED_STATUSES)[number])) {
    redirect(`/${locale}/waitlist?reason=gate`);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-20">
      <h1 className="text-2xl font-bold text-text-primary">Onboarding</h1>
      <p className="mt-4 text-muted">
        Welcome. Your onboarding flow will be available here. You're in.
      </p>
    </div>
  );
}

import { getLang, getTranslations } from "@/lib/landing/translations";
import { WaitlistForm } from "@/components/landing/WaitlistForm";

export default async function WaitlistPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ reason?: string }>;
}) {
  const { lang } = await params;
  const { reason } = await searchParams;
  const locale = getLang(lang);
  const t = getTranslations(locale);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      {reason === "gate" && (
        <p className="mb-6 rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-muted" role="alert">
          {t.onboarding.gateMessage}
        </p>
      )}
      <WaitlistForm lang={locale} />
    </div>
  );
}

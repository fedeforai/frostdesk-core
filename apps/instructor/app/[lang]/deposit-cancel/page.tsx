import Link from "next/link";
import { getLang, getTranslations } from "@/lib/landing/translations";

export default async function DepositCancelPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale = getLang(lang);
  const t = getTranslations(locale);

  return (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center">
      <h1 className="text-3xl font-bold text-text-primary md:text-4xl">
        {t.depositCancel.title}
      </h1>
      <p className="mt-4 text-muted">{t.depositCancel.message}</p>
      <Link
        href={`/${locale}#deposit`}
        className="mt-8 inline-block rounded-lg bg-primary px-6 py-3 font-medium text-white hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
      >
        Try again
      </Link>
    </div>
  );
}

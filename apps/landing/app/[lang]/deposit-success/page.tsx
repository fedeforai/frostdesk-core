"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getTranslations, getLang, type Lang } from "@/lib/translations";
import { trackEvent } from "@/lib/analytics";

export default function DepositSuccessPage() {
  const params = useParams();
  const lang = getLang((params?.lang as string) ?? "en") as Lang;
  const t = getTranslations(lang);

  useEffect(() => {
    trackEvent("deposit_checkout_completed");
  }, []);

  return (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center">
      <h1 className="text-3xl font-bold text-text-primary md:text-4xl">
        {t.depositSuccess.title}
      </h1>
      <p className="mt-4 text-muted">{t.depositSuccess.message}</p>
      <Link
        href={`/${lang}`}
        className="mt-8 inline-block rounded-lg bg-primary px-6 py-3 font-medium text-white hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
      >
        Back to home
      </Link>
    </div>
  );
}

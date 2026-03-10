import type { Metadata } from "next";
import { getLang } from "@/lib/landing/translations";
import { getCookiesContent } from "@/lib/landing/legal";
import { LegalPageLayout } from "@/components/landing/LegalPageLayout";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const locale = getLang(lang);
  const doc = getCookiesContent(locale);
  return {
    title: `${doc.title} - FrostDesk`,
    description: `How FrostDesk uses cookies. Last updated ${doc.lastUpdated}.`,
  };
}

export default async function CookiesPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale = getLang(lang);
  const doc = getCookiesContent(locale);
  return <LegalPageLayout doc={doc} lang={locale} />;
}

import type { Metadata } from "next";
import { getLang } from "@/lib/landing/translations";
import { getPrivacyContent } from "@/lib/landing/legal";
import { LegalPageLayout } from "@/components/landing/LegalPageLayout";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const locale = getLang(lang);
  const doc = getPrivacyContent(locale);
  return {
    title: `${doc.title} - FrostDesk`,
    description: `How FrostDesk collects, uses and protects your data. Last updated ${doc.lastUpdated}.`,
  };
}

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale = getLang(lang);
  const doc = getPrivacyContent(locale);
  return <LegalPageLayout doc={doc} lang={locale} />;
}

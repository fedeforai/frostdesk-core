import type { Metadata } from "next";
import { getLang } from "@/lib/landing/translations";
import { getAcceptableUseContent } from "@/lib/landing/legal";
import { LegalPageLayout } from "@/components/landing/LegalPageLayout";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const locale = getLang(lang);
  const doc = getAcceptableUseContent(locale);
  return {
    title: `${doc.title} - FrostDesk`,
    description: `FrostDesk acceptable use policy. Last updated ${doc.lastUpdated}.`,
  };
}

export default async function AcceptableUsePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale = getLang(lang);
  const doc = getAcceptableUseContent(locale);
  return <LegalPageLayout doc={doc} lang={locale} />;
}

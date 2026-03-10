import type { Metadata } from "next";
import { getLang } from "@/lib/landing/translations";
import { getRefundContent } from "@/lib/landing/legal";
import { LegalPageLayout } from "@/components/landing/LegalPageLayout";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const locale = getLang(lang);
  const doc = getRefundContent(locale);
  return {
    title: `${doc.title} - FrostDesk`,
    description: `FrostDesk refund policy. Last updated ${doc.lastUpdated}.`,
  };
}

export default async function RefundPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale = getLang(lang);
  const doc = getRefundContent(locale);
  return <LegalPageLayout doc={doc} lang={locale} />;
}

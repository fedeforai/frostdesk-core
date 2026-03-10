import type { Metadata } from "next";
import { getLang, getTranslations } from "@/lib/landing/translations";
import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";

const LANDING_LANGS = ["en", "it", "fr", "de"] as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const locale = getLang(lang);
  const t = getTranslations(locale);
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://frostdesk.ai";
  const path = lang === "en" ? "" : `/${lang}`;
  const url = `${baseUrl}${path}`;
  return {
    title: t.meta.title,
    description: t.meta.description,
    openGraph: {
      title: t.meta.title,
      description: t.meta.description,
      url,
      siteName: "FrostDesk",
      locale: locale === "en" ? "en_US" : `${locale}_${locale.toUpperCase()}`,
    },
    twitter: { card: "summary_large_image", title: t.meta.title, description: t.meta.description },
  };
}

export function generateStaticParams() {
  return LANDING_LANGS.map((lang) => ({ lang }));
}

export default async function LangLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale = getLang(lang);

  return (
    <>
      <Header lang={locale} />
      <main className="min-h-screen">{children}</main>
      <Footer lang={locale} />
    </>
  );
}

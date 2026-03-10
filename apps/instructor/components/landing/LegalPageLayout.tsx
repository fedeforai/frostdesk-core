import Link from "next/link";
import type { LegalDocument } from "@/lib/landing/legal";
import type { Lang } from "@/lib/landing/translations";

type LegalPageLayoutProps = {
  doc: LegalDocument;
  lang: Lang;
};

export function LegalPageLayout({ doc, lang }: LegalPageLayoutProps) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 md:py-16">
      <h1 className="font-heading text-3xl font-bold text-text-primary md:text-4xl">
        {doc.title}
      </h1>
      <p className="mt-2 text-sm text-muted">
        Last updated: {doc.lastUpdated}
      </p>
      <div className="mt-8 space-y-8">
        {doc.sections.map((section, i) => (
          <section key={i} className="space-y-2">
            <h2 className="font-heading text-lg font-semibold text-text-primary">
              {section.title}
            </h2>
            <div className="text-muted leading-relaxed [&_a]:text-primary [&_a]:underline [&_a:hover]:opacity-90">
              {section.body}
            </div>
          </section>
        ))}
      </div>
      <p className="mt-12">
        <Link
          href={`/${lang}`}
          className="inline-block rounded-lg bg-primary px-6 py-3 font-medium text-white hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
        >
          {doc.backToHome}
        </Link>
      </p>
    </div>
  );
}

import { getTranslations, type Lang } from "@/lib/translations";

const qa = [
  { q: "q1" as const, a: "a1" as const },
  { q: "q2" as const, a: "a2" as const },
  { q: "q3" as const, a: "a3" as const },
];

export function FAQ({ lang }: { lang: Lang }) {
  const t = getTranslations(lang);

  return (
    <section className="px-4 py-16 md:py-20" aria-labelledby="faq-heading">
      <div className="mx-auto max-w-6xl">
      <h2 id="faq-heading" className="font-heading text-3xl font-bold text-text-primary md:text-4xl">
        {t.faq.title}
      </h2>
      <dl className="mt-10 space-y-8">
        {qa.map(({ q, a }) => (
          <div key={q}>
            <dt className="font-heading text-lg font-semibold text-text-primary">{t.faq[q]}</dt>
            <dd className="mt-2 text-muted">{t.faq[a]}</dd>
          </div>
        ))}
      </dl>
      </div>
    </section>
  );
}

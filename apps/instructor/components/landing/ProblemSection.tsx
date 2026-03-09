import { getTranslations, type Lang } from "@/lib/landing/translations";

export function ProblemSection({ lang }: { lang: Lang }) {
  const t = getTranslations(lang);
  return (
    <section className="px-4 py-16 md:py-20">
      <div className="mx-auto max-w-6xl">
        <h2 className="font-heading text-3xl font-bold text-text-primary md:text-4xl">
          {t.problem.title}
        </h2>
        <ul className="mt-8 space-y-4 text-muted md:text-lg">
          <li className="flex items-start gap-3">
            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-secondary" aria-hidden />
            {t.problem.item1}
          </li>
          <li className="flex items-start gap-3">
            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-secondary" aria-hidden />
            {t.problem.item2}
          </li>
          <li className="flex items-start gap-3">
            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-secondary" aria-hidden />
            {t.problem.item3}
          </li>
        </ul>
      </div>
    </section>
  );
}

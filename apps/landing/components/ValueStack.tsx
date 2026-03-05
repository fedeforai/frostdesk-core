import { getTranslations, type Lang } from "@/lib/translations";

export function ValueStack({ lang }: { lang: Lang }) {
  const t = getTranslations(lang);
  const items = [t.valueStack.item1, t.valueStack.item2, t.valueStack.item3, t.valueStack.item4];

  return (
    <section className="px-4 py-16 md:py-20">
      <div className="mx-auto max-w-6xl">
        <h2 className="font-heading text-3xl font-bold text-text-primary md:text-4xl">
          {t.valueStack.title}
        </h2>
        <ul className="mt-8 flex flex-wrap gap-4" role="list">
          {items.map((text, i) => (
            <li
              key={i}
              className="flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-text-primary"
            >
              <span className="text-primary" aria-hidden>✓</span>
              {text}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

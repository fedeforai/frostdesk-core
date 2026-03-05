"use client";

import { motion } from "framer-motion";
import { getTranslations, type Lang } from "@/lib/translations";

const steps = [
  { key: "step1" as const, keyDesc: "step1Desc" as const },
  { key: "step2" as const, keyDesc: "step2Desc" as const },
  { key: "step3" as const, keyDesc: "step3Desc" as const },
];

export function HowItWorks({ lang }: { lang: Lang }) {
  const t = getTranslations(lang);

  return (
    <section className="px-4 py-16 md:py-20">
      <div className="mx-auto max-w-6xl">
        <h2 className="font-heading text-3xl font-bold text-text-primary md:text-4xl">
          {t.howItWorks.title}
        </h2>
        <motion.ol
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ staggerChildren: 0.15 }}
          className="mt-10 grid gap-8 md:grid-cols-3"
        >
          {steps.map((s, i) => (
            <motion.li
              key={s.key}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="relative pl-10 before:absolute before:left-0 before:top-0 before:flex before:h-8 before:w-8 before:items-center before:justify-center before:rounded-full before:bg-primary before:text-sm before:font-bold before:text-white before:content-[(attr(data-step))]"
              data-step={i + 1}
            >
              <h3 className="font-heading text-lg font-semibold text-text-primary">
                {t.howItWorks[s.key]}
              </h3>
              <p className="mt-2 text-muted">{t.howItWorks[s.keyDesc]}</p>
            </motion.li>
          ))}
        </motion.ol>
      </div>
    </section>
  );
}

"use client";

import { motion } from "framer-motion";
import { getTranslations, type Lang } from "@/lib/translations";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.12 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export function SolutionCards({ lang }: { lang: Lang }) {
  const t = getTranslations(lang);
  const cards = [
    { title: t.solution.card1Title, desc: t.solution.card1Desc },
    { title: t.solution.card2Title, desc: t.solution.card2Desc },
    { title: t.solution.card3Title, desc: t.solution.card3Desc },
  ];

  return (
    <section className="px-4 py-16 md:py-20">
      <div className="mx-auto max-w-6xl">
        <h2 className="font-heading text-3xl font-bold text-text-primary md:text-4xl">
          {t.solution.title}
        </h2>
        <motion.ul
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {cards.map((c, i) => (
            <motion.li
              key={i}
              variants={item}
              className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur"
            >
              <h3 className="font-heading text-lg font-semibold text-text-primary">{c.title}</h3>
              <p className="mt-2 text-muted">{c.desc}</p>
            </motion.li>
          ))}
        </motion.ul>
      </div>
    </section>
  );
}

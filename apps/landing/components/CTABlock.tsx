"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { getTranslations, type Lang } from "@/lib/translations";
import { trackEvent } from "@/lib/analytics";

export function CTABlock({ lang }: { lang: Lang }) {
  const t = getTranslations(lang);

  return (
    <motion.section
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      className="px-4 py-16 md:py-20"
    >
      <div className="mx-auto max-w-3xl rounded-2xl border border-primary/30 bg-primary/10 p-8 text-center md:p-12">
        <h2 className="font-heading text-2xl font-bold text-text-primary md:text-3xl">
          {t.cta.title}
        </h2>
        <p className="mt-4 text-muted">{t.cta.sub}</p>
        <Link
          href={`/${lang}/waitlist`}
          className="focus-visible:ring-primary mt-6 inline-block rounded-lg bg-primary px-6 py-3 font-medium text-white transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background"
          aria-label={t.cta.button}
          onClick={() => trackEvent("cta_block_click")}
        >
          {t.cta.button}
        </Link>
      </div>
    </motion.section>
  );
}

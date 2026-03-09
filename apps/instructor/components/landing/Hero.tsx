"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { getTranslations, type Lang } from "@/lib/landing/translations";
import { trackEvent } from "@/lib/landing/analytics";
import {
  assignAndPersistVariant,
  getStoredVariant,
  type HeroVariant,
} from "@/lib/landing/ab-test";

export function Hero({ lang }: { lang: Lang }) {
  const t = getTranslations(lang);
  const [variant, setVariant] = useState<HeroVariant | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const stored = getStoredVariant();
    if (stored) {
      setVariant(stored);
      trackEvent(stored === "A" ? "hero_variant_A_view" : "hero_variant_B_view");
      return;
    }
    const assigned = assignAndPersistVariant((v) => {
      setVariant(v);
      trackEvent("ab_variant_assigned", { variant: v });
      trackEvent(v === "A" ? "hero_variant_A_view" : "hero_variant_B_view");
    });
    setVariant(assigned);
  }, [mounted]);

  const headline =
    variant === "B" ? t.hero.variantB : t.hero.variantA;

  return (
    <section className="relative overflow-hidden px-4 py-20 md:py-28">
      {/* Subtle parallax gradient glow */}
      <div
        className="pointer-events-none absolute -top-40 left-1/2 h-80 w-[600px] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl"
        aria-hidden
      />
      <div className="relative mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center"
        >
          <h1 className="font-heading mx-auto max-w-4xl text-4xl font-bold leading-tight tracking-tight text-text-primary md:text-5xl lg:text-6xl">
            {headline}
          </h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mx-auto mt-6 max-w-2xl text-lg text-muted md:text-xl"
          >
            {t.hero.subline}
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.35 }}
            className="mt-10 flex flex-wrap items-center justify-center gap-4"
          >
            <Link
              href={`/${lang}/waitlist`}
              className="focus-visible:ring-primary inline-flex rounded-lg bg-primary px-6 py-3 text-base font-medium text-white shadow-lg transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background"
              aria-label={t.hero.cta}
              onClick={() => trackEvent("hero_cta_click", { target: "waitlist" })}
            >
              {t.hero.cta}
            </Link>
            <Link
              href={`/${lang}#deposit`}
              className="focus-visible:ring-primary inline-flex rounded-lg border border-primary/50 bg-transparent px-6 py-3 text-base font-medium text-text-primary transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background"
              aria-label={t.hero.ctaSecondary}
              onClick={() => trackEvent("hero_cta_click", { target: "deposit" })}
            >
              {t.hero.ctaSecondary}
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

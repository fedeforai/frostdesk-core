"use client";

import { motion } from "framer-motion";
import { getTranslations, type Lang } from "@/lib/translations";
import { trackEvent } from "@/lib/analytics";
import { useState } from "react";

export function DepositBlock({ lang }: { lang: Lang }) {
  const t = getTranslations(lang);
  const [loading, setLoading] = useState(false);

  async function handleReserve() {
    setLoading(true);
    trackEvent("deposit_checkout_started");
    try {
      const res = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lang, successUrl: `${typeof window !== "undefined" ? window.location.origin : ""}/${lang}/deposit-success`, cancelUrl: `${typeof window !== "undefined" ? window.location.origin : ""}/${lang}/deposit-cancel` }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      throw new Error(data.error || "Failed to create checkout");
    } catch (e) {
      setLoading(false);
      if (typeof window !== "undefined") window.alert((e as Error).message || "Something went wrong");
    }
  }

  return (
    <motion.section
      id="deposit"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      className="scroll-mt-20 px-4 py-16 md:py-20"
      aria-labelledby="deposit-heading"
    >
      <div className="mx-auto max-w-2xl rounded-2xl border border-secondary/30 bg-secondary/10 p-8 text-center md:p-10">
        <h2 id="deposit-heading" className="font-heading text-2xl font-bold text-text-primary md:text-3xl">
          {t.deposit.title}
        </h2>
        <p className="mt-4 text-muted">{t.deposit.sub}</p>
        <p className="mt-2 text-lg font-semibold text-secondary">{t.deposit.price}</p>
        <button
          type="button"
          onClick={handleReserve}
          disabled={loading}
          className="focus-visible:ring-primary mt-6 inline-flex rounded-lg bg-secondary px-6 py-3 font-medium text-background transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background disabled:opacity-70"
          aria-label={t.deposit.button}
        >
          {loading ? "…" : t.deposit.button}
        </button>
      </div>
    </motion.section>
  );
}

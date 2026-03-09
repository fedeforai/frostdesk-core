"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { getTranslations, type Lang } from "@/lib/landing/translations";
import { waitlistSchema, type WaitlistFormData } from "@/lib/landing/waitlist-schema";
import { trackEvent } from "@/lib/landing/analytics";

export function WaitlistForm({ lang }: { lang: Lang }) {
  const t = getTranslations(lang);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<WaitlistFormData>({
    resolver: zodResolver(waitlistSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      resort: "",
      instructor_type: "",
      languages: "",
      experience: "",
      high_season_weeks: "",
      consent: false,
    },
  });

  async function onSubmit(data: WaitlistFormData) {
    trackEvent("waitlist_submit");
    const res = await fetch("/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, lang }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError("root", { message: (j as { error?: string }).error || "Something went wrong" });
      return;
    }
    window.location.href = `/${lang}/thank-you`;
  }

  return (
    <section className="px-4 py-16 md:py-20" aria-labelledby="waitlist-heading">
      <div className="mx-auto max-w-xl">
        <h2 id="waitlist-heading" className="font-heading text-2xl font-bold text-text-primary md:text-3xl">
          {t.waitlist.title}
        </h2>
        <p className="mt-2 text-muted">{t.waitlist.sub}</p>
        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4">
          <div>
            <label htmlFor="waitlist-name" className="block text-sm font-medium text-text-primary">
              {t.waitlist.name} *
            </label>
            <input
              id="waitlist-name"
              type="text"
              {...register("name")}
              className="mt-1 w-full rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-text-primary placeholder-muted focus:border-primary focus:ring-1 focus:ring-primary"
              autoComplete="name"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-400" role="alert">{errors.name.message}</p>
            )}
          </div>
          <div>
            <label htmlFor="waitlist-email" className="block text-sm font-medium text-text-primary">
              {t.waitlist.email} *
            </label>
            <input
              id="waitlist-email"
              type="email"
              {...register("email")}
              className="mt-1 w-full rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-text-primary placeholder-muted focus:border-primary focus:ring-1 focus:ring-primary"
              autoComplete="email"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-400" role="alert">{errors.email.message}</p>
            )}
          </div>
          <div>
            <label htmlFor="waitlist-phone" className="block text-sm font-medium text-text-primary">
              {t.waitlist.phone}
            </label>
            <input
              id="waitlist-phone"
              type="tel"
              {...register("phone")}
              className="mt-1 w-full rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-text-primary placeholder-muted focus:border-primary focus:ring-1 focus:ring-primary"
              autoComplete="tel"
            />
          </div>
          <div>
            <label htmlFor="waitlist-resort" className="block text-sm font-medium text-text-primary">
              {t.waitlist.resort}
            </label>
            <input
              id="waitlist-resort"
              type="text"
              {...register("resort")}
              className="mt-1 w-full rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-text-primary placeholder-muted focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label htmlFor="waitlist-instructor_type" className="block text-sm font-medium text-text-primary">
              {t.waitlist.instructorType}
            </label>
            <input
              id="waitlist-instructor_type"
              type="text"
              {...register("instructor_type")}
              className="mt-1 w-full rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-text-primary placeholder-muted focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label htmlFor="waitlist-languages" className="block text-sm font-medium text-text-primary">
              {t.waitlist.languages}
            </label>
            <input
              id="waitlist-languages"
              type="text"
              {...register("languages")}
              className="mt-1 w-full rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-text-primary placeholder-muted focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label htmlFor="waitlist-experience" className="block text-sm font-medium text-text-primary">
              {t.waitlist.experience}
            </label>
            <input
              id="waitlist-experience"
              type="text"
              {...register("experience")}
              className="mt-1 w-full rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-text-primary placeholder-muted focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label htmlFor="waitlist-high_season_weeks" className="block text-sm font-medium text-text-primary">
              {t.waitlist.highSeasonWeeks}
            </label>
            <input
              id="waitlist-high_season_weeks"
              type="text"
              {...register("high_season_weeks")}
              className="mt-1 w-full rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-text-primary placeholder-muted focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="flex items-start gap-3">
            <input
              id="waitlist-consent"
              type="checkbox"
              {...register("consent")}
              className="mt-1 h-4 w-4 rounded border-white/20 text-primary focus:ring-primary"
              aria-describedby="consent-desc"
            />
            <label id="consent-desc" htmlFor="waitlist-consent" className="text-sm text-muted">
              {t.waitlist.consent} *
            </label>
          </div>
          {errors.consent && (
            <p className="text-sm text-red-400" role="alert">{errors.consent.message}</p>
          )}
          {errors.root && (
            <p className="text-sm text-red-400" role="alert">{errors.root.message}</p>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-primary py-3 font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-70 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
            aria-label={isSubmitting ? t.waitlist.submitting : t.waitlist.submit}
          >
            {isSubmitting ? t.waitlist.submitting : t.waitlist.submit}
          </button>
        </form>
      </div>
    </section>
  );
}

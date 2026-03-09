"use client";

import Link from "next/link";
import { getTranslations, type Lang, SUPPORTED_LANGS } from "@/lib/landing/translations";
import { trackEvent } from "@/lib/landing/analytics";

export function Header({ lang }: { lang: Lang }) {
  const t = getTranslations(lang);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href={`/${lang}`} className="font-heading text-xl font-bold text-text-primary">
          FrostDesk
        </Link>
        <nav className="flex items-center gap-4" aria-label="Main navigation">
          <Link
            href={`/${lang}/waitlist`}
            className="text-muted hover:text-text-primary transition-colors"
            onClick={() => trackEvent("nav_click", { link: "waitlist" })}
          >
            {t.nav.waitlist}
          </Link>
          <Link
            href={`/${lang}/login`}
            className="text-muted hover:text-text-primary transition-colors"
            onClick={() => trackEvent("login_click")}
          >
            {t.nav.login}
          </Link>
          <Link
            href={`/${lang}#deposit`}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity"
            aria-label={t.nav.deposit}
            onClick={() => trackEvent("nav_click", { link: "deposit" })}
          >
            {t.nav.deposit}
          </Link>
          <Link
            href="/instructor/login"
            className="text-muted text-sm hover:text-text-primary transition-colors"
            aria-label="Area istruttori"
          >
            Area istruttori
          </Link>
          <div className="relative" aria-label="Language selector">
            <select
              value={lang}
              onChange={(e) => {
                const newLang = e.target.value as Lang;
                trackEvent("language_switch", { from: lang, to: newLang });
                window.location.href = `/${newLang}`;
              }}
              className="cursor-pointer appearance-none rounded border border-white/20 bg-background px-3 py-1.5 text-sm text-text-primary focus:ring-2 focus:ring-primary"
              aria-label="Select language"
            >
              {SUPPORTED_LANGS.map((l) => (
                <option key={l} value={l}>
                  {l.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
        </nav>
      </div>
    </header>
  );
}

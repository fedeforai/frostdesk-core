"use client";

import { useState } from "react";
import { createClient } from "@/lib/landing/supabase";
import { getTranslations, type Lang } from "@/lib/landing/translations";
import { trackEvent } from "@/lib/landing/analytics";

export function LoginForm({ lang }: { lang: Lang }) {
  const t = getTranslations(lang);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    trackEvent("login_click");
    setLoading(true);
    try {
      const supabase = createClient();
      const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
      const { error: err } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${baseUrl}/${lang}/auth/callback?next=/${lang}/onboarding`,
        },
      });
      if (err) {
        setError(err.message);
        setLoading(false);
        return;
      }
      setSent(true);
    } catch {
      setError("Something went wrong");
    }
    setLoading(false);
  }

  if (sent) {
    return (
      <p className="mt-6 text-muted">
        Check your email for the magic link to sign in.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
      <div>
        <label htmlFor="login-email" className="block text-sm font-medium text-text-primary">
          {t.login.email}
        </label>
        <input
          id="login-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="mt-1 w-full rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-text-primary placeholder-muted focus:border-primary focus:ring-1 focus:ring-primary"
          autoComplete="email"
        />
      </div>
      {error && <p className="text-sm text-red-400" role="alert">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-primary py-3 font-medium text-white hover:opacity-90 disabled:opacity-70 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
        aria-label={loading ? t.login.sending : t.login.sendLink}
      >
        {loading ? t.login.sending : t.login.sendLink}
      </button>
    </form>
  );
}

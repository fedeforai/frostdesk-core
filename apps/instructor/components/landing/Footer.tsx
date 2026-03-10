import Link from "next/link";
import { getLegalFooterLinks } from "@/lib/landing/legal";
import type { Lang } from "@/lib/landing/translations";

export function Footer({ lang }: { lang: Lang }) {
  const links = getLegalFooterLinks(lang);
  return (
    <footer className="border-t border-white/10 bg-background/80 px-4 py-8">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted">
        <Link href={`/${lang}/refund`} className="hover:text-text-primary transition-colors">
          {links.refund}
        </Link>
        <Link href={`/${lang}/privacy`} className="hover:text-text-primary transition-colors">
          {links.privacy}
        </Link>
        <Link href={`/${lang}/terms`} className="hover:text-text-primary transition-colors">
          {links.terms}
        </Link>
        <Link href={`/${lang}/cookies`} className="hover:text-text-primary transition-colors">
          {links.cookies}
        </Link>
        <Link href={`/${lang}/acceptable-use`} className="hover:text-text-primary transition-colors">
          {links.acceptableUse}
        </Link>
      </div>
    </footer>
  );
}

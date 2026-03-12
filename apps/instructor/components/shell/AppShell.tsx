'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import Sidebar, { SidebarRail } from './Sidebar';
import { AiWhatsAppToggle } from './AiWhatsAppToggle';
import { ToastProvider } from './ToastContext';
import { useAppLocale } from '@/lib/app/AppLocaleContext';
import { getAppTranslations } from '@/lib/app/translations';
import styles from './shell.module.css';

const RAIL_WIDTH = 56;
const SIDEBAR_WIDTH = 280;

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; isError?: boolean } | null>(null);
  const { locale, setLocale } = useAppLocale();
  const t = getAppTranslations(locale);

  const toggleMenu = useCallback(() => setMenuOpen((prev) => !prev), []);
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const onToast = useCallback((message: string, isError?: boolean) => {
    setToast({ message, isError });
  }, []);

  return (
    <div className={styles.shell}>
      <SidebarRail onOpenMenu={toggleMenu} />

      <div className={styles.contentWrap} style={{ marginLeft: menuOpen ? SIDEBAR_WIDTH : RAIL_WIDTH }}>
        <header className={styles.header}>
          <span className={styles.headerTitle}>
            {t.shell.title}<span className={styles.headerSub}>{t.shell.subtitle}</span>
          </span>
          <div className={styles.headerRight}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                type="button"
                onClick={() => setLocale('it')}
                aria-label={t.shell.ariaLangIt}
                aria-pressed={locale === 'it'}
                style={{
                  padding: '4px 8px',
                  border: '1px solid rgba(148, 163, 184, 0.4)',
                  borderRadius: 4,
                  background: locale === 'it' ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                  color: locale === 'it' ? 'rgba(147, 197, 253, 0.95)' : 'rgba(148, 163, 184, 0.9)',
                  fontWeight: locale === 'it' ? 600 : 500,
                  cursor: 'pointer',
                  fontSize: 13,
                }}
              >
                {t.shell.langIt}
              </button>
              <button
                type="button"
                onClick={() => setLocale('en')}
                aria-label={t.shell.ariaLangEn}
                aria-pressed={locale === 'en'}
                style={{
                  padding: '4px 8px',
                  border: '1px solid rgba(148, 163, 184, 0.4)',
                  borderRadius: 4,
                  background: locale === 'en' ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                  color: locale === 'en' ? 'rgba(147, 197, 253, 0.95)' : 'rgba(148, 163, 184, 0.9)',
                  fontWeight: locale === 'en' ? 600 : 500,
                  cursor: 'pointer',
                  fontSize: 13,
                }}
              >
                {t.shell.langEn}
              </button>
            </div>
            <AiWhatsAppToggle
              onSuccessToast={(msg) => onToast(msg)}
              onErrorToast={(msg) => onToast(msg, true)}
            />
            <Link
              href="/instructor/profile"
              className={styles.headerProfileLink}
              aria-label={t.shell.ariaProfile}
            >
              {t.shell.profileLink}
            </Link>
          </div>
        </header>

        {toast && (
          <div
            role="status"
            aria-live="polite"
            className={styles.toast}
            style={{
              backgroundColor: toast.isError ? 'rgba(239, 68, 68, 0.95)' : 'rgba(34, 197, 94, 0.95)',
            }}
          >
            {toast.message}
          </div>
        )}

        <div
          className={`${styles.overlay} ${menuOpen ? styles.open : ''}`}
          onClick={closeMenu}
          onKeyDown={(e) => e.key === 'Escape' && closeMenu()}
          role="button"
          tabIndex={-1}
          aria-hidden="true"
        />

        <Sidebar open={menuOpen} onClose={closeMenu} />

        <main className={styles.main}>
          <ToastProvider onToast={onToast}>
            {children}
          </ToastProvider>
        </main>

        <footer className={styles.footer}>
          <Link href={`/${locale}/refund`} className={styles.footerLink}>{t.shell.refund}</Link>
          <Link href={`/${locale}/privacy`} className={styles.footerLink}>{t.shell.privacy}</Link>
          <Link href={`/${locale}/terms`} className={styles.footerLink}>{t.shell.terms}</Link>
          <Link href={`/${locale}/cookies`} className={styles.footerLink}>{t.shell.cookies}</Link>
          <Link href={`/${locale}/acceptable-use`} className={styles.footerLink}>{t.shell.acceptableUse}</Link>
        </footer>
      </div>
    </div>
  );
}

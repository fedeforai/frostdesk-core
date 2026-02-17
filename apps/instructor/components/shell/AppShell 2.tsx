'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import Sidebar, { SidebarRail } from './Sidebar';
import { AiWhatsAppToggle } from './AiWhatsAppToggle';
import { ToastProvider } from './ToastContext';
import styles from './shell.module.css';

const RAIL_WIDTH = 56;
const SIDEBAR_WIDTH = 280;

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; isError?: boolean } | null>(null);

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
            FrostDesk<span className={styles.headerSub}>Instructor</span>
          </span>
          <div className={styles.headerRight}>
            <AiWhatsAppToggle
              onSuccessToast={(msg) => onToast(msg)}
              onErrorToast={(msg) => onToast(msg, true)}
            />
            <Link
              href="/instructor/profile"
              className={styles.headerProfileLink}
              aria-label="Go to profile"
            >
              Profile
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
          <Link href="/instructor/privacy" className={styles.footerLink}>
            Privacy
          </Link>
        </footer>
      </div>
    </div>
  );
}

'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import Sidebar from './Sidebar';
import styles from './shell.module.css';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const toggleMenu = useCallback(() => setMenuOpen((prev) => !prev), []);
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <button
          type="button"
          className={`${styles.hamburger} ${menuOpen ? styles.hamburgerOpen : ''}`}
          onClick={toggleMenu}
          aria-label={menuOpen ? 'Chiudi menu' : 'Apri menu'}
          aria-expanded={menuOpen}
        >
          <span className={styles.hamburgerLine} />
          <span className={styles.hamburgerLine} />
          <span className={styles.hamburgerLine} />
        </button>
        <span className={styles.headerTitle}>
          FrostDesk<span className={styles.headerSub}>Instructor</span>
        </span>
        <Link
          href="/instructor/profile"
          className={styles.headerProfileLink}
          aria-label="Vai al profilo"
        >
          Profilo
        </Link>
      </header>

      <div
        className={`${styles.overlay} ${menuOpen ? styles.open : ''}`}
        onClick={closeMenu}
        onKeyDown={(e) => e.key === 'Escape' && closeMenu()}
        role="button"
        tabIndex={-1}
        aria-hidden="true"
      />

      <Sidebar open={menuOpen} onClose={closeMenu} />

      <main className={styles.main}>{children}</main>
    </div>
  );
}

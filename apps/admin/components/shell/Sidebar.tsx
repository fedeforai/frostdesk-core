'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './sidebar.module.css';

const nav = [
  { label: 'Dashboard', href: '/' },
  { label: 'Inbox', href: '/admin/human-inbox' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className={styles.sidebar}>
      <nav className={styles.nav}>
        {nav.map((it) => {
          const active = pathname === it.href;
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`${styles.navItem} ${active ? styles.active : ''}`}
            >
              {it.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './sidebar.module.css';
import LogoutButton from '@/components/shared/LogoutButton';

type NavItem = { href: string; label: string; desc?: string };

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  if (href === '/instructor/dashboard') return pathname === '/instructor/dashboard';
  return pathname === href || pathname.startsWith(href + '/');
}

function Section({ title, items }: { title: string; items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <div className={styles.section}>
      <div className={styles.sectionTitle}>{title}</div>
      <div className={styles.nav}>
        {items.map((it) => (
          <Link
            key={it.href}
            href={it.href}
            className={`${styles.navItem} ${isActive(pathname, it.href) ? styles.active : ''}`}
          >
            <div className={styles.navLabel}>{it.label}</div>
            {it.desc && <div className={styles.navDesc}>{it.desc}</div>}
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function Sidebar() {
  const core: NavItem[] = [
    { href: '/instructor/dashboard', label: 'Dashboard', desc: 'KPIs and overview' },
    { href: '/instructor/inbox', label: 'Inbox', desc: 'Work conversations' },
    { href: '/instructor/bookings', label: 'Bookings', desc: 'Lessons and status' },
  ];

  const operations: NavItem[] = [
    { href: '/instructor/services', label: 'Services', desc: 'What you sell' },
    { href: '/instructor/availability', label: 'Availability', desc: 'Your schedule' },
    { href: '/instructor/availability-conflicts', label: 'Conflicts', desc: 'Resolve overlaps' },
    { href: '/instructor/meeting-points', label: 'Meeting points', desc: 'Where to meet' },
  ];

  const integrations: NavItem[] = [
    { href: '/instructor/calendar', label: 'Calendar', desc: 'Connect and sync' },
  ];

  const compliance: NavItem[] = [
    { href: '/instructor/policies', label: 'Policies', desc: 'Rules and terms' },
    { href: '/instructor/booking-audit-logs', label: 'Audit logs', desc: 'Traceability' },
  ];

  const tooling: NavItem[] = [
    { href: '/instructor/booking-lifecycle', label: 'Booking lifecycle', desc: 'Internal flow' },
    { href: '/instructor/ai-booking-preview', label: 'AI booking preview', desc: 'AI draft demo' },
    { href: '/instructor/ai-booking-draft-preview', label: 'AI draft preview', desc: 'Draft UI demo' },
  ];

  const account: NavItem[] = [
    { href: '/instructor/profile', label: 'Profile', desc: 'Your details' },
    { href: '/instructor/settings', label: 'Settings', desc: 'Preferences' },
    { href: '/instructor/onboarding', label: 'Onboarding', desc: 'Complete setup' },
  ];

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <div className={styles.brandTop}>FrostDesk</div>
        <div className={styles.brandSub}>Instructor</div>
      </div>

      <Section title="Core" items={core} />
      <Section title="Operations" items={operations} />
      <Section title="Integrations" items={integrations} />
      <Section title="Compliance" items={compliance} />
      <Section title="Tooling" items={tooling} />
      <Section title="Account" items={account} />

      <div className={styles.footer}>
        <LogoutButton />
      </div>
    </aside>
  );
}

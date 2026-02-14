'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './sidebar.module.css';
import LogoutButton from '@/components/shared/LogoutButton';

type NavItem = { href: string; label: string; desc?: string } | { label: string; desc?: string; isLogout: true };

function isNavLink(it: NavItem): it is { href: string; label: string; desc?: string } {
  return 'href' in it;
}

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  if (href === '/instructor/dashboard') return pathname === '/instructor/dashboard';
  return pathname === href || pathname.startsWith(href + '/');
}

function Section({
  title,
  items,
  onNavigate,
}: {
  title: string;
  items: NavItem[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <div className={styles.section}>
      <div className={styles.sectionTitle}>{title}</div>
      <div className={styles.nav}>
        {items.map((it) =>
          isNavLink(it) ? (
            <Link
              key={it.href}
              href={it.href}
              className={`${styles.navItem} ${isActive(pathname, it.href) ? styles.active : ''}`}
              onClick={onNavigate}
            >
              <div className={styles.navLabel}>{it.label}</div>
              {it.desc && <div className={styles.navDesc}>{it.desc}</div>}
            </Link>
          ) : (
            <div key="logout" className={styles.navItem}>
              <LogoutButton variant="nav" />
              {it.desc && <div className={styles.navDesc}>{it.desc}</div>}
            </div>
          )
        )}
      </div>
    </div>
  );
}

type SidebarProps = { open: boolean; onClose: () => void };

export default function Sidebar({ open, onClose }: SidebarProps) {
  const core: NavItem[] = [
    { href: '/instructor/dashboard', label: 'Dashboard', desc: 'KPIs and overview' },
    { href: '/instructor/inbox', label: 'Inbox', desc: 'Work conversations' },
    { href: '/instructor/bookings', label: 'Bookings', desc: 'Lessons and status' },
    { href: '/instructor/customers', label: 'Customers', desc: 'Clients and notes' },
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
    { label: 'Logout', desc: 'Sign out', isLogout: true },
  ];

  return (
    <aside className={`${styles.sidebar} ${open ? styles.open : ''}`} aria-hidden={!open}>
      <div className={styles.brand}>
        <div className={styles.brandTop}>FrostDesk</div>
        <div className={styles.brandSub}>Instructor</div>
        <button
          type="button"
          className={styles.closeBtn}
          onClick={onClose}
          aria-label="Chiudi menu"
        >
          ×
        </button>
      </div>

      <div className={styles.sidebarScroll}>
        <Section title="Core" items={core} onNavigate={onClose} />
        <Section title="Operations" items={operations} onNavigate={onClose} />
        <Section title="Integrations" items={integrations} onNavigate={onClose} />
        <Section title="Compliance" items={compliance} onNavigate={onClose} />
        <Section title="Tooling" items={tooling} onNavigate={onClose} />
        <Section title="Account" items={account} onNavigate={onClose} />
      </div>

    </aside>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './sidebar.module.css';
import LogoutButton from '@/components/shared/LogoutButton';
import { InstructorSidebarIcon, type InstructorSidebarIconName } from './InstructorSidebarIcons';

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

const RAIL_ITEMS: { href: string; label: string; icon: InstructorSidebarIconName }[] = [
  { href: '/instructor/today', label: 'Today', icon: 'calendar' },
  { href: '/instructor/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { href: '/instructor/inbox', label: 'Inbox', icon: 'inbox' },
  { href: '/instructor/bookings', label: 'Lessons', icon: 'calendarClock' },
  { href: '/instructor/availability', label: 'Schedule', icon: 'calendarClock' },
  { href: '/instructor/calendar', label: 'Calendar', icon: 'calendar' },
  { href: '/instructor/customers', label: 'Clients', icon: 'users' },
  { href: '/instructor/profile', label: 'Profile', icon: 'user' },
  { href: '/instructor/settings', label: 'Settings', icon: 'settings' },
  { href: '/instructor/booking-audit-logs', label: 'Advanced', icon: 'clipboardList' },
];

function isRailActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  if (href === '/instructor/dashboard') return pathname === '/instructor/dashboard';
  return pathname.startsWith(href + '/');
}

export function SidebarRail({ onOpenMenu }: { onOpenMenu: () => void }) {
  const pathname = usePathname();

  return (
    <div className={styles.rail}>
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label="Open menu"
        className={styles.railMenuBtn}
      >
        <InstructorSidebarIcon name="menu" />
      </button>
      <nav className={styles.railNav} aria-label="Quick navigation">
        {RAIL_ITEMS.map(({ href, label, icon }) => (
          <Link
            key={href}
            href={href}
            className={`${styles.railItem} ${isRailActive(pathname, href) ? styles.railItemActive : ''}`}
            aria-label={label}
            title={label}
          >
            <InstructorSidebarIcon name={icon} />
          </Link>
        ))}
      </nav>
    </div>
  );
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const today: NavItem[] = [
    { href: '/instructor/today', label: 'Today', desc: 'Daily control view' },
    { href: '/instructor/dashboard', label: 'Dashboard', desc: 'KPIs and overview' },
    { href: '/instructor/inbox', label: 'Inbox', desc: 'Messages and requests' },
    { href: '/instructor/bookings', label: 'Lessons', desc: 'Today and upcoming' },
    { href: '/instructor/booking-drafts', label: 'Proposals', desc: 'Review and send' },
    { href: '/instructor/availability-conflicts', label: 'Conflicts', desc: 'Resolve overlaps' },
  ];

  const manage: NavItem[] = [
    { href: '/instructor/availability', label: 'Schedule', desc: 'Set availability' },
    { href: '/instructor/services', label: 'Services', desc: 'What you offer' },
    { href: '/instructor/meeting-points', label: 'Meeting points', desc: 'Where to meet' },
    { href: '/instructor/calendar', label: 'Calendar', desc: 'Sync and connect' },
  ];

  const account: NavItem[] = [
    { href: '/instructor/customers', label: 'Clients', desc: 'Notes and history' },
    { href: '/instructor/profile', label: 'Profile', desc: 'Your details' },
    { href: '/instructor/settings', label: 'Settings', desc: 'Preferences' },
    { label: 'Logout', desc: 'Sign out', isLogout: true },
  ];

  const settings: NavItem[] = [
    { href: '/instructor/booking-audit-logs', label: 'Advanced', desc: 'Technical and audit' },
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
          aria-label="Close menu"
        >
          ×
        </button>
      </div>

      <div className={styles.sidebarScroll}>
        <Section title="TODAY" items={today} onNavigate={onClose} />
        <Section title="MANAGE" items={manage} onNavigate={onClose} />
        <Section title="ACCOUNT" items={account} onNavigate={onClose} />
        <Section title="SETTINGS" items={settings} onNavigate={onClose} />
      </div>

    </aside>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import styles from './sidebar.module.css';
import LogoutButton from '@/components/shared/LogoutButton';
import { InstructorSidebarIcon, type InstructorSidebarIconName } from './InstructorSidebarIcons';

type NavLinkItem = { href: string; label: string; desc?: string; icon: InstructorSidebarIconName };
type NavItem = NavLinkItem | { label: string; desc?: string; isLogout: true };

function isNavLink(it: NavItem): it is NavLinkItem {
  return 'href' in it;
}

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  if (href === '/instructor/dashboard') return pathname === '/instructor/dashboard';
  return pathname === href || pathname.startsWith(href + '/');
}

/** Flat item for the icon rail (links only). */
export interface RailItem {
  href: string;
  label: string;
  icon: InstructorSidebarIconName;
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
              <span className={styles.navIcon}>
                <InstructorSidebarIcon name={it.icon} />
              </span>
              <div className={styles.navText}>
                <div className={styles.navLabel}>{it.label}</div>
                {it.desc && <div className={styles.navDesc}>{it.desc}</div>}
              </div>
            </Link>
          ) : (
            <div key="logout" className={styles.navItem}>
              <span className={styles.navIcon}>
                <InstructorSidebarIcon name="logOut" />
              </span>
              <div className={styles.navText}>
                <LogoutButton variant="nav" />
                {it.desc && <div className={styles.navDesc}>{it.desc}</div>}
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}

/** Lightweight collapsible group for the Settings submenu (Advanced). */
function CollapsibleGroup({
  title,
  subtitle,
  icon,
  open,
  onToggle,
  children,
}: {
  title: string;
  subtitle?: string;
  icon: InstructorSidebarIconName;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.section}>
      <button
        type="button"
        className={styles.navItem}
        onClick={onToggle}
        aria-expanded={open}
      >
        <span className={styles.navIcon}>
          <InstructorSidebarIcon name={icon} />
        </span>
        <div className={styles.navText}>
          <div className={styles.navLabel} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {title}
            <span style={{ opacity: 0.7, fontSize: 12 }}>{open ? '▾' : '▸'}</span>
          </div>
          {subtitle && <div className={styles.navDesc}>{subtitle}</div>}
        </div>
      </button>

      {open ? (
        <div className={styles.nav} style={{ paddingLeft: 12 }}>
          {children}
        </div>
      ) : null}
    </div>
  );
}

/** Returns flat list of link items for the icon rail (menu ritratto). */
export function getRailItems(): RailItem[] {
  return [
    { href: '/instructor/today', label: 'Today', icon: 'calendar' },
    { href: '/instructor/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { href: '/instructor/inbox', label: 'Inbox', icon: 'inbox' },
    { href: '/instructor/bookings', label: 'Lessons', icon: 'calendar' },
    { href: '/instructor/booking-drafts', label: 'Proposals', icon: 'fileEdit' },
    { href: '/instructor/availability', label: 'Schedule', icon: 'calendarClock' },
    { href: '/instructor/services', label: 'Services', icon: 'package' },
    { href: '/instructor/settings', label: 'Settings', icon: 'settings' },
  ];
}

type SidebarProps = { open: boolean; onClose: () => void };

export default function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();

  const advancedRoutes = useMemo(
    () =>
      new Set([
        '/instructor/policies',
        '/instructor/booking-audit-logs',
        '/instructor/booking-lifecycle',
      ]),
    []
  );

  const isInAdvanced = useMemo(() => {
    for (const r of advancedRoutes) {
      if (pathname === r || pathname.startsWith(r + '/')) return true;
    }
    return false;
  }, [pathname, advancedRoutes]);

  const [advancedOpen, setAdvancedOpen] = useState(false);

  useEffect(() => {
    const key = 'instructorSidebarAdvancedOpen';
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
    const initial = stored === '1';
    setAdvancedOpen(isInAdvanced ? true : initial);
  }, [isInAdvanced]);

  function toggleAdvanced() {
    setAdvancedOpen((v) => {
      const next = !v;
      try {
        window.localStorage.setItem('instructorSidebarAdvancedOpen', next ? '1' : '0');
      } catch {
        // ignore
      }
      return next;
    });
  }

  const today: NavItem[] = [
    { href: '/instructor/today', label: 'Today', desc: 'Daily control view', icon: 'calendar' },
    { href: '/instructor/dashboard', label: 'Dashboard', desc: 'KPIs and overview', icon: 'dashboard' },
    { href: '/instructor/inbox', label: 'Inbox', desc: 'Messages and requests', icon: 'inbox' },
    { href: '/instructor/bookings', label: 'Lessons', desc: 'Today and upcoming', icon: 'calendar' },
    { href: '/instructor/booking-drafts', label: 'Proposals', desc: 'Review and send', icon: 'fileEdit' },
    { href: '/instructor/availability-conflicts', label: 'Conflicts', desc: 'Resolve overlaps', icon: 'alertCircle' },
  ];

  const manage: NavItem[] = [
    { href: '/instructor/availability', label: 'Schedule', desc: 'Set availability', icon: 'calendarClock' },
    { href: '/instructor/services', label: 'Services', desc: 'What you offer', icon: 'package' },
    { href: '/instructor/meeting-points', label: 'Meeting points', desc: 'Where to meet', icon: 'mapPin' },
    { href: '/instructor/calendar', label: 'Calendar', desc: 'Sync and connect', icon: 'calendar' },
  ];

  const account: NavItem[] = [
    { href: '/instructor/customers', label: 'Clients', desc: 'Notes and history', icon: 'users' },
    { href: '/instructor/profile', label: 'Profile', desc: 'Your details', icon: 'user' },
    { href: '/instructor/settings', label: 'Settings', desc: 'Preferences', icon: 'settings' },
    { label: 'Logout', desc: 'Sign out', isLogout: true },
  ];

  const advanced: NavLinkItem[] = [
    { href: '/instructor/policies', label: 'Policies', desc: 'Terms and rules', icon: 'fileText' },
    { href: '/instructor/booking-audit-logs', label: 'Audit logs', desc: 'Traceability', icon: 'clipboardList' },
    { href: '/instructor/booking-lifecycle', label: 'Lifecycle', desc: 'How bookings flow', icon: 'gitBranch' },
  ];

  return (
    <aside className={`${styles.sidebar} ${open ? styles.open : ''}`} aria-hidden={!open}>
      <div className={styles.brand}>
        <div className={styles.brandTop}>FrostDesk</div>
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
        <Section title="Today" items={today} onNavigate={onClose} />
        <Section title="Manage" items={manage} onNavigate={onClose} />
        <Section title="Account" items={account} onNavigate={onClose} />

        <div className={styles.section}>
          <div className={styles.sectionTitle}>Settings</div>

          <CollapsibleGroup
            title="Advanced"
            subtitle="Technical and audit"
            icon="settings"
            open={advancedOpen}
            onToggle={toggleAdvanced}
          >
            {advanced.map((it) => (
              <Link
                key={it.href}
                href={it.href}
                className={`${styles.navItem} ${isActive(pathname, it.href) ? styles.active : ''}`}
                onClick={onClose}
                style={{ marginLeft: 4 }}
              >
                <span className={styles.navIcon}>
                  <InstructorSidebarIcon name={it.icon} />
                </span>
                <div className={styles.navText}>
                  <div className={styles.navLabel}>{it.label}</div>
                  {it.desc && <div className={styles.navDesc}>{it.desc}</div>}
                </div>
              </Link>
            ))}
          </CollapsibleGroup>
        </div>
      </div>
    </aside>
  );
}

/** Icon rail visible when menu is retracted (sempre visibile a menu ritratto). */
export function SidebarRail({ onOpenMenu }: { onOpenMenu: () => void }) {
  const pathname = usePathname();
  const items = getRailItems();

  return (
    <aside className={styles.rail} aria-label="Navigation">
      <button
        type="button"
        className={styles.railMenuBtn}
        onClick={onOpenMenu}
        title="Open menu"
        aria-label="Open menu"
      >
        <InstructorSidebarIcon name="menu" />
      </button>
      <nav className={styles.railNav}>
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.railItem} ${active ? styles.railItemActive : ''}`}
              title={item.label}
            >
              <InstructorSidebarIcon name={item.icon} />
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

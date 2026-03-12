'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAppLocale } from '@/lib/app/AppLocaleContext';
import { getAppTranslations, type AppTranslations } from '@/lib/app/translations';
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
  sectionClass,
}: {
  title: string;
  items: NavItem[];
  onNavigate?: () => void;
  sectionClass?: string;
}) {
  const pathname = usePathname();
  const wrapClass = sectionClass ? `${styles.navItemWrap} ${sectionClass}` : styles.navItemWrap;

  return (
    <div className={styles.section}>
      <div className={styles.sectionTitle}>{title}</div>
      <div className={styles.nav}>
        {items.map((it) =>
          isNavLink(it) ? (
            <div key={it.href} className={wrapClass}>
              <Link
                href={it.href}
                className={`${styles.navItem} ${isActive(pathname, it.href) ? styles.active : ''}`}
                onClick={onNavigate}
              >
                <div className={styles.navLabel}>{it.label}</div>
                {it.desc && <div className={styles.navDesc}>{it.desc}</div>}
              </Link>
            </div>
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

const RAIL_ITEMS: { href: string; labelKey: keyof AppTranslations['shell']['nav']; icon: InstructorSidebarIconName }[] = [
  { href: '/instructor/today', labelKey: 'today', icon: 'calendar' },
  { href: '/instructor/dashboard', labelKey: 'dashboard', icon: 'dashboard' },
  { href: '/instructor/inbox', labelKey: 'inbox', icon: 'inbox' },
  { href: '/instructor/bookings', labelKey: 'lessons', icon: 'calendarClock' },
  { href: '/instructor/availability', labelKey: 'schedule', icon: 'calendarClock' },
  { href: '/instructor/calendar', labelKey: 'calendar', icon: 'calendar' },
  { href: '/instructor/customers', labelKey: 'clients', icon: 'users' },
  { href: '/instructor/profile', labelKey: 'profile', icon: 'user' },
  { href: '/instructor/settings', labelKey: 'settings', icon: 'settings' },
  { href: '/instructor/booking-audit-logs', labelKey: 'advanced', icon: 'clipboardList' },
];

function isRailActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  if (href === '/instructor/dashboard') return pathname === '/instructor/dashboard';
  return pathname.startsWith(href + '/');
}

export function SidebarRail({ onOpenMenu }: { onOpenMenu: () => void }) {
  const pathname = usePathname();
  const { locale } = useAppLocale();
  const t = getAppTranslations(locale);

  return (
    <div className={styles.rail}>
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label={t.shell.openMenu}
        className={styles.railMenuBtn}
      >
        <InstructorSidebarIcon name="menu" />
      </button>
      <nav className={styles.railNav} aria-label="Quick navigation">
        {RAIL_ITEMS.map(({ href, labelKey, icon }) => (
          <Link
            key={href}
            href={href}
            className={`${styles.railItem} ${isRailActive(pathname, href) ? styles.railItemActive : ''}`}
            aria-label={t.shell.nav[labelKey]}
            title={t.shell.nav[labelKey]}
          >
            <InstructorSidebarIcon name={icon} />
          </Link>
        ))}
      </nav>
    </div>
  );
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const { locale } = useAppLocale();
  const t = getAppTranslations(locale);
  const nav = t.shell.nav;

  const today: NavItem[] = [
    { href: '/instructor/today', label: nav.today, desc: nav.todayDesc },
    { href: '/instructor/dashboard', label: nav.dashboard, desc: nav.dashboardDesc },
    { href: '/instructor/inbox', label: nav.inbox, desc: nav.inboxDesc },
    { href: '/instructor/bookings', label: nav.lessons, desc: nav.lessonsDesc },
    { href: '/instructor/booking-drafts', label: nav.proposals, desc: nav.proposalsDesc },
    { href: '/instructor/availability-conflicts', label: nav.conflicts, desc: nav.conflictsDesc },
  ];

  const manage: NavItem[] = [
    { href: '/instructor/availability', label: nav.schedule, desc: nav.scheduleDesc },
    { href: '/instructor/services', label: nav.services, desc: nav.servicesDesc },
    { href: '/instructor/meeting-points', label: nav.meetingPoints, desc: nav.meetingPointsDesc },
    { href: '/instructor/calendar', label: nav.calendar, desc: nav.calendarDesc },
  ];

  const account: NavItem[] = [
    { href: '/instructor/customers', label: nav.clients, desc: nav.clientsDesc },
    { href: '/instructor/profile', label: nav.profile, desc: nav.profileDesc },
    { href: '/instructor/settings', label: nav.settings, desc: nav.settingsDesc },
    { label: t.common.logout, desc: t.common.signOut, isLogout: true },
  ];

  const settings: NavItem[] = [
    { href: '/instructor/booking-audit-logs', label: nav.advanced, desc: nav.advancedDesc },
  ];

  return (
    <aside className={`${styles.sidebar} ${open ? styles.open : ''}`} aria-hidden={!open}>
      <div className={styles.brand}>
        <Image
          src="/frostdesk-logo.svg"
          alt="Frostdesk"
          width={40}
          height={40}
          className={styles.brandLogo}
        />
        <div className={styles.brandSub}>{t.shell.subtitle}</div>
        <button
          type="button"
          className={styles.closeBtn}
          onClick={onClose}
          aria-label={t.shell.closeMenu}
        >
          ×
        </button>
      </div>

      <div className={styles.sidebarScroll}>
        <Section title={nav.sectionToday} items={today} onNavigate={onClose} sectionClass={styles.sectionToday} />
        <Section title={nav.sectionManage} items={manage} onNavigate={onClose} sectionClass={styles.sectionManage} />
        <Section title={nav.sectionAccount} items={account} onNavigate={onClose} sectionClass={styles.sectionAccount} />
        <Section title={nav.sectionSettings} items={settings} onNavigate={onClose} sectionClass={styles.sectionSettings} />
      </div>

    </aside>
  );
}

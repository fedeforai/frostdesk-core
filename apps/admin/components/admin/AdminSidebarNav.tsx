'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import type { NavItem } from './AdminSidebar';
import { AdminSidebarIcon, IconChevronLeft, IconChevronRight } from './AdminSidebarIcons';
import s from './sidebar.module.css';

interface AdminSidebarNavProps {
  items: NavItem[];
  collapsed: boolean;
  onToggleCollapse?: () => void;
}

export default function AdminSidebarNav({ items, collapsed, onToggleCollapse }: AdminSidebarNavProps) {
  const pathname = usePathname();

  const menuItems = items.filter((i) => i.section === 'menu');
  const sistemaItems = items.filter((i) => i.section === 'sistema');

  return (
    <aside className={`${s.sidebar} ${collapsed ? s.sidebarCollapsed : ''}`} aria-label="Navigation">
      {/* Logo */}
      <div className={s.logo}>
        <div className={s.logoIcon} aria-hidden>F</div>
        <span className={s.logoText}>FrostDesk</span>
      </div>

      {/* Menu section */}
      <div className={s.sectionLabel}>Menu</div>
      <nav className={s.nav} aria-label="Menu">
        {menuItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${s.navLink} ${isActive ? s.navLinkActive : ''}`}
              title={collapsed ? item.label : undefined}
            >
              <span className={s.navIcon}>
                <AdminSidebarIcon name={item.icon} />
              </span>
              <span className={s.navLabel}>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Sistema section */}
      {sistemaItems.length > 0 && (
        <>
          <div className={s.sectionLabel}>System</div>
          <nav className={s.nav} aria-label="System">
            {sistemaItems.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`${s.navLink} ${isActive ? s.navLinkActive : ''}`}
                  title={collapsed ? item.label : undefined}
                >
                  <span className={s.navIcon}>
                    <AdminSidebarIcon name={item.icon} />
                  </span>
                  <span className={s.navLabel}>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </>
      )}

      {/* Collapse toggle */}
      <div className={s.spacer} />
      {onToggleCollapse && (
        <button
          type="button"
          onClick={onToggleCollapse}
          className={s.toggleBtn}
          title={collapsed ? 'Expand menu' : 'Collapse menu'}
          aria-expanded={!collapsed}
        >
          {collapsed ? <IconChevronRight /> : <IconChevronLeft />}
        </button>
      )}
    </aside>
  );
}

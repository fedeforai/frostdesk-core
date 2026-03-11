'use client';

import { useState, useCallback, useEffect } from 'react';
import AdminSidebar from './AdminSidebar';
import s from './shell.module.css';

const STORAGE_KEY = 'admin-sidebar-collapsed';
const SIDEBAR_WIDTH = 220;
const SIDEBAR_COLLAPSED_WIDTH = 56;
const MOBILE_BREAKPOINT = 768;

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(typeof window !== 'undefined' && window.innerWidth < MOBILE_BREAKPOINT);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isMobile;
}

export default function AdminShell({
  role,
  children,
}: {
  role: string | null;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsedState] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      setCollapsedState(stored === '1');
    } catch {
      // ignore
    }
    setMounted(true);
  }, []);

  const onToggleCollapse = useCallback(() => {
    setCollapsedState((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const marginLeft = mounted && !isMobile ? (collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH) : 0;

  return (
    <>
      <AdminSidebar
        role={role}
        collapsed={collapsed}
        onToggleCollapse={onToggleCollapse}
        mobileOpen={menuOpen}
        onMobileClose={() => setMenuOpen(false)}
      />
      {isMobile && menuOpen && (
        <div
          className={s.overlay}
          onClick={() => setMenuOpen(false)}
          onKeyDown={(e) => e.key === 'Escape' && setMenuOpen(false)}
          role="button"
          tabIndex={-1}
          aria-hidden
        />
      )}
      {isMobile && (
        <button
          type="button"
          className={s.mobileMenuBtn}
          onClick={() => setMenuOpen(true)}
          aria-label="Open menu"
        >
          <span className={s.mobileMenuIcon} />
          <span className={s.mobileMenuIcon} />
          <span className={s.mobileMenuIcon} />
        </button>
      )}
      <div
        className={s.contentWrap}
        style={{
          flex: 1,
          minHeight: '100vh',
          marginLeft,
          transition: 'margin-left 0.2s ease',
        }}
      >
        {children}
      </div>
    </>
  );
}

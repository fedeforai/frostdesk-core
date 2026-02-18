'use client';

import { useState, useCallback, useEffect } from 'react';
import AdminSidebar from './AdminSidebar';

const STORAGE_KEY = 'admin-sidebar-collapsed';
const SIDEBAR_WIDTH = 220;
const SIDEBAR_COLLAPSED_WIDTH = 56;

export default function AdminShell({
  role,
  children,
}: {
  role: string | null;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsedState] = useState(false);
  const [mounted, setMounted] = useState(false);

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

  const marginLeft = mounted ? (collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH) : SIDEBAR_WIDTH;

  return (
    <>
      <AdminSidebar
        role={role}
        collapsed={collapsed}
        onToggleCollapse={onToggleCollapse}
      />
      <div
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

'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';

interface NavItem {
  label: string;
  href: string;
  roles: string[];
}

interface AdminSidebarNavProps {
  items: NavItem[];
}

export default function AdminSidebarNav({ items }: AdminSidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
      {items.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
        
        return (
          <Link
            key={item.href}
            href={item.href}
            style={{
              display: 'block',
              padding: '0.5rem 1rem',
              color: isActive ? '#2563eb' : '#374151',
              textDecoration: 'none',
              fontSize: '0.875rem',
              backgroundColor: isActive ? '#eff6ff' : 'transparent',
              borderLeft: isActive ? '3px solid #2563eb' : '3px solid transparent',
              fontWeight: isActive ? '500' : '400',
            }}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

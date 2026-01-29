'use client';

import Link from 'next/link';

interface BreadcrumbsProps {
  items: Array<{
    label: string;
    href?: string;
  }>;
}

export default function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav style={{ marginBottom: '1.5rem' }}>
      <ol style={{ 
        display: 'flex', 
        alignItems: 'center',
        gap: '0.5rem',
        listStyle: 'none',
        padding: 0,
        margin: 0,
        fontSize: '0.875rem',
        color: '#6b7280',
      }}>
        {items.map((item, index) => (
          <li key={index} style={{ display: 'flex', alignItems: 'center' }}>
            {index > 0 && (
              <span style={{ margin: '0 0.5rem', color: '#d1d5db' }}>/</span>
            )}
            {item.href ? (
              <Link
                href={item.href}
                style={{
                  color: '#3b82f6',
                  textDecoration: 'none',
                  transition: 'color 0.15s ease',
                  outline: 'none',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#2563eb';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#3b82f6';
                }}
                onFocus={(e) => {
                  e.currentTarget.style.outline = '2px solid #3b82f6';
                  e.currentTarget.style.outlineOffset = '2px';
                  e.currentTarget.style.borderRadius = '0.25rem';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.outline = 'none';
                }}
                aria-label={`Navigate to ${item.label}`}
              >
                {item.label}
              </Link>
            ) : (
              <span style={{ color: '#111827', fontWeight: '500' }} aria-current="page">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/**
 * Badge Component (shadcn/ui compatible)
 * 
 * Simple badge component for read-only indicators.
 * Variant: secondary (default) or outline
 */

interface BadgeProps {
  variant?: 'secondary' | 'outline';
  children: React.ReactNode;
  className?: string;
}

export default function Badge({ 
  variant = 'secondary', 
  children,
  className = '',
}: BadgeProps) {
  const baseStyles = {
    display: 'inline-flex',
    alignItems: 'center',
    borderRadius: '0.375rem',
    fontSize: '0.75rem', // text-xs
    fontWeight: '600', // font-semibold
    padding: '0.125rem 0.5rem',
    whiteSpace: 'nowrap' as const,
  };

  const variantStyles = {
    secondary: {
      backgroundColor: '#f3f4f6',
      color: '#6b7280',
      border: '1px solid #e5e7eb',
    },
    outline: {
      backgroundColor: 'transparent',
      color: '#6b7280',
      border: '1px solid #e5e7eb',
    },
  };

  const styles = {
    ...baseStyles,
    ...variantStyles[variant],
  };

  return (
    <span style={styles} className={className}>
      {children}
    </span>
  );
}

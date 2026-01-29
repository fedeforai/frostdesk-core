'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

type ErrorStateProps = {
  status: number;
  message?: string;
};

export default function ErrorState({ status, message }: ErrorStateProps) {
  const router = useRouter();

  useEffect(() => {
    // 403 → Redirect immediato a /admin/not-authorized
    if (status === 403) {
      router.push('/admin/not-authorized');
    }
  }, [status, router]);

  // If redirecting, show nothing
  if (status === 403) {
    return null;
  }

  // 404 → Render: "Resource not found."
  if (status === 404) {
    return (
      <div style={{ 
        padding: '3rem 2rem', 
        textAlign: 'center',
        border: '1px solid #e5e7eb',
        borderRadius: '0.5rem',
        backgroundColor: '#ffffff',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
      }}>
        <div style={{ 
          fontSize: '3rem', 
          marginBottom: '1rem',
          lineHeight: '1',
        }}>
          🔍
        </div>
        <h2 style={{ 
          fontSize: '1.5rem', 
          fontWeight: '600',
          color: '#111827',
          marginBottom: '0.5rem',
        }}>
          Resource Not Found
        </h2>
        <p style={{ 
          color: '#6b7280',
          fontSize: '0.875rem',
        }}>
          The requested resource could not be found.
        </p>
      </div>
    );
  }

  // 409 → Render: message (raw backend)
  if (status === 409) {
    return (
      <div style={{ 
        padding: '3rem 2rem', 
        textAlign: 'center',
        border: '1px solid #fbbf24',
        borderRadius: '0.5rem',
        backgroundColor: '#fef3c7',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
      }}>
        <div style={{ 
          fontSize: '3rem', 
          marginBottom: '1rem',
          lineHeight: '1',
        }}>
          ⚠️
        </div>
        <h2 style={{ 
          fontSize: '1.5rem', 
          fontWeight: '600',
          color: '#78350f',
          marginBottom: '0.5rem',
        }}>
          Conflict
        </h2>
        <p style={{ 
          color: '#78350f',
          fontSize: '0.875rem',
        }}>
          {message || 'A conflict occurred.'}
        </p>
      </div>
    );
  }

  // 500 → Render: "Something went wrong. Please try again later."
  if (status === 500) {
    return (
      <div style={{ 
        padding: '3rem 2rem', 
        textAlign: 'center',
        border: '1px solid #e5e7eb',
        borderRadius: '0.5rem',
        backgroundColor: '#ffffff',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
      }}>
        <div style={{ 
          fontSize: '3rem', 
          marginBottom: '1rem',
          lineHeight: '1',
        }}>
          ⚠️
        </div>
        <h2 style={{ 
          fontSize: '1.5rem', 
          fontWeight: '600',
          color: '#111827',
          marginBottom: '0.5rem',
        }}>
          Server Error
        </h2>
        <p style={{ 
          color: '#6b7280',
          fontSize: '0.875rem',
        }}>
          Something went wrong. Please try again later.
        </p>
      </div>
    );
  }

  // Default error
  return (
    <div style={{ 
      padding: '3rem 2rem', 
      textAlign: 'center',
      border: '1px solid #e5e7eb',
      borderRadius: '0.5rem',
      backgroundColor: '#ffffff',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
    }}>
      <div style={{ 
        fontSize: '3rem', 
        marginBottom: '1rem',
        lineHeight: '1',
      }}>
        ⚠️
      </div>
      <h2 style={{ 
        fontSize: '1.5rem', 
        fontWeight: '600',
        color: '#111827',
        marginBottom: '0.5rem',
      }}>
        Error
      </h2>
      <p style={{ 
        color: '#6b7280',
        fontSize: '0.875rem',
      }}>
        {message || 'An error occurred.'}
      </p>
    </div>
  );
}

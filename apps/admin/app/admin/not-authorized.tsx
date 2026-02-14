export default function NotAuthorized() {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '100vh',
      padding: '2rem',
      textAlign: 'center',
      backgroundColor: '#f9fafb',
    }}>
      <div style={{
        padding: '3rem 2rem',
        border: '1px solid #e5e7eb',
        borderRadius: '0.5rem',
        backgroundColor: '#ffffff',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        maxWidth: '28rem',
        width: '100%',
      }}>
        <div style={{ 
          fontSize: '3rem', 
          marginBottom: '1rem',
          lineHeight: '1',
        }}>
          🚫
        </div>
        <h1 style={{ 
          fontSize: '1.5rem', 
          fontWeight: '600',
          color: '#111827',
          marginBottom: '0.5rem',
        }}>
          Access Denied
        </h1>
        <p style={{ 
          fontSize: '0.875rem',
          color: '#6b7280',
          marginBottom: '1rem',
        }}>
          Admin access only
        </p>
        <p style={{ fontSize: '0.875rem', marginBottom: '1.5rem' }}>
          <a href="/login" style={{ color: '#2563eb', fontWeight: 600 }}>
            Accedi come admin →
          </a>
        </p>
        <div style={{
          padding: '0.75rem 1rem',
          backgroundColor: '#f3f4f6',
          borderRadius: '0.375rem',
          border: '1px solid #e5e7eb',
        }}>
          <span style={{
            fontFamily: 'monospace',
            fontSize: '1.25rem',
            fontWeight: '600',
            color: '#dc2626',
          }}>
            403
          </span>
        </div>
      </div>
    </div>
  );
}

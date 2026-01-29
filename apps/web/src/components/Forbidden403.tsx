import { useNavigate } from 'react-router-dom';

export default function Forbidden403() {
  const navigate = useNavigate();

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '100vh',
      padding: '2rem',
      textAlign: 'center'
    }}>
      <h1 style={{ fontSize: '4rem', marginBottom: '1rem', color: '#dc2626' }}>403</h1>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Forbidden</h2>
      <p style={{ marginBottom: '2rem', color: '#6b7280' }}>
        You do not have permission to access this page.
      </p>
      <button
        onClick={() => navigate('/')}
        style={{
          padding: '0.5rem 1rem',
          backgroundColor: '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '0.25rem',
          cursor: 'pointer',
          fontSize: '1rem',
        }}
      >
        Go Home
      </button>
    </div>
  );
}

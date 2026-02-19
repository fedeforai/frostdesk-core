import { Suspense } from 'react';
import LoginForm from './LoginForm';

const fallback = (
  <div
    style={{
      minHeight: '100vh',
      display: 'grid',
      placeItems: 'center',
      background: '#0b1220',
      color: '#94a3b8',
      fontSize: 14,
    }}
  >
    Loading…
  </div>
);

export default function LoginPage() {
  return (
    <Suspense fallback={fallback}>
      <LoginForm />
    </Suspense>
  );
}

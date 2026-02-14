import { Suspense } from 'react';
import SignupForm from './SignupForm';

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
    Caricamento…
  </div>
);

export default function SignupPage() {
  return (
    <Suspense fallback={fallback}>
      <SignupForm />
    </Suspense>
  );
}

'use client';

import { Suspense } from 'react';
import AdminLoginForm from '@/components/auth/LoginForm';

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0b1220', color: 'rgba(226, 232, 240, 0.9)' }}>Loading…</div>}>
      <AdminLoginForm />
    </Suspense>
  );
}

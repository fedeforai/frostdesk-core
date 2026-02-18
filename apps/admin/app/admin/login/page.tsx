import AdminLoginPage from '@/app/login/page';

export const dynamic = 'force-dynamic';

/**
 * Public admin login page. Renders the same login form as root /login
 * so /admin/login responds 200 and avoids redirect loops with (protected) layout.
 */
export default function AdminLoginRoute() {
  return <AdminLoginPage />;
}

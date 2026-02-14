import { redirect } from 'next/navigation';

/**
 * Redirect /admin/login → /login so the login form is always reachable
 * (root /login is outside the admin layout and does not depend on x-pathname).
 */
export default function AdminLoginRedirect() {
  redirect('/login?next=/admin/dashboard');
}

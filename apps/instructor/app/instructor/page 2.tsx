import { redirect } from 'next/navigation';

/**
 * /instructor has no content; send to dashboard (auth handled by (app) layout).
 */
export default function InstructorIndexPage() {
  redirect('/instructor/dashboard');
}

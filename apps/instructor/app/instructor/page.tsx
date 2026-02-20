import { redirect } from 'next/navigation';

/**
 * /instructor: send everyone through the gate first (create profile, then pending/onboarding/dashboard).
 */
export default function InstructorIndexPage() {
  redirect('/instructor/gate');
}

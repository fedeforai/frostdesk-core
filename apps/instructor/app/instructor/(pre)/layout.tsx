/**
 * Pre-gate layout: no guard, no sidebar.
 * For gate, approval-pending, onboarding, login, signup.
 */
export default function PreGateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

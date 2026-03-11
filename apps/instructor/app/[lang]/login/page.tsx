import { redirect } from "next/navigation";

/**
 * Single login: redirect to instructor password login.
 * Keeps one login flow (no magic link).
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const next = params.next;
  const nextPath = typeof next === "string" && next.startsWith("/") && !next.startsWith("//")
    ? next
    : "/instructor/gate";
  redirect(`/instructor/login?next=${encodeURIComponent(nextPath)}`);
}

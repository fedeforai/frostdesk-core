export const dynamic = "force-dynamic";

export default function AdminDashboardPage() {
  return (
    <div style={{ padding: 24 }}>
      <h1>Admin Dashboard</h1>
      <p>Dashboard shell loaded. Data loading is temporarily disabled to avoid Vercel timeouts.</p>
      <p>If you still see a blank screen, the issue is middleware/auth redirect, not the dashboard rendering.</p>
    </div>
  );
}

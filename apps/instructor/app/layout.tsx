import './globals.css';
import { SpeedInsights } from '@vercel/speed-insights/next';

export const dynamic = 'force-dynamic';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          backgroundColor: '#0b1220',
          color: '#e5e7eb',
          minHeight: '100vh',
        }}
      >
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}

import type { InstructorProfile } from '@/lib/instructorApi';

interface DashboardHeaderProps {
  profile: InstructorProfile | null;
}

export default function DashboardHeader({ profile }: DashboardHeaderProps) {
  if (!profile) {
    return (
      <div style={{
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '20px',
        padding: '24px',
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.05)',
      }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'rgba(226, 232, 240, 0.95)', marginBottom: '1rem' }}>
          Profile
        </h2>
        <p style={{ color: 'rgba(148, 163, 184, 0.9)' }}>No profile data available.</p>
      </div>
    );
  }

  return (
    <div style={{
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '20px',
      padding: '24px',
      background: 'rgba(255, 255, 255, 0.05)',
      backdropFilter: 'blur(10px)',
      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.05)',
    }}>
      <h2 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'rgba(226, 232, 240, 0.95)', marginBottom: '1rem' }}>
        Profile
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div>
          <div style={{ fontSize: '0.875rem', color: 'rgba(148, 163, 184, 0.9)', marginBottom: '0.25rem' }}>Instructor name</div>
          <div style={{ fontSize: '1rem', color: 'rgba(226, 232, 240, 0.95)', fontWeight: 500 }}>{profile.full_name}</div>
        </div>
        <div>
          <div style={{ fontSize: '0.875rem', color: 'rgba(148, 163, 184, 0.9)', marginBottom: '0.25rem' }}>Resort</div>
          <div style={{ fontSize: '1rem', color: 'rgba(226, 232, 240, 0.95)', fontWeight: 500 }}>{profile.base_resort}</div>
        </div>
        <div>
          <div style={{ fontSize: '0.875rem', color: 'rgba(148, 163, 184, 0.9)', marginBottom: '0.25rem' }}>Language</div>
          <div style={{ fontSize: '1rem', color: 'rgba(226, 232, 240, 0.95)', fontWeight: 500 }}>{profile.working_language}</div>
        </div>
      </div>
    </div>
  );
}

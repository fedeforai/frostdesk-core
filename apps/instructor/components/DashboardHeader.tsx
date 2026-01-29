import type { InstructorProfile } from '@/lib/instructorApi';

interface DashboardHeaderProps {
  profile: InstructorProfile | null;
}

export default function DashboardHeader({ profile }: DashboardHeaderProps) {
  if (!profile) {
    return (
      <div style={{
        border: '1px solid #e5e7eb',
        borderRadius: '0.5rem',
        padding: '1.5rem',
        backgroundColor: '#ffffff',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
      }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827', marginBottom: '1rem' }}>
          Profile
        </h2>
        <p style={{ color: '#6b7280' }}>No profile data available.</p>
      </div>
    );
  }

  return (
    <div style={{
      border: '1px solid #e5e7eb',
      borderRadius: '0.5rem',
      padding: '1.5rem',
      backgroundColor: '#ffffff',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
    }}>
      <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827', marginBottom: '1rem' }}>
        Profile
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div>
          <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>Nome maestro</div>
          <div style={{ fontSize: '1rem', color: '#111827', fontWeight: '500' }}>{profile.full_name}</div>
        </div>
        <div>
          <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>Resort</div>
          <div style={{ fontSize: '1rem', color: '#111827', fontWeight: '500' }}>{profile.base_resort}</div>
        </div>
        <div>
          <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>Lingua</div>
          <div style={{ fontSize: '1rem', color: '#111827', fontWeight: '500' }}>{profile.working_language}</div>
        </div>
      </div>
    </div>
  );
}

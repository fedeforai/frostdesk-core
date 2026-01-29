import { fetchInstructorProfile } from '@/lib/instructorApi';
import ProfileForm from '@/components/ProfileForm';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  try {
    const profile = await fetchInstructorProfile();

    return (
      <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: '600', color: '#111827', marginBottom: '1.5rem' }}>
          Instructor Profile
        </h1>
        <div style={{
          border: '1px solid #e5e7eb',
          borderRadius: '0.5rem',
          padding: '1.5rem',
          backgroundColor: '#ffffff',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        }}>
          <ProfileForm profile={profile} />
        </div>
      </div>
    );
  } catch (error: any) {
    const status = error.status || 500;

    // 401 → redirect to login
    if (status === 401) {
      redirect('/login');
    }

    // 403 → static "Not authorized"
    if (status === 403) {
      return (
        <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
          <div style={{
            padding: '3rem 2rem',
            textAlign: 'center',
            border: '1px solid #e5e7eb',
            borderRadius: '0.5rem',
            backgroundColor: '#ffffff',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
          }}>
            <div style={{
              fontSize: '3rem',
              marginBottom: '1rem',
              lineHeight: '1',
            }}>
              🚫
            </div>
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: '600',
              color: '#111827',
              marginBottom: '0.5rem',
            }}>
              Not authorized
            </h2>
            <p style={{ color: '#6b7280' }}>
              You do not have permission to access this page.
            </p>
          </div>
        </div>
      );
    }

    // 500 → static error message
    return (
      <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{
          padding: '3rem 2rem',
          textAlign: 'center',
          border: '1px solid #e5e7eb',
          borderRadius: '0.5rem',
          backgroundColor: '#ffffff',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        }}>
          <div style={{
            fontSize: '3rem',
            marginBottom: '1rem',
            lineHeight: '1',
          }}>
            ⚠️
          </div>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: '600',
            color: '#111827',
            marginBottom: '0.5rem',
          }}>
            Unable to load profile
          </h2>
          <p style={{ color: '#6b7280' }}>
            An error occurred while loading your profile. Please try again later.
          </p>
        </div>
      </div>
    );
  }
}

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fetchInstructorPolicies } from '@/lib/instructorApi';
import type { InstructorPolicy } from '@/lib/instructorApi';
import PoliciesTable from '@/components/PoliciesTable';
import PolicyForm from '@/components/PolicyForm';

export default function PoliciesPage() {
  const router = useRouter();
  const [policies, setPolicies] = useState<InstructorPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingPolicy, setEditingPolicy] = useState<InstructorPolicy | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    loadPolicies();
  }, []);

  const loadPolicies = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchInstructorPolicies();
      setPolicies(data);
    } catch (err: any) {
      const status = err.status || 500;

      // 401 → redirect to login
      if (status === 401) {
        router.push('/login');
        return;
      }

      // 403 → static "Not authorized"
      if (status === 403) {
        setError('Not authorized');
        return;
      }

      // 500 → static error
      setError('Unable to load policies');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (policy: InstructorPolicy) => {
    setEditingPolicy(policy);
    setShowAddForm(false);
  };

  const handleAdd = () => {
    setShowAddForm(true);
    setEditingPolicy(null);
  };

  const handleCancel = () => {
    setShowAddForm(false);
    setEditingPolicy(null);
  };

  const handleSuccess = () => {
    window.location.reload();
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
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
            {error === 'Not authorized' ? 'Not authorized' : 'Unable to load policies'}
          </h2>
          {error !== 'Not authorized' && (
            <p style={{ color: '#6b7280' }}>
              An error occurred while loading policies. Please try again later.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.875rem', fontWeight: '600', color: '#111827', marginBottom: '1.5rem' }}>
        Rules & Policies
      </h1>

      {showAddForm || editingPolicy ? (
        <div style={{
          border: '1px solid #e5e7eb',
          borderRadius: '0.5rem',
          padding: '1.5rem',
          backgroundColor: '#ffffff',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
          marginBottom: '1.5rem',
        }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827', marginBottom: '1rem' }}>
            {editingPolicy ? 'Edit Policy' : 'Add Policy'}
          </h2>
          <PolicyForm
            policy={editingPolicy}
            existingPolicies={policies}
            onCancel={handleCancel}
            onSuccess={handleSuccess}
          />
        </div>
      ) : (
        <div style={{
          border: '1px solid #e5e7eb',
          borderRadius: '0.5rem',
          padding: '1.5rem',
          backgroundColor: '#ffffff',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        }}>
          <PoliciesTable
            policies={policies}
            onEdit={handleEdit}
            onAdd={handleAdd}
          />
        </div>
      )}
    </div>
  );
}

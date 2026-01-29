'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fetchAvailability, deactivateAvailability } from '@/lib/instructorApi';
import type { InstructorAvailability } from '@/lib/instructorApi';
import AvailabilityTable from '@/components/AvailabilityTable';
import AvailabilityForm from '@/components/AvailabilityForm';

export default function AvailabilityPage() {
  const router = useRouter();
  const [availability, setAvailability] = useState<InstructorAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingAvailability, setEditingAvailability] = useState<InstructorAvailability | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    loadAvailability();
  }, []);

  const loadAvailability = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchAvailability();
      setAvailability(data);
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
      setError('Unable to load availability');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item: InstructorAvailability) => {
    setEditingAvailability(item);
    setShowAddForm(false);
  };

  const handleAdd = () => {
    setShowAddForm(true);
    setEditingAvailability(null);
  };

  const handleCancel = () => {
    setShowAddForm(false);
    setEditingAvailability(null);
  };

  const handleSuccess = () => {
    window.location.reload();
  };

  const handleDeactivate = async (item: InstructorAvailability) => {
    try {
      await deactivateAvailability(item.id);
      window.location.reload();
    } catch (err: any) {
      setError(err.message || 'Failed to deactivate availability');
    }
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
            {error === 'Not authorized' ? 'Not authorized' : 'Unable to load availability'}
          </h2>
          {error !== 'Not authorized' && (
            <p style={{ color: '#6b7280' }}>
              An error occurred while loading availability. Please try again later.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.875rem', fontWeight: '600', color: '#111827', marginBottom: '1.5rem' }}>
        Availability
      </h1>

      {showAddForm || editingAvailability ? (
        <div style={{
          border: '1px solid #e5e7eb',
          borderRadius: '0.5rem',
          padding: '1.5rem',
          backgroundColor: '#ffffff',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
          marginBottom: '1.5rem',
        }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827', marginBottom: '1rem' }}>
            {editingAvailability ? 'Edit Availability' : 'Add Availability'}
          </h2>
          <AvailabilityForm
            availability={editingAvailability}
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
          <AvailabilityTable
            availability={availability}
            onEdit={handleEdit}
            onDeactivate={handleDeactivate}
            onAdd={handleAdd}
          />
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fetchInstructorServices } from '@/lib/instructorApi';
import type { InstructorService } from '@/lib/instructorApi';
import ServicesTable from '@/components/ServicesTable';
import ServiceForm from '@/components/ServiceForm';

export default function ServicesPage() {
  const router = useRouter();
  const [services, setServices] = useState<InstructorService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingService, setEditingService] = useState<InstructorService | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchInstructorServices();
      setServices(data);
    } catch (err: any) {
      // Only redirect on actual 401 from API; network errors have no status
      if (typeof err?.status === 'number' && err.status === 401) {
        router.push('/instructor/login');
        return;
      }
      if (typeof err?.status === 'number' && err.status === 403) {
        setError('Not authorized');
        return;
      }
      setError(err?.message === 'Failed to fetch' ? 'Cannot reach API. Check connection.' : 'Unable to load services');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (service: InstructorService) => {
    setEditingService(service);
    setShowAddForm(false);
  };

  const handleAdd = () => {
    setShowAddForm(true);
    setEditingService(null);
  };

  const handleCancel = () => {
    setShowAddForm(false);
    setEditingService(null);
  };

  const handleSuccess = () => {
    window.location.reload();
  };

  if (loading && services.length === 0 && !error) {
    return (
      <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.875rem', fontWeight: '600', color: '#111827', marginBottom: '1.5rem' }}>
        Services & Pricing
      </h1>

      {error && (
        <div style={{
          padding: '0.75rem 1rem',
          marginBottom: '1.5rem',
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '0.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          fontSize: '0.875rem',
          color: '#991b1b',
        }}>
          <span>
            {error === 'Not authorized' ? 'Not authorized' : 'Couldn\'t load services. Check your connection and retry.'}
          </span>
          <button
            type="button"
            onClick={() => void loadServices()}
            style={{
              padding: '0.375rem 0.75rem',
              borderRadius: '0.375rem',
              border: '1px solid #f87171',
              background: '#fff',
              color: '#991b1b',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '0.8125rem',
            }}
          >
            Retry
          </button>
        </div>
      )}

      {showAddForm || editingService ? (
        <div style={{
          border: '1px solid #e5e7eb',
          borderRadius: '0.5rem',
          padding: '1.5rem',
          backgroundColor: '#ffffff',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
          marginBottom: '1.5rem',
        }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827', marginBottom: '1rem' }}>
            {editingService ? 'Edit Service' : 'Add Service'}
          </h2>
          <ServiceForm
            service={editingService}
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
          <ServicesTable
            services={services}
            onEdit={handleEdit}
            onAdd={handleAdd}
          />
        </div>
      )}
    </div>
  );
}

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
      const status = typeof err?.status === 'number' ? err.status : 0;
      const message = err?.message || '';
      if (status === 401) {
        setError('Session expired. Reload the page to retry.');
        return;
      }
      if (status === 403) {
        setError('Unauthorized: complete onboarding to access services.');
        return;
      }
      if (message === 'Failed to fetch') {
        setError('Unable to reach server. Check connection.');
      } else if (status === 502) {
        setError('API unavailable. Verify that the API server is running (port 3001).');
      } else if (status === 404) {
        setError('Instructor profile not found. Try reloading the page.');
      } else {
        setError(`Error loading services${status ? ` (${status})` : ''}: ${message || 'unknown error'}`);
      }
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
      <h1 style={{ fontSize: '1.875rem', fontWeight: '600', color: 'rgba(226, 232, 240, 0.95)', marginBottom: '1.5rem' }}>
        Services & Pricing
      </h1>

      {error && (
        <div style={{
          padding: '0.75rem 1rem',
          marginBottom: '1.5rem',
          backgroundColor: 'rgba(185,28,28,0.12)',
          border: '1px solid rgba(248,113,113,0.4)',
          borderRadius: '0.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          fontSize: '0.875rem',
          color: '#fca5a5',
        }}>
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void loadServices()}
            style={{
              padding: '0.375rem 0.75rem',
              borderRadius: '0.375rem',
              border: '1px solid rgba(248,113,113,0.4)',
              background: 'rgba(185,28,28,0.15)',
              color: '#fca5a5',
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
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '0.5rem',
          padding: '1.5rem',
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
          marginBottom: '1.5rem',
        }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: 'rgba(226, 232, 240, 0.95)', marginBottom: '1rem' }}>
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
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '0.5rem',
          padding: '1.5rem',
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
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

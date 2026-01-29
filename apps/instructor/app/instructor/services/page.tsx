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
      setError('Unable to load services');
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
            {error === 'Not authorized' ? 'Not authorized' : 'Unable to load services'}
          </h2>
          {error !== 'Not authorized' && (
            <p style={{ color: '#6b7280' }}>
              An error occurred while loading services. Please try again later.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.875rem', fontWeight: '600', color: '#111827', marginBottom: '1.5rem' }}>
        Services & Pricing
      </h1>

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

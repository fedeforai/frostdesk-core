'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  createInstructorBooking,
  fetchInstructorCustomers,
  createInstructorCustomer,
  type InstructorCustomerListItem,
} from '@/lib/instructorApi';

const DEBOUNCE_MS = 250;

function displayLabel(c: InstructorCustomerListItem): string {
  if (c.display_name?.trim()) return c.display_name.trim();
  const phone = c.phone_number?.trim();
  if (phone) {
    if (phone.length <= 6) return `•••${phone.slice(-4)}`;
    return `${phone.slice(0, 4)}•••${phone.slice(-4)}`;
  }
  return c.id.slice(0, 8);
}

export function BookingForm() {
  const router = useRouter();
  const [customerSearch, setCustomerSearch] = useState('');
  const [customers, setCustomers] = useState<InstructorCustomerListItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<InstructorCustomerListItem | null>(null);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [addCustomerPhone, setAddCustomerPhone] = useState('');
  const [addCustomerName, setAddCustomerName] = useState('');
  const [customersLoading, setCustomersLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [addingCustomer, setAddingCustomer] = useState(false);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCustomers = useCallback(async (params?: { search?: string; limit?: number }) => {
    try {
      const res = await fetchInstructorCustomers({ limit: params?.limit ?? 50, search: params?.search });
      setCustomers(Array.isArray(res?.items) ? res.items : []);
    } catch {
      setCustomers([]);
    } finally {
      setCustomersLoading(false);
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    const trimmed = customerSearch.trim();
    if (trimmed === '') {
      setSearching(true);
      loadCustomers({ limit: 50 });
      return;
    }
    setSearching(true);
    const t = setTimeout(() => loadCustomers({ search: trimmed, limit: 20 }), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [customerSearch, loadCustomers]);

  const handleSelectCustomer = useCallback((c: InstructorCustomerListItem) => {
    setSelectedCustomerId(c.id);
    setSelectedCustomer(c);
    setCustomerSearch('');
    setCustomers([]);
  }, []);

  const handleClearCustomer = useCallback(() => {
    setSelectedCustomerId(null);
    setSelectedCustomer(null);
    setCustomerSearch('');
    setCustomers([]);
    setError(null);
    loadCustomers({ limit: 50 });
  }, [loadCustomers]);

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    const phone = addCustomerPhone.trim();
    if (!phone) {
      setError('Phone number is required');
      return;
    }
    setAddingCustomer(true);
    setError(null);
    try {
      const res = await createInstructorCustomer({
        phoneNumber: phone,
        displayName: addCustomerName.trim() || undefined,
        source: 'manual',
      });
      const c = res.customer;
      const item: InstructorCustomerListItem = {
        id: res.id || (c && (c as any).id) || '',
        phone_number: (c && (c as any).phone_number) ?? phone,
        display_name: ((c && (c as any).display_name) ?? addCustomerName.trim()) || null,
        last_seen_at: (c && (c as any).last_seen_at) ?? null,
        first_seen_at: (c && (c as any).first_seen_at) ?? null,
        notes_count: (c && (c as any).notes_count) ?? null,
        value_score: (c && (c as any).value_score) ?? null,
      };
      setSelectedCustomerId(item.id);
      setSelectedCustomer(item);
      setAddCustomerPhone('');
      setAddCustomerName('');
      setShowAddCustomer(false);
      loadCustomers({ limit: 50 });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create customer');
    } finally {
      setAddingCustomer(false);
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!selectedCustomerId || !selectedCustomer) {
      setError('Select or create a customer first');
      return;
    }
    const start = new Date(startTime);
    const end = new Date(endTime);
    if (start.getTime() >= end.getTime()) {
      setError('Start must be before end');
      return;
    }
    setLoading(true);
    try {
      await createInstructorBooking({
        customerId: selectedCustomerId,
        startTime,
        endTime,
        notes: notes.trim() || undefined,
      });
      router.push('/instructor/bookings');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create booking');
    } finally {
      setLoading(false);
    }
  }

  const formStyles = {
    section: { marginBottom: '1rem' },
    label: { display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' },
    input: { width: '100%', maxWidth: 320, padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: 6 },
    textarea: { width: '100%', maxWidth: 320, padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: 6, minHeight: 80 },
    btn: { padding: '0.5rem 1rem', borderRadius: 6, background: '#111827', color: '#fff', border: 0, cursor: 'pointer', fontSize: '0.875rem' },
    btnSecondary: { padding: '0.5rem 1rem', borderRadius: 6, background: '#e5e7eb', color: '#374151', border: 0, cursor: 'pointer', fontSize: '0.875rem', marginLeft: '0.5rem' },
    list: { marginTop: '0.25rem', border: '1px solid #e5e7eb', borderRadius: 6, maxHeight: 200, overflow: 'auto', background: '#fff', listStyle: 'none' as const, padding: 0, margin: 0 },
    listItem: { padding: 0, borderBottom: '1px solid #f3f4f6' },
    listButton: { width: '100%', padding: '0.5rem 0.75rem', textAlign: 'left' as const, border: 0, background: 'transparent', cursor: 'pointer', fontSize: '0.875rem' },
    listButtonSelected: { width: '100%', padding: '0.5rem 0.75rem', textAlign: 'left' as const, border: 0, background: '#eff6ff', cursor: 'pointer', fontSize: '0.875rem' },
    secondary: { fontSize: '0.75rem', color: '#6b7280', marginTop: '0.125rem' },
    panel: { marginTop: '0.5rem', padding: '1rem', border: '1px solid #e5e7eb', borderRadius: 6, background: '#f9fafb' },
  };

  const hasSearched = customerSearch.trim().length > 0;
  const showList = customers;

  return (
    <>
      <form onSubmit={handleSubmit}>
        <div style={formStyles.section}>
          <label style={formStyles.label}>Customer *</label>
          {selectedCustomer ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.875rem' }}>Selected: {displayLabel(selectedCustomer)}</span>
              <button type="button" onClick={handleClearCustomer} style={{ ...formStyles.btnSecondary, marginLeft: 0, padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}>
                Change customer
              </button>
            </div>
          ) : (
            <>
              <input
                type="text"
                placeholder="Search by name or phone..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                style={formStyles.input}
                aria-label="Search customers"
              />
              {(customersLoading || searching) && <p style={{ marginTop: '0.25rem', fontSize: '0.8rem', color: '#6b7280' }}>Searching…</p>}
              {!customersLoading && !searching && hasSearched && customers.length === 0 && <p style={{ marginTop: '0.25rem', fontSize: '0.8rem', color: '#6b7280' }}>No customers found</p>}
              {showList.length > 0 && (
                <ul style={formStyles.list}>
                  {showList.slice(0, 20).map((c) => (
                    <li key={c.id} style={formStyles.listItem}>
                      <button
                        type="button"
                        style={selectedCustomerId === c.id ? formStyles.listButtonSelected : formStyles.listButton}
                        onClick={() => handleSelectCustomer(c)}
                      >
                        <div>{displayLabel(c)}</div>
                        {c.display_name?.trim() && c.phone_number?.trim() && <div style={formStyles.secondary}>{c.phone_number}</div>}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <button type="button" onClick={() => setShowAddCustomer(true)} style={{ ...formStyles.btnSecondary, marginTop: '0.5rem' }}>
                Add customer
              </button>

              {showAddCustomer && (
                <div style={formStyles.panel}>
                  <p style={{ margin: '0 0 0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Create customer</p>
                  <form onSubmit={handleAddCustomer}>
                    <div style={formStyles.section}>
                      <label style={formStyles.label}>Phone number *</label>
                      <input
                        type="text"
                        placeholder="+39..."
                        value={addCustomerPhone}
                        onChange={(e) => setAddCustomerPhone(e.target.value)}
                        style={formStyles.input}
                        required
                      />
                    </div>
                    <div style={formStyles.section}>
                      <label style={formStyles.label}>Display name (optional)</label>
                      <input type="text" placeholder="Name" value={addCustomerName} onChange={(e) => setAddCustomerName(e.target.value)} style={formStyles.input} />
                    </div>
                    {error && <p style={{ color: '#b91c1c', fontSize: '0.875rem', marginBottom: '0.5rem' }}>{error}</p>}
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button type="submit" disabled={addingCustomer || !addCustomerPhone.trim()} style={formStyles.btn}>
                        {addingCustomer ? 'Creating customer…' : 'Create customer'}
                      </button>
                      <button type="button" onClick={() => { setShowAddCustomer(false); setError(null); }} disabled={addingCustomer} style={formStyles.btnSecondary}>
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </>
          )}
        </div>

        <div style={formStyles.section}>
          <label style={formStyles.label}>Start time *</label>
          <input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} required style={formStyles.input} />
        </div>
        <div style={formStyles.section}>
          <label style={formStyles.label}>End time *</label>
          <input type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} required style={formStyles.input} />
        </div>
        <div style={formStyles.section}>
          <label style={formStyles.label}>Notes (optional)</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} style={formStyles.textarea} />
        </div>

        {error && <p style={{ color: '#b91c1c', fontSize: '0.875rem', marginBottom: '0.5rem' }}>{error}</p>}

        <button type="submit" disabled={loading || !selectedCustomerId} style={formStyles.btn}>
          {loading ? 'Creating…' : 'Create booking'}
        </button>
      </form>
    </>
  );
}

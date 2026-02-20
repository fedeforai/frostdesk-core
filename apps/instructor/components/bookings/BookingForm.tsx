'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  createInstructorBooking,
  fetchInstructorCustomers,
  createInstructorCustomer,
  fetchInstructorServices,
  fetchInstructorMeetingPoints,
  type InstructorCustomerListItem,
  type InstructorService,
  type InstructorMeetingPoint,
} from '@/lib/instructorApi';

const DEBOUNCE_MS = 250;

const SKILL_LEVELS = [
  { value: '', label: 'Not specified' },
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'mixed', label: 'Mixed group' },
  { value: 'unknown', label: 'Unknown' },
] as const;

const CURRENCIES = [
  { value: 'eur', label: 'EUR', symbol: '\u20AC' },
  { value: 'gbp', label: 'GBP', symbol: '\u00A3' },
  { value: 'chf', label: 'CHF', symbol: 'CHF' },
] as const;

function displayLabel(c: InstructorCustomerListItem): string {
  if (c.display_name?.trim()) return c.display_name.trim();
  const phone = c.phone_number?.trim();
  if (phone) {
    if (phone.length <= 6) return `\u2022\u2022\u2022${phone.slice(-4)}`;
    return `${phone.slice(0, 4)}\u2022\u2022\u2022${phone.slice(-4)}`;
  }
  return c.id.slice(0, 8);
}

function computeDurationMinutes(start: string, end: string): number | null {
  if (!start || !end) return null;
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  if (Number.isNaN(s) || Number.isNaN(e) || e <= s) return null;
  return Math.round((e - s) / 60_000);
}

function formatDateTime(value: string): string {
  if (!value) return '\u2014';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '\u2014';
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(d);
  } catch {
    return d.toLocaleString();
  }
}

function formatAmount(cents: number | null, currency: string): string {
  if (cents == null) return '\u2014';
  const cur = CURRENCIES.find((c) => c.value === currency);
  const sym = cur?.symbol ?? currency.toUpperCase();
  return `${sym} ${(cents / 100).toFixed(2)}`;
}

// ── Styles ──────────────────────────────────────────────────────────────────

const st = {
  section: { marginBottom: '1.25rem' } as React.CSSProperties,
  sectionTitle: {
    fontSize: '0.85rem',
    fontWeight: 600,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
    color: 'rgba(148, 163, 184, 0.8)',
    margin: '0 0 0.75rem',
  } as React.CSSProperties,
  label: {
    display: 'block',
    marginBottom: '0.3rem',
    fontSize: '0.8125rem',
    fontWeight: 500,
    color: 'rgba(226, 232, 240, 0.9)',
  } as React.CSSProperties,
  helper: {
    fontSize: '0.75rem',
    color: 'rgba(148, 163, 184, 0.7)',
    marginTop: '0.25rem',
  } as React.CSSProperties,
  input: {
    width: '100%',
    padding: '0.5rem 0.75rem',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: 6,
    background: 'rgba(15, 23, 42, 0.4)',
    color: 'inherit',
    fontSize: '0.875rem',
  } as React.CSSProperties,
  select: {
    width: '100%',
    padding: '0.5rem 0.75rem',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: 6,
    background: 'rgba(15, 23, 42, 0.4)',
    color: 'inherit',
    fontSize: '0.875rem',
    appearance: 'none' as const,
    backgroundImage:
      'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2712%27 height=%278%27 viewBox=%270 0 12 8%27%3E%3Cpath fill=%27%2394a3b8%27 d=%27M1 1l5 5 5-5%27/%3E%3C/svg%3E")',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 0.75rem center',
    paddingRight: '2rem',
  } as React.CSSProperties,
  textarea: {
    width: '100%',
    padding: '0.5rem 0.75rem',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: 6,
    background: 'rgba(15, 23, 42, 0.4)',
    color: 'inherit',
    fontSize: '0.875rem',
    minHeight: 80,
    resize: 'vertical' as const,
  } as React.CSSProperties,
  btn: {
    padding: '0.6rem 1.25rem',
    borderRadius: 6,
    background: 'rgba(99, 102, 241, 0.25)',
    color: 'rgba(165, 180, 252, 1)',
    border: '1px solid rgba(99, 102, 241, 0.45)',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: 500,
  } as React.CSSProperties,
  btnSecondary: {
    padding: '0.5rem 1rem',
    borderRadius: 6,
    background: 'rgba(255, 255, 255, 0.08)',
    color: 'rgba(226, 232, 240, 0.85)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    cursor: 'pointer',
    fontSize: '0.8125rem',
  } as React.CSSProperties,
  list: {
    marginTop: '0.375rem',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: 6,
    maxHeight: 200,
    overflow: 'auto',
    background: 'rgba(15, 23, 42, 0.6)',
    listStyle: 'none' as const,
    padding: 0,
    margin: '0.375rem 0 0',
  } as React.CSSProperties,
  listItem: {
    padding: 0,
    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
  } as React.CSSProperties,
  listBtn: {
    width: '100%',
    padding: '0.5rem 0.75rem',
    textAlign: 'left' as const,
    border: 0,
    background: 'transparent',
    color: 'inherit',
    cursor: 'pointer',
    fontSize: '0.8125rem',
  } as React.CSSProperties,
  listBtnSelected: {
    width: '100%',
    padding: '0.5rem 0.75rem',
    textAlign: 'left' as const,
    border: 0,
    background: 'rgba(59, 130, 246, 0.15)',
    color: 'inherit',
    cursor: 'pointer',
    fontSize: '0.8125rem',
  } as React.CSSProperties,
  phoneSub: {
    fontSize: '0.7rem',
    color: 'rgba(148, 163, 184, 0.7)',
    marginTop: '0.125rem',
  } as React.CSSProperties,
  panel: {
    marginTop: '0.75rem',
    padding: '1rem',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: 6,
    background: 'rgba(255, 255, 255, 0.03)',
  } as React.CSSProperties,
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.8125rem',
    padding: '0.4rem 0',
    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
  } as React.CSSProperties,
  summaryLabel: {
    color: 'rgba(148, 163, 184, 0.8)',
  } as React.CSSProperties,
  summaryValue: {
    color: 'rgba(226, 232, 240, 0.95)',
    textAlign: 'right' as const,
    maxWidth: '60%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  } as React.CSSProperties,
  banner: {
    padding: '1rem 1.25rem',
    borderRadius: 8,
    background: 'rgba(245, 158, 11, 0.08)',
    border: '1px solid rgba(245, 158, 11, 0.25)',
    marginBottom: '1.25rem',
  } as React.CSSProperties,
  bannerTitle: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: 'rgba(251, 191, 36, 0.95)',
    margin: '0 0 0.375rem',
  } as React.CSSProperties,
  bannerBody: {
    fontSize: '0.8125rem',
    color: 'rgba(226, 232, 240, 0.8)',
    margin: '0 0 0.75rem',
    lineHeight: 1.5,
  } as React.CSSProperties,
  errorText: {
    color: '#f87171',
    fontSize: '0.8125rem',
    margin: '0.375rem 0 0',
  } as React.CSSProperties,
  warningText: {
    color: 'rgba(251, 191, 36, 0.9)',
    fontSize: '0.75rem',
    margin: '0.25rem 0 0',
  } as React.CSSProperties,
  disabledBtn: {
    opacity: 0.5,
    cursor: 'not-allowed',
  } as React.CSSProperties,
  card: {
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: '1.5rem',
    background: 'rgba(255, 255, 255, 0.02)',
  } as React.CSSProperties,
  row2: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
  } as React.CSSProperties,
  row3: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: '16px',
  } as React.CSSProperties,
  divider: {
    borderTop: '1px solid rgba(255, 255, 255, 0.06)',
    margin: '1.25rem 0',
  } as React.CSSProperties,
};

// ── Component ───────────────────────────────────────────────────────────────

export function BookingForm() {
  const router = useRouter();

  // Customer
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

  // Schedule
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [durationOverride, setDurationOverride] = useState(false);
  const [durationMinutesInput, setDurationMinutesInput] = useState('');

  // Lesson details
  const [partySize, setPartySize] = useState('1');
  const [skillLevel, setSkillLevel] = useState('');

  // Service & Meeting point
  const [services, setServices] = useState<InstructorService[]>([]);
  const [meetingPoints, setMeetingPoints] = useState<InstructorMeetingPoint[]>([]);
  const [serviceId, setServiceId] = useState('');
  const [meetingPointId, setMeetingPointId] = useState('');

  // Pricing
  const [amountInput, setAmountInput] = useState('');
  const [currency, setCurrency] = useState('eur');

  // Notes
  const [notes, setNotes] = useState('');

  // Status
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [billingBlocked, setBillingBlocked] = useState(false);

  // ── Derived values ──────────────────────────────────────────────────────

  const computedDuration = computeDurationMinutes(startTime, endTime);
  const effectiveDuration = durationOverride
    ? (durationMinutesInput ? parseInt(durationMinutesInput, 10) : null)
    : computedDuration;

  const endBeforeStart =
    startTime && endTime && new Date(endTime).getTime() <= new Date(startTime).getTime();

  const parsedPartySize = parseInt(partySize, 10);
  const partySizeValid = Number.isFinite(parsedPartySize) && parsedPartySize >= 1 && parsedPartySize <= 20;

  const parsedAmount = amountInput ? Math.round(parseFloat(amountInput) * 100) : null;
  const amountValid = parsedAmount == null || (Number.isFinite(parsedAmount) && parsedAmount >= 0);

  const durationValid =
    effectiveDuration == null ||
    (Number.isFinite(effectiveDuration) && effectiveDuration >= 15 && effectiveDuration <= 480);

  // ── Data fetching ─────────────────────────────────────────────────────

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

  useEffect(() => {
    fetchInstructorServices().then(setServices).catch(() => setServices([]));
    fetchInstructorMeetingPoints().then(setMeetingPoints).catch(() => setMeetingPoints([]));
  }, []);

  // Auto-fill pricing from selected service
  useEffect(() => {
    if (!serviceId) return;
    const svc = services.find((s) => s.id === serviceId);
    if (!svc) return;
    if (!amountInput) {
      setAmountInput((svc.price_amount / 100).toFixed(2));
    }
    if (svc.currency) {
      setCurrency(svc.currency.toLowerCase());
    }
  }, [serviceId, services, amountInput]);

  // ── Handlers ──────────────────────────────────────────────────────────

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

  const handleAddCustomerClick = async () => {
    const phone = addCustomerPhone.trim();
    if (!phone) {
      setError('Phone number is required');
      return;
    }
    setAddingCustomer(true);
    setError(null);
    setBillingBlocked(false);
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
      if ((err as any)?.code === 'BILLING_BLOCKED') {
        setBillingBlocked(true);
        setError(null);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to create customer');
      }
    } finally {
      setAddingCustomer(false);
    }
  };

  const handlePhoneKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddCustomerClick();
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBillingBlocked(false);

    if (!selectedCustomerId || !selectedCustomer) {
      setError('Select or create a customer first');
      return;
    }
    if (endBeforeStart) {
      setError('End must be after start');
      return;
    }
    const start = new Date(startTime);
    const end = new Date(endTime);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      setError('Invalid date');
      return;
    }
    if (!partySizeValid) {
      setError('Group size must be between 1 and 20');
      return;
    }
    if (!durationValid) {
      setError('Duration must be between 15 and 480 minutes');
      return;
    }
    if (!amountValid) {
      setError('Amount must be a positive number');
      return;
    }

    setLoading(true);
    try {
      const result = await createInstructorBooking({
        customerId: selectedCustomerId,
        startTime,
        endTime,
        notes: notes.trim() || undefined,
        durationMinutes: effectiveDuration ?? undefined,
        partySize: parsedPartySize || undefined,
        skillLevel: skillLevel || undefined,
        serviceId: serviceId || undefined,
        meetingPointId: meetingPointId || undefined,
        amountCents: parsedAmount ?? undefined,
        currency: parsedAmount != null ? (currency as 'eur' | 'gbp' | 'chf') : undefined,
      });
      router.push(result?.id ? `/instructor/bookings/${result.id}` : '/instructor/bookings');
    } catch (err) {
      if ((err as any)?.code === 'BILLING_BLOCKED') {
        setBillingBlocked(true);
        setError(null);
      } else if ((err as any)?.code === 'PILOT_ONLY') {
        setBillingBlocked(true);
        setError(null);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to create booking');
      }
    } finally {
      setLoading(false);
    }
  }

  // ── Derived display values ────────────────────────────────────────────

  const hasSearched = customerSearch.trim().length > 0;
  const submitDisabled =
    loading || !selectedCustomerId || billingBlocked || !!endBeforeStart || !partySizeValid || !durationValid || !amountValid;

  const selectedServiceLabel = services.find((s) => s.id === serviceId)?.discipline ?? null;
  const selectedMeetingPointLabel = meetingPoints.find((m) => m.id === meetingPointId)?.name ?? null;

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <>
      <div
        className="bookingFormGrid"
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 320px',
          gap: '24px',
          alignItems: 'start',
        }}
      >
        {/* ── Left column: Form card ─────────────────────────────────── */}
        <div style={st.card}>
          <form onSubmit={handleSubmit}>
            {/* Billing/Pilot gate banner */}
            {billingBlocked && (
              <div style={st.banner}>
                <p style={st.bannerTitle}>Subscription required</p>
                <p style={st.bannerBody}>
                  Bookings are available on FrostDesk Pro. Start your subscription to enable this feature.
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => router.push('/instructor/settings')}
                    style={{
                      ...st.btn,
                      background: 'rgba(245, 158, 11, 0.2)',
                      borderColor: 'rgba(245, 158, 11, 0.4)',
                      color: 'rgba(251, 191, 36, 1)',
                    }}
                  >
                    Start subscription
                  </button>
                  <a
                    href="mailto:support@frostdesk.ai"
                    style={{ fontSize: '0.8125rem', color: 'rgba(148, 163, 184, 0.8)', textDecoration: 'underline' }}
                  >
                    Contact support
                  </a>
                </div>
              </div>
            )}

            {/* ── Customer ─────────────────────────────────────────── */}
            <div style={st.section}>
              <p style={st.sectionTitle}>Customer</p>
              {selectedCustomer ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.875rem' }}>
                    Selected: <strong>{displayLabel(selectedCustomer)}</strong>
                  </span>
                  <button type="button" onClick={handleClearCustomer} style={st.btnSecondary}>
                    Change
                  </button>
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    placeholder="Search by name or phone"
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    style={st.input}
                    aria-label="Search customers"
                  />
                  {(customersLoading || searching) && (
                    <p style={st.helper}>Searching...</p>
                  )}
                  {!customersLoading && !searching && hasSearched && customers.length === 0 && (
                    <p style={st.helper}>No customers found</p>
                  )}
                  {customers.length > 0 && (
                    <ul style={st.list}>
                      {customers.slice(0, 20).map((c) => (
                        <li key={c.id} style={st.listItem}>
                          <button
                            type="button"
                            style={selectedCustomerId === c.id ? st.listBtnSelected : st.listBtn}
                            onClick={() => handleSelectCustomer(c)}
                          >
                            <div>{displayLabel(c)}</div>
                            {c.display_name?.trim() && c.phone_number?.trim() && (
                              <div style={st.phoneSub}>{c.phone_number}</div>
                            )}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowAddCustomer(true)}
                    style={{ ...st.btnSecondary, marginTop: '0.5rem' }}
                  >
                    New customer
                  </button>

                  {showAddCustomer && (
                    <div style={st.panel}>
                      <p style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', fontWeight: 600 }}>
                        Create customer
                      </p>
                      <div style={st.section}>
                        <label style={st.label}>Phone number *</label>
                        <input
                          type="text"
                          placeholder="+39..."
                          value={addCustomerPhone}
                          onChange={(e) => setAddCustomerPhone(e.target.value)}
                          onKeyDown={handlePhoneKeyDown}
                          style={st.input}
                        />
                      </div>
                      <div style={st.section}>
                        <label style={st.label}>Name (optional)</label>
                        <input
                          type="text"
                          placeholder="Name"
                          value={addCustomerName}
                          onChange={(e) => setAddCustomerName(e.target.value)}
                          style={st.input}
                        />
                      </div>
                      {error && <p style={st.errorText}>{error}</p>}
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                        <button
                          type="button"
                          onClick={handleAddCustomerClick}
                          disabled={addingCustomer || !addCustomerPhone.trim()}
                          style={{
                            ...st.btn,
                            ...(addingCustomer || !addCustomerPhone.trim() ? st.disabledBtn : {}),
                          }}
                        >
                          {addingCustomer ? 'Creating...' : 'Create customer'}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setShowAddCustomer(false); setError(null); }}
                          disabled={addingCustomer}
                          style={st.btnSecondary}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div style={st.divider} />

            {/* ── Schedule ─────────────────────────────────────────── */}
            <div style={st.section}>
              <p style={st.sectionTitle}>Schedule</p>
              <div style={st.row2}>
                <div>
                  <label style={st.label}>Start *</label>
                  <input
                    type="datetime-local"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    required
                    style={st.input}
                  />
                </div>
                <div>
                  <label style={st.label}>End *</label>
                  <input
                    type="datetime-local"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    required
                    style={st.input}
                  />
                  {endBeforeStart && (
                    <p style={st.warningText}>End must be after start</p>
                  )}
                </div>
              </div>
              {computedDuration != null && !durationOverride && (
                <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.85rem', color: 'rgba(148, 163, 184, 0.9)' }}>
                    Duration: {computedDuration} min
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setDurationOverride(true);
                      setDurationMinutesInput(String(computedDuration));
                    }}
                    style={{ ...st.btnSecondary, padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}
                  >
                    Override
                  </button>
                </div>
              )}
              {durationOverride && (
                <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <label style={{ ...st.label, margin: 0, whiteSpace: 'nowrap' }}>Duration (min)</label>
                  <input
                    type="number"
                    min={15}
                    max={480}
                    value={durationMinutesInput}
                    onChange={(e) => setDurationMinutesInput(e.target.value)}
                    style={{ ...st.input, width: '100px' }}
                  />
                  <button
                    type="button"
                    onClick={() => { setDurationOverride(false); setDurationMinutesInput(''); }}
                    style={{ ...st.btnSecondary, padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}
                  >
                    Auto
                  </button>
                  {!durationValid && (
                    <span style={{ ...st.warningText, margin: 0 }}>15–480</span>
                  )}
                </div>
              )}
            </div>

            <div style={st.divider} />

            {/* ── Lesson details ───────────────────────────────────── */}
            <div style={st.section}>
              <p style={st.sectionTitle}>Lesson details</p>
              <div style={st.row2}>
                <div>
                  <label style={st.label}>Group size</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={partySize}
                    onChange={(e) => setPartySize(e.target.value)}
                    style={st.input}
                  />
                  {!partySizeValid && partySize !== '' && (
                    <p style={st.warningText}>1–20 participants</p>
                  )}
                </div>
                <div>
                  <label style={st.label}>Skill level</label>
                  <select
                    value={skillLevel}
                    onChange={(e) => setSkillLevel(e.target.value)}
                    style={st.select}
                  >
                    {SKILL_LEVELS.map((sl) => (
                      <option key={sl.value} value={sl.value}>{sl.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div style={st.divider} />

            {/* ── Service & Meeting point ──────────────────────────── */}
            <div style={st.section}>
              <p style={st.sectionTitle}>Service & Location</p>
              <div style={st.row2}>
                <div>
                  <label style={st.label}>Service</label>
                  {services.length > 0 ? (
                    <select
                      value={serviceId}
                      onChange={(e) => setServiceId(e.target.value)}
                      style={st.select}
                    >
                      <option value="">None</option>
                      {services.filter((s) => s.is_active).map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.discipline} — {s.duration_minutes}min — {(s.price_amount / 100).toFixed(2)} {s.currency.toUpperCase()}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p style={st.helper}>No services configured yet</p>
                  )}
                </div>
                <div>
                  <label style={st.label}>Meeting point</label>
                  {meetingPoints.length > 0 ? (
                    <select
                      value={meetingPointId}
                      onChange={(e) => setMeetingPointId(e.target.value)}
                      style={st.select}
                    >
                      <option value="">None</option>
                      {meetingPoints.map((mp) => (
                        <option key={mp.id} value={mp.id}>
                          {mp.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p style={st.helper}>No meeting points configured yet</p>
                  )}
                </div>
              </div>
            </div>

            <div style={st.divider} />

            {/* ── Pricing ──────────────────────────────────────────── */}
            <div style={st.section}>
              <p style={st.sectionTitle}>Pricing</p>
              <div style={st.row2}>
                <div>
                  <label style={st.label}>Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="e.g. 49.00"
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value)}
                    style={st.input}
                  />
                  {!amountValid && (
                    <p style={st.warningText}>Must be a positive number</p>
                  )}
                </div>
                <div>
                  <label style={st.label}>Currency</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    style={st.select}
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.symbol} {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <p style={st.helper}>
                Optional. You can generate a Stripe payment link after creation.
              </p>
            </div>

            <div style={st.divider} />

            {/* ── Notes ────────────────────────────────────────────── */}
            <div style={st.section}>
              <p style={st.sectionTitle}>Notes</p>
              <label style={st.label}>Internal notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add internal notes (not visible to the customer)"
                style={st.textarea}
              />
              <p style={st.helper}>Not visible to customer</p>
            </div>

            {/* Error */}
            {error && !showAddCustomer && (
              <p style={{ ...st.errorText, marginBottom: '0.75rem' }}>{error}</p>
            )}

            {/* CTA area */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '1.5rem' }}>
              <button
                type="submit"
                disabled={submitDisabled}
                style={{
                  ...st.btn,
                  flex: 1,
                  fontWeight: 600,
                  ...(submitDisabled ? st.disabledBtn : {}),
                }}
              >
                {loading ? 'Creating\u2026' : 'Create booking'}
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                style={st.btnSecondary}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>

        {/* ── Right column: Sticky summary card ──────────────────────── */}
        <aside
          style={{
            position: 'sticky',
            top: 96,
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 12,
            padding: '1.25rem',
            background: 'rgba(255, 255, 255, 0.02)',
          }}
        >
          <p style={{ ...st.sectionTitle, margin: '0 0 0.75rem' }}>Summary</p>

          <div style={st.summaryRow}>
            <span style={st.summaryLabel}>Customer</span>
            <span style={st.summaryValue}>
              {selectedCustomer ? displayLabel(selectedCustomer) : 'Not selected'}
            </span>
          </div>
          <div style={st.summaryRow}>
            <span style={st.summaryLabel}>Start</span>
            <span style={st.summaryValue}>{formatDateTime(startTime)}</span>
          </div>
          <div style={st.summaryRow}>
            <span style={st.summaryLabel}>End</span>
            <span style={st.summaryValue}>{formatDateTime(endTime)}</span>
          </div>
          <div style={st.summaryRow}>
            <span style={st.summaryLabel}>Duration</span>
            <span style={st.summaryValue}>
              {effectiveDuration != null ? `${effectiveDuration} min` : '\u2014'}
            </span>
          </div>
          <div style={st.summaryRow}>
            <span style={st.summaryLabel}>Group size</span>
            <span style={st.summaryValue}>
              {parsedPartySize > 0 ? parsedPartySize : '\u2014'}
            </span>
          </div>
          <div style={st.summaryRow}>
            <span style={st.summaryLabel}>Skill level</span>
            <span style={st.summaryValue}>
              {skillLevel ? SKILL_LEVELS.find((s) => s.value === skillLevel)?.label ?? skillLevel : '\u2014'}
            </span>
          </div>
          {selectedServiceLabel && (
            <div style={st.summaryRow}>
              <span style={st.summaryLabel}>Service</span>
              <span style={st.summaryValue}>{selectedServiceLabel}</span>
            </div>
          )}
          {selectedMeetingPointLabel && (
            <div style={st.summaryRow}>
              <span style={st.summaryLabel}>Location</span>
              <span style={st.summaryValue}>{selectedMeetingPointLabel}</span>
            </div>
          )}
          <div style={st.summaryRow}>
            <span style={st.summaryLabel}>Price</span>
            <span style={st.summaryValue}>
              {parsedAmount != null ? formatAmount(parsedAmount, currency) : '\u2014'}
            </span>
          </div>
          <div style={{ ...st.summaryRow, borderBottom: 'none' }}>
            <span style={st.summaryLabel}>Notes</span>
            <span style={st.summaryValue}>
              {notes.trim() ? 'Added' : '\u2014'}
            </span>
          </div>

          <div style={{ marginTop: '1rem', fontSize: '0.85rem', color: 'rgba(148, 163, 184, 0.9)' }}>
            <div>Status: Draft</div>
            <div style={{ marginTop: 4 }}>
              Next step: Generate payment link after creation.
            </div>
          </div>
        </aside>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .bookingFormGrid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </>
  );
}

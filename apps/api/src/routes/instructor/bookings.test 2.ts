/**
 * Loop 2: Instructor booking actions — minimal API tests.
 * Allowed/forbidden transitions and ownership (404 when not found or not owner).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import Fastify from 'fastify';
import { instructorBookingRoutes } from './bookings.js';

const mockGetUserIdFromJwt = vi.fn();
const mockGetInstructorProfileDefinitiveByUserId = vi.fn();
const mockGetInstructorProfileByUserId = vi.fn();
const mockGetBookingByIdWithExpiryCheck = vi.fn();
const mockUpdateBookingState = vi.fn();
const mockRecordBookingAudit = vi.fn();
const mockTransitionBookingState = vi.fn();
const mockUpdateBookingDetails = vi.fn();
const mockGetCustomerById = vi.fn();
const mockCreateBooking = vi.fn();

vi.mock('../../lib/auth_instructor.js', () => ({
  getUserIdFromJwt: (...args: unknown[]) => mockGetUserIdFromJwt(...args),
}));

vi.mock('@frostdesk/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@frostdesk/db')>();
  return {
    ...actual,
    getInstructorProfileDefinitiveByUserId: (...args: unknown[]) => mockGetInstructorProfileDefinitiveByUserId(...args),
    getInstructorProfileByUserId: (...args: unknown[]) => mockGetInstructorProfileByUserId(...args),
    getBookingByIdWithExpiryCheck: (...args: unknown[]) => mockGetBookingByIdWithExpiryCheck(...args),
    getCustomerById: (...args: unknown[]) => mockGetCustomerById(...args),
    createBooking: (...args: unknown[]) => mockCreateBooking(...args),
    updateBookingDetails: (...args: unknown[]) => mockUpdateBookingDetails(...args),
    updateBookingState: (...args: unknown[]) => mockUpdateBookingState(...args),
    recordBookingAudit: (...args: unknown[]) => mockRecordBookingAudit(...args),
    transitionBookingState: (...args: unknown[]) => mockTransitionBookingState(...args),
  };
});

const INSTRUCTOR_ID = 'instructor-1';
const BOOKING_ID = 'booking-1';

function buildApp() {
  const app = Fastify();
  app.register(instructorBookingRoutes);
  return app;
}

function mockAuthAndProfile(profileId: string = INSTRUCTOR_ID) {
  mockGetUserIdFromJwt.mockResolvedValue('user-id');
  mockGetInstructorProfileDefinitiveByUserId.mockResolvedValue(null);
  mockGetInstructorProfileByUserId.mockResolvedValue({ id: profileId });
}

function mockBooking(overrides: { status: string; instructor_id?: string } = { status: 'draft' }) {
  mockGetBookingByIdWithExpiryCheck.mockResolvedValue({
    id: BOOKING_ID,
    instructor_id: overrides.instructor_id ?? INSTRUCTOR_ID,
    status: overrides.status,
    created_at: new Date().toISOString(),
  });
}

function mockTransitionSuccess(nextStatus: string) {
  mockTransitionBookingState.mockReturnValue(nextStatus);
  mockUpdateBookingState.mockResolvedValue({
    id: BOOKING_ID,
    instructor_id: INSTRUCTOR_ID,
    status: nextStatus,
  });
  mockRecordBookingAudit.mockResolvedValue(undefined);
}

describe('POST /instructor/bookings/:id/submit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthAndProfile();
  });

  it('draft → pending OK', async () => {
    mockBooking({ status: 'draft' });
    mockTransitionSuccess('pending');
    const app = buildApp();

    const res = await app.inject({
      method: 'POST',
      url: `/instructor/bookings/${BOOKING_ID}/submit`,
      headers: { authorization: 'Bearer token' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ ok: true, booking: { status: 'pending' } });
    expect(mockTransitionBookingState).toHaveBeenCalledWith('draft', 'pending');
    await app.close();
  });

  it('pending → pending FAIL (invalid transition)', async () => {
    mockBooking({ status: 'pending' });
    mockTransitionBookingState.mockImplementation(() => {
      throw Object.assign(new Error('Invalid transition'), { code: 'INVALID_BOOKING_TRANSITION' });
    });
    const app = buildApp();

    const res = await app.inject({
      method: 'POST',
      url: `/instructor/bookings/${BOOKING_ID}/submit`,
      headers: { authorization: 'Bearer token' },
    });

    expect(res.statusCode).toBe(409);
    expect(res.json()).toMatchObject({ ok: false, error: 'INVALID_BOOKING_TRANSITION' });
    await app.close();
  });
});

describe('POST /instructor/bookings/:id/accept', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthAndProfile();
  });

  it('pending → confirmed OK', async () => {
    mockBooking({ status: 'pending' });
    mockTransitionSuccess('confirmed');
    const app = buildApp();

    const res = await app.inject({
      method: 'POST',
      url: `/instructor/bookings/${BOOKING_ID}/accept`,
      headers: { authorization: 'Bearer token' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ ok: true, booking: { status: 'confirmed' } });
    expect(mockTransitionBookingState).toHaveBeenCalledWith('pending', 'confirmed');
    await app.close();
  });

  it('draft → confirmed FAIL', async () => {
    mockBooking({ status: 'draft' });
    mockTransitionBookingState.mockImplementation(() => {
      throw Object.assign(new Error('Invalid transition'), { code: 'INVALID_BOOKING_TRANSITION' });
    });
    const app = buildApp();

    const res = await app.inject({
      method: 'POST',
      url: `/instructor/bookings/${BOOKING_ID}/accept`,
      headers: { authorization: 'Bearer token' },
    });

    expect(res.statusCode).toBe(409);
    expect(res.json()).toMatchObject({ ok: false, error: 'INVALID_BOOKING_TRANSITION' });
    await app.close();
  });
});

describe('POST /instructor/bookings/:id/reject', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthAndProfile();
  });

  it('pending → declined OK', async () => {
    mockBooking({ status: 'pending' });
    mockTransitionSuccess('declined');
    const app = buildApp();

    const res = await app.inject({
      method: 'POST',
      url: `/instructor/bookings/${BOOKING_ID}/reject`,
      headers: { authorization: 'Bearer token' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ ok: true, booking: { status: 'declined' } });
    expect(mockTransitionBookingState).toHaveBeenCalledWith('pending', 'declined');
    await app.close();
  });
});

describe('POST /instructor/bookings/:id/modify', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthAndProfile();
  });

  it('confirmed → modified OK', async () => {
    mockBooking({ status: 'confirmed' });
    mockTransitionSuccess('modified');
    const app = buildApp();

    const res = await app.inject({
      method: 'POST',
      url: `/instructor/bookings/${BOOKING_ID}/modify`,
      headers: { authorization: 'Bearer token' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ ok: true, booking: { status: 'modified' } });
    expect(mockTransitionBookingState).toHaveBeenCalledWith('confirmed', 'modified');
    await app.close();
  });

  it('pending → modified FAIL', async () => {
    mockBooking({ status: 'pending' });
    mockTransitionBookingState.mockImplementation(() => {
      throw Object.assign(new Error('Invalid transition'), { code: 'INVALID_BOOKING_TRANSITION' });
    });
    const app = buildApp();

    const res = await app.inject({
      method: 'POST',
      url: `/instructor/bookings/${BOOKING_ID}/modify`,
      headers: { authorization: 'Bearer token' },
    });

    expect(res.statusCode).toBe(409);
    expect(res.json()).toMatchObject({ ok: false, error: 'INVALID_BOOKING_TRANSITION' });
    await app.close();
  });
});

describe('POST /instructor/bookings/:id/cancel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthAndProfile();
  });

  it('modified → cancelled OK', async () => {
    mockBooking({ status: 'modified' });
    mockTransitionSuccess('cancelled');
    const app = buildApp();

    const res = await app.inject({
      method: 'POST',
      url: `/instructor/bookings/${BOOKING_ID}/cancel`,
      headers: { authorization: 'Bearer token' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ ok: true, booking: { status: 'cancelled' } });
    expect(mockTransitionBookingState).toHaveBeenCalledWith('modified', 'cancelled');
    await app.close();
  });

  it('pending → cancelled FAIL', async () => {
    mockBooking({ status: 'pending' });
    mockTransitionBookingState.mockImplementation(() => {
      throw Object.assign(new Error('Invalid transition'), { code: 'INVALID_BOOKING_TRANSITION' });
    });
    const app = buildApp();

    const res = await app.inject({
      method: 'POST',
      url: `/instructor/bookings/${BOOKING_ID}/cancel`,
      headers: { authorization: 'Bearer token' },
    });

    expect(res.statusCode).toBe(409);
    expect(res.json()).toMatchObject({ ok: false, error: 'INVALID_BOOKING_TRANSITION' });
    await app.close();
  });
});

describe('ownership', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthAndProfile(INSTRUCTOR_ID);
  });

  it('booking not found or not owner → 404', async () => {
    mockGetBookingByIdWithExpiryCheck.mockResolvedValue(null);
    const app = buildApp();

    const res = await app.inject({
      method: 'POST',
      url: `/instructor/bookings/${BOOKING_ID}/submit`,
      headers: { authorization: 'Bearer token' },
    });

    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({ ok: false, error: 'BOOKING_NOT_FOUND' });
    await app.close();
  });

  it('instructor not owner (booking returned with different instructor_id) → 403', async () => {
    mockGetBookingByIdWithExpiryCheck.mockResolvedValue({
      id: BOOKING_ID,
      instructor_id: 'other-instructor',
      status: 'draft',
      created_at: new Date().toISOString(),
    });
    const app = buildApp();

    const res = await app.inject({
      method: 'POST',
      url: `/instructor/bookings/${BOOKING_ID}/submit`,
      headers: { authorization: 'Bearer token' },
    });

    expect(res.statusCode).toBe(403);
    expect(res.json()).toMatchObject({ ok: false, error: 'FORBIDDEN' });
    await app.close();
  });
});

describe('PATCH /instructor/bookings/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthAndProfile();
  });

  it('empty body returns current booking (no update)', async () => {
    const current = {
      id: BOOKING_ID,
      instructor_id: INSTRUCTOR_ID,
      status: 'draft',
      customer_name: 'Jane',
      start_time: '2025-02-10T10:00:00Z',
      end_time: '2025-02-10T11:00:00Z',
      notes: null,
      created_at: new Date().toISOString(),
    };
    mockBooking({ status: 'draft' });
    mockGetBookingByIdWithExpiryCheck.mockResolvedValue(current);
    const app = buildApp();

    const res = await app.inject({
      method: 'PATCH',
      url: `/instructor/bookings/${BOOKING_ID}`,
      headers: { authorization: 'Bearer token', 'content-type': 'application/json' },
      payload: {},
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ id: BOOKING_ID, status: 'draft', customer_name: 'Jane' });
    expect(mockUpdateBookingDetails).not.toHaveBeenCalled();
    await app.close();
  });

  it('valid patch (draft) returns updated booking, status unchanged', async () => {
    const current = {
      id: BOOKING_ID,
      instructor_id: INSTRUCTOR_ID,
      status: 'draft',
      customer_name: 'Jane',
      start_time: '2025-02-10T10:00:00Z',
      end_time: '2025-02-10T11:00:00Z',
      notes: null,
      created_at: new Date().toISOString(),
    };
    mockGetBookingByIdWithExpiryCheck.mockResolvedValue(current);
    const updated = { ...current, notes: 'Updated' };
    mockUpdateBookingDetails.mockResolvedValue(updated);
    const app = buildApp();

    const res = await app.inject({
      method: 'PATCH',
      url: `/instructor/bookings/${BOOKING_ID}`,
      headers: { authorization: 'Bearer token', 'content-type': 'application/json' },
      payload: { notes: 'Updated' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ id: BOOKING_ID, status: 'draft', notes: 'Updated' });
    expect(mockUpdateBookingDetails).toHaveBeenCalledWith(BOOKING_ID, INSTRUCTOR_ID, expect.objectContaining({ notes: 'Updated' }));
    expect(mockTransitionBookingState).not.toHaveBeenCalled();
    await app.close();
  });

  it('confirmed + patch → status becomes modified, audit recorded', async () => {
    const current = {
      id: BOOKING_ID,
      instructor_id: INSTRUCTOR_ID,
      status: 'confirmed',
      customer_name: 'Jane',
      start_time: '2025-02-10T10:00:00Z',
      end_time: '2025-02-10T11:00:00Z',
      notes: null,
      created_at: new Date().toISOString(),
    };
    mockGetBookingByIdWithExpiryCheck.mockResolvedValue(current);
    const updatedDetails = { ...current, notes: 'Updated' };
    mockUpdateBookingDetails.mockResolvedValue(updatedDetails);
    mockTransitionBookingState.mockReturnValue('modified');
    mockUpdateBookingState.mockResolvedValue({ ...updatedDetails, status: 'modified' });
    mockRecordBookingAudit.mockResolvedValue(undefined);
    const app = buildApp();

    const res = await app.inject({
      method: 'PATCH',
      url: `/instructor/bookings/${BOOKING_ID}`,
      headers: { authorization: 'Bearer token', 'content-type': 'application/json' },
      payload: { notes: 'Updated' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ id: BOOKING_ID, status: 'modified', notes: 'Updated' });
    expect(mockTransitionBookingState).toHaveBeenCalledWith('confirmed', 'modified');
    expect(mockRecordBookingAudit).toHaveBeenCalledWith({
      bookingId: BOOKING_ID,
      previousState: 'confirmed',
      newState: 'modified',
      actor: 'human',
    });
    expect(mockUpdateBookingState).toHaveBeenCalledWith(BOOKING_ID, 'modified');
    await app.close();
  });

  it('start_time >= end_time → 400', async () => {
    const current = {
      id: BOOKING_ID,
      instructor_id: INSTRUCTOR_ID,
      status: 'draft',
      customer_name: 'Jane',
      start_time: '2025-02-10T11:00:00Z',
      end_time: '2025-02-10T12:00:00Z',
      notes: null,
      created_at: new Date().toISOString(),
    };
    mockGetBookingByIdWithExpiryCheck.mockResolvedValue(current);
    const app = buildApp();

    const res = await app.inject({
      method: 'PATCH',
      url: `/instructor/bookings/${BOOKING_ID}`,
      headers: { authorization: 'Bearer token', 'content-type': 'application/json' },
      payload: { start_time: '2025-02-10T12:00:00Z', end_time: '2025-02-10T11:00:00Z' },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ ok: false, error: 'invalid_payload', message: expect.stringContaining('start_time') });
    expect(mockUpdateBookingDetails).not.toHaveBeenCalled();
    await app.close();
  });

  it('not owner → 403', async () => {
    mockGetBookingByIdWithExpiryCheck.mockResolvedValue({
      id: BOOKING_ID,
      instructor_id: 'other-instructor',
      status: 'draft',
      created_at: new Date().toISOString(),
    });
    const app = buildApp();

    const res = await app.inject({
      method: 'PATCH',
      url: `/instructor/bookings/${BOOKING_ID}`,
      headers: { authorization: 'Bearer token', 'content-type': 'application/json' },
      payload: { notes: 'Other' },
    });

    expect(res.statusCode).toBe(403);
    expect(res.json()).toMatchObject({ ok: false, error: 'FORBIDDEN' });
    expect(mockUpdateBookingDetails).not.toHaveBeenCalled();
    await app.close();
  });

  it('booking not found after load → 404', async () => {
    mockGetBookingByIdWithExpiryCheck.mockResolvedValue(null);
    const app = buildApp();

    const res = await app.inject({
      method: 'PATCH',
      url: `/instructor/bookings/${BOOKING_ID}`,
      headers: { authorization: 'Bearer token', 'content-type': 'application/json' },
      payload: { notes: 'X' },
    });

    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({ ok: false, error: 'BOOKING_NOT_FOUND' });
    await app.close();
  });

  it('PATCH with customer_id or customerName → 400 INVALID_PAYLOAD', async () => {
    mockGetBookingByIdWithExpiryCheck.mockResolvedValue({
      id: BOOKING_ID,
      instructor_id: INSTRUCTOR_ID,
      status: 'draft',
      customer_id: null,
      customer_name: 'Jane',
      start_time: '2025-02-10T10:00:00Z',
      end_time: '2025-02-10T11:00:00Z',
      notes: null,
      created_at: new Date().toISOString(),
    });
    const app = buildApp();

    const res = await app.inject({
      method: 'PATCH',
      url: `/instructor/bookings/${BOOKING_ID}`,
      headers: { authorization: 'Bearer token', 'content-type': 'application/json' },
      payload: { customer_id: '00000000-0000-4000-8000-000000000001' },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ ok: false, error: 'invalid_payload', message: expect.stringContaining('customer') });
    expect(mockUpdateBookingDetails).not.toHaveBeenCalled();
    await app.close();
  });
});

describe('POST /instructor/bookings (create)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthAndProfile();
  });

  it('missing customerId → 400', async () => {
    const app = buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/instructor/bookings',
      headers: { authorization: 'Bearer token', 'content-type': 'application/json' },
      payload: {
        start_time: '2025-02-10T10:00:00Z',
        end_time: '2025-02-10T11:00:00Z',
      },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ ok: false, error: 'MISSING_PARAMETERS', message: expect.stringContaining('customer_id') });
    expect(mockGetCustomerById).not.toHaveBeenCalled();
    expect(mockCreateBooking).not.toHaveBeenCalled();
    await app.close();
  });

  it('customerName without customerId → 400 CUSTOMER_REQUIRED', async () => {
    const app = buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/instructor/bookings',
      headers: { authorization: 'Bearer token', 'content-type': 'application/json' },
      payload: {
        customer_name: 'Mario Rossi',
        start_time: '2025-02-10T10:00:00Z',
        end_time: '2025-02-10T11:00:00Z',
      },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ ok: false, error: 'CUSTOMER_REQUIRED', message: 'Select or create a customer first' });
    expect(mockGetCustomerById).not.toHaveBeenCalled();
    expect(mockCreateBooking).not.toHaveBeenCalled();
    await app.close();
  });

  it('customerId not UUID → 400', async () => {
    const app = buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/instructor/bookings',
      headers: { authorization: 'Bearer token', 'content-type': 'application/json' },
      payload: {
        customer_id: 'not-a-uuid',
        start_time: '2025-02-10T10:00:00Z',
        end_time: '2025-02-10T11:00:00Z',
      },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ ok: false, error: 'invalid_payload' });
    expect(mockCreateBooking).not.toHaveBeenCalled();
    await app.close();
  });

  it('customerId of other instructor → 403', async () => {
    mockGetCustomerById.mockResolvedValue(null);
    const app = buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/instructor/bookings',
      headers: { authorization: 'Bearer token', 'content-type': 'application/json' },
      payload: {
        customer_id: '00000000-0000-4000-8000-000000000001',
        start_time: '2025-02-10T10:00:00Z',
        end_time: '2025-02-10T11:00:00Z',
      },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json()).toMatchObject({ ok: false, error: 'FORBIDDEN', message: expect.stringContaining('Customer') });
    expect(mockGetCustomerById).toHaveBeenCalledWith('00000000-0000-4000-8000-000000000001', INSTRUCTOR_ID);
    expect(mockCreateBooking).not.toHaveBeenCalled();
    await app.close();
  });

  it('valid customerId → 201', async () => {
    mockGetCustomerById.mockResolvedValue({
      id: '00000000-0000-4000-8000-000000000001',
      instructor_id: INSTRUCTOR_ID,
      display_name: 'Jane Doe',
      phone_number: '+39123456',
    });
    mockCreateBooking.mockResolvedValue({ id: 'new-booking-id' });
    const app = buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/instructor/bookings',
      headers: { authorization: 'Bearer token', 'content-type': 'application/json' },
      payload: {
        customer_id: '00000000-0000-4000-8000-000000000001',
        start_time: '2025-02-10T10:00:00Z',
        end_time: '2025-02-10T11:00:00Z',
      },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ id: 'new-booking-id' });
    expect(mockCreateBooking).toHaveBeenCalledWith(
      expect.objectContaining({
        instructorId: INSTRUCTOR_ID,
        customerId: '00000000-0000-4000-8000-000000000001',
        customerName: 'Jane Doe',
        startTime: '2025-02-10T10:00:00Z',
        endTime: '2025-02-10T11:00:00Z',
      })
    );
    await app.close();
  });
});

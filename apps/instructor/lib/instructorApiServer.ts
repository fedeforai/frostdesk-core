/**
 * Server-only data layer for instructor app.
 * Use in Server Components only. Session from getServerSession() (cookies).
 * Do not import this file from client components.
 *
 * Edge Functions must verify the Supabase Auth bearer server-side and enforce
 * instructor scoping (do not trust the client).
 */
import { getServerSession } from '@/lib/supabaseServer';
import type {
  InstructorInboxItem,
  FetchInstructorBookingsResponse,
  BookingAuditLogRow,
  BookingLifecycleReadModel,
  AIBookingSuggestionContext,
} from './instructorApi';

export type HttpError = Error & { status: number };

function httpError(message: string, status: number): never {
  const err = new Error(message) as HttpError;
  err.status = status;
  throw err;
}

function getSupabaseFunctionsUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error('NO_SUPABASE');
  return url.replace(/([^/])$/, '$1/') + 'functions/v1';
}

function getApiBaseUrl(): string {
  const base =
    process.env.NEXT_PUBLIC_API_URL ||
    /* deprecated: use NEXT_PUBLIC_API_URL only */ process.env.NEXT_PUBLIC_API_BASE_URL ||
    'http://localhost:3001';
  return base.replace(/\/+$/, '');
}

async function serverFetch(
  url: string,
  accessToken: string,
  options?: { method?: string; body?: string }
): Promise<Response> {
  return fetch(url, {
    method: options?.method ?? 'GET',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: options?.body,
  });
}

/** Instructor inbox (conversations). Uses Node API. */
export async function fetchInstructorInboxServer(): Promise<InstructorInboxItem[]> {
  const session = await getServerSession();
  if (!session?.user?.id) httpError('UNAUTHORIZED', 401);

  const token = session.access_token;
  if (!token) httpError('UNAUTHORIZED', 401);

  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/instructor/inbox`;

  const res = await serverFetch(url, token);
  if (res.status === 401) httpError('UNAUTHORIZED', 401);
  if (res.status === 403) httpError('ONBOARDING_REQUIRED', 403);
  if (!res.ok) httpError('FAILED_TO_LOAD_INBOX', res.status);

  const data = await res.json();
  return data?.ok && Array.isArray(data?.items) ? data.items : [];
}

/** All bookings for the instructor. Uses Node API (proxy-based). */
export async function fetchInstructorBookingsServer(): Promise<FetchInstructorBookingsResponse> {
  const session = await getServerSession();
  if (!session?.user?.id) httpError('UNAUTHORIZED', 401);

  const token = session.access_token;
  if (!token) httpError('UNAUTHORIZED', 401);

  const base = getApiBaseUrl();
  const url = `${base}/instructor/bookings`;

  const res = await serverFetch(url, token);
  if (res.status === 401) httpError('UNAUTHORIZED', 401);
  if (res.status === 403) httpError('ONBOARDING_REQUIRED', 403);
  if (res.status === 404) httpError('NOT_FOUND', 404);
  if (!res.ok) httpError('FAILED_TO_LOAD_BOOKINGS', res.status);
  return res.json();
}

/** Single booking by id. Uses Node API (proxy-based). */
export async function fetchInstructorBookingServer(id: string): Promise<any> {
  const session = await getServerSession();
  if (!session?.user?.id) httpError('UNAUTHORIZED', 401);

  const token = session.access_token;
  if (!token) httpError('UNAUTHORIZED', 401);

  const base = getApiBaseUrl();
  const url = `${base}/instructor/bookings/${encodeURIComponent(id)}`;

  const res = await serverFetch(url, token);
  if (res.status === 401) httpError('UNAUTHORIZED', 401);
  if (res.status === 403) httpError('ONBOARDING_REQUIRED', 403);
  if (res.status === 404) httpError('NOT_FOUND', 404);
  if (!res.ok) httpError('FAILED_TO_LOAD_BOOKING', res.status);
  return res.json();
}

/** Booking audit logs. Uses Supabase Edge Function. */
export async function fetchInstructorBookingAuditLogsServer(): Promise<
  BookingAuditLogRow[]
> {
  const session = await getServerSession();
  if (!session?.user?.id) httpError('UNAUTHORIZED', 401);

  const token = session.access_token;
  if (!token) httpError('UNAUTHORIZED', 401);

  const base = getSupabaseFunctionsUrl();
  const url = `${base}/instructor/booking-audit-logs`;

  const res = await serverFetch(url, token);
  if (res.status === 401) httpError('UNAUTHORIZED', 401);
  if (!res.ok) httpError('FAILED_TO_LOAD_BOOKING_AUDIT_LOGS', res.status);
  return res.json();
}

/** Booking lifecycle (booking + audit log). Uses Supabase Edge Function. */
export async function fetchBookingLifecycleByIdServer(
  bookingId: string
): Promise<BookingLifecycleReadModel> {
  const session = await getServerSession();
  if (!session?.user?.id) httpError('UNAUTHORIZED', 401);

  const token = session.access_token;
  if (!token) httpError('UNAUTHORIZED', 401);

  const base = getSupabaseFunctionsUrl();
  const url = `${base}/instructor/booking-lifecycle?bookingId=${encodeURIComponent(bookingId)}`;

  const res = await serverFetch(url, token);
  if (res.status === 401) httpError('UNAUTHORIZED', 401);
  if (res.status === 404) httpError('BOOKING_NOT_FOUND', 404);
  if (!res.ok) httpError('FAILED_TO_LOAD_BOOKING_LIFECYCLE', res.status);
  return res.json();
}

/** AI booking suggestion context (availability, busySlots, recentBookings). Uses Supabase Edge Function. */
export async function fetchAIBookingSuggestionContextServer(): Promise<AIBookingSuggestionContext> {
  const session = await getServerSession();
  if (!session?.user?.id) httpError('UNAUTHORIZED', 401);

  const token = session.access_token;
  if (!token) httpError('UNAUTHORIZED', 401);

  const base = getSupabaseFunctionsUrl();
  const url = `${base}/instructor/ai-booking-suggestions`;

  const res = await serverFetch(url, token);
  if (res.status === 401) httpError('UNAUTHORIZED', 401);
  if (!res.ok) httpError('FAILED_TO_LOAD_AI_BOOKING_CONTEXT', res.status);
  return res.json();
}

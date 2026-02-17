/**
 * Instructor KPI repository (read-only).
 * Pure SQL aggregation — no caching, no materialized views.
 */
import { sql } from './client.js';
import type { KpiWindow } from './instructor_draft_events_repository.js';

// ── Types ────────────────────────────────────────────────────────────────────

export interface BusinessKpi {
  window: KpiWindow;
  revenue_cents: number;
  paid_bookings: number;
  completed_lessons: number;
  completion_rate: number;
  avg_booking_value_cents: number;
  repeat_customer_rate: number;
}

export interface RevenueKpi {
  window: KpiWindow;
  paid_bookings: number;
  total_revenue_cents: number;
  avg_booking_value_cents: number;
  currency: string | null;
}

export interface FunnelKpi {
  window: KpiWindow;
  created: number;
  confirmed: number;
  cancelled: number;
  declined: number;
  conversion_rate: number;
  cancellation_rate: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const INTERVAL_MAP: Record<KpiWindow, string> = {
  '7d': '7 days',
  '30d': '30 days',
  '90d': '90 days',
};

function parseWindow(raw: string | undefined): KpiWindow {
  if (raw === '7d' || raw === '30d' || raw === '90d') return raw;
  return '30d';
}

export { parseWindow };

// ── Revenue KPI ──────────────────────────────────────────────────────────────

interface RevenueRow {
  paid_bookings: string;
  total_revenue_cents: string;
  avg_booking_value_cents: string;
  currency: string | null;
}

export async function getRevenueKpi(
  instructorId: string,
  window: KpiWindow,
): Promise<RevenueKpi> {
  const interval = INTERVAL_MAP[window];

  const rows = await sql<RevenueRow[]>`
    SELECT
      COUNT(*)::text                          AS paid_bookings,
      COALESCE(SUM(amount_cents), 0)::text    AS total_revenue_cents,
      COALESCE(AVG(amount_cents), 0)::text    AS avg_booking_value_cents,
      (
        SELECT currency FROM bookings
        WHERE instructor_id = ${instructorId}
          AND payment_status = 'paid'
          AND paid_at >= NOW() - ${interval}::interval
          AND currency IS NOT NULL
        LIMIT 1
      ) AS currency
    FROM bookings
    WHERE instructor_id = ${instructorId}
      AND payment_status = 'paid'
      AND paid_at >= NOW() - ${interval}::interval
  `;

  const row = rows[0];
  return {
    window,
    paid_bookings: parseInt(row?.paid_bookings ?? '0', 10),
    total_revenue_cents: parseInt(row?.total_revenue_cents ?? '0', 10),
    avg_booking_value_cents: Math.round(parseFloat(row?.avg_booking_value_cents ?? '0')),
    currency: row?.currency ?? null,
  };
}

// ── Funnel KPI ───────────────────────────────────────────────────────────────

interface FunnelRow {
  created: string;
  confirmed: string;
  cancelled: string;
  declined: string;
}

/**
 * Booking funnel based on booking_audit transitions (source of truth)
 * + bookings.created_at for "created" count.
 */
export async function getFunnelKpi(
  instructorId: string,
  window: KpiWindow,
): Promise<FunnelKpi> {
  const interval = INTERVAL_MAP[window];

  // Created bookings in window
  const createdRows = await sql<{ created: string }[]>`
    SELECT COUNT(*)::text AS created
    FROM bookings
    WHERE instructor_id = ${instructorId}
      AND created_at >= NOW() - ${interval}::interval
  `;

  // Transitions from booking_audit in window (join through bookings for instructor scoping)
  const transitionRows = await sql<FunnelRow[]>`
    SELECT
      0::text AS created,
      COUNT(*) FILTER (WHERE ba.new_state = 'confirmed')::text  AS confirmed,
      COUNT(*) FILTER (WHERE ba.new_state = 'cancelled')::text  AS cancelled,
      COUNT(*) FILTER (WHERE ba.new_state = 'declined')::text   AS declined
    FROM booking_audit ba
    JOIN bookings b ON b.id = ba.booking_id
    WHERE b.instructor_id = ${instructorId}
      AND ba.created_at >= NOW() - ${interval}::interval
  `;

  const created = parseInt(createdRows[0]?.created ?? '0', 10);
  const confirmed = parseInt(transitionRows[0]?.confirmed ?? '0', 10);
  const cancelled = parseInt(transitionRows[0]?.cancelled ?? '0', 10);
  const declined = parseInt(transitionRows[0]?.declined ?? '0', 10);

  const conversionRate = created > 0 ? Math.round((confirmed / created) * 100) : 0;
  const cancellationRate = confirmed > 0 ? Math.round((cancelled / confirmed) * 100) : 0;

  return {
    window,
    created,
    confirmed,
    cancelled,
    declined,
    conversion_rate: conversionRate,
    cancellation_rate: cancellationRate,
  };
}

// ── Business KPI ─────────────────────────────────────────────────────────────

interface BusinessRow {
  revenue_cents: string;
  paid_bookings: string;
  avg_booking_value_cents: string;
  completed_lessons: string;
  confirmed_in_window: string;
  total_completed_customers: string;
  repeat_completed_customers: string;
}

/**
 * Consolidated business KPI for instructor dashboard.
 * Single query with subqueries for each metric. Pure aggregation, no side effects.
 */
export async function getBusinessKpi(
  instructorId: string,
  window: KpiWindow,
): Promise<BusinessKpi> {
  const interval = INTERVAL_MAP[window];

  const rows = await sql<BusinessRow[]>`
    SELECT
      -- Revenue (payment_status='paid', paid_at in window)
      COALESCE(SUM(amount_cents) FILTER (
        WHERE payment_status = 'paid' AND paid_at >= NOW() - ${interval}::interval
      ), 0)::text AS revenue_cents,

      COUNT(*) FILTER (
        WHERE payment_status = 'paid' AND paid_at >= NOW() - ${interval}::interval
      )::text AS paid_bookings,

      COALESCE(AVG(amount_cents) FILTER (
        WHERE payment_status = 'paid' AND paid_at >= NOW() - ${interval}::interval
      ), 0)::text AS avg_booking_value_cents,

      -- Completed lessons (status='completed', start_time in window)
      COUNT(*) FILTER (
        WHERE status = 'completed' AND start_time >= NOW() - ${interval}::interval
      )::text AS completed_lessons,

      -- Confirmed in window (for completion rate denominator)
      COUNT(*) FILTER (
        WHERE status IN ('confirmed', 'modified', 'completed')
          AND start_time >= NOW() - ${interval}::interval
      )::text AS confirmed_in_window,

      -- Repeat customer: customers with >=2 completed bookings (all-time, scoped to instructor)
      -- total_completed_customers: distinct customers with >=1 completed booking
      -- repeat_completed_customers: distinct customers with >=2 completed bookings
      (
        SELECT COUNT(*)::text FROM (
          SELECT customer_id FROM bookings
          WHERE instructor_id = ${instructorId}
            AND status = 'completed'
            AND customer_id IS NOT NULL
          GROUP BY customer_id
          HAVING COUNT(*) >= 1
        ) sub
      ) AS total_completed_customers,

      (
        SELECT COUNT(*)::text FROM (
          SELECT customer_id FROM bookings
          WHERE instructor_id = ${instructorId}
            AND status = 'completed'
            AND customer_id IS NOT NULL
          GROUP BY customer_id
          HAVING COUNT(*) >= 2
        ) sub
      ) AS repeat_completed_customers

    FROM bookings
    WHERE instructor_id = ${instructorId}
  `;

  const row = rows[0];
  const revenueCents = parseInt(row?.revenue_cents ?? '0', 10);
  const paidBookings = parseInt(row?.paid_bookings ?? '0', 10);
  const avgBookingValueCents = Math.round(parseFloat(row?.avg_booking_value_cents ?? '0'));
  const completedLessons = parseInt(row?.completed_lessons ?? '0', 10);
  const confirmedInWindow = parseInt(row?.confirmed_in_window ?? '0', 10);
  const totalCompletedCustomers = parseInt(row?.total_completed_customers ?? '0', 10);
  const repeatCompletedCustomers = parseInt(row?.repeat_completed_customers ?? '0', 10);

  const completionRate = confirmedInWindow > 0
    ? Math.round((completedLessons / confirmedInWindow) * 100)
    : 0;

  const repeatCustomerRate = totalCompletedCustomers > 0
    ? Math.round((repeatCompletedCustomers / totalCompletedCustomers) * 100)
    : 0;

  return {
    window,
    revenue_cents: revenueCents,
    paid_bookings: paidBookings,
    completed_lessons: completedLessons,
    completion_rate: completionRate,
    avg_booking_value_cents: avgBookingValueCents,
    repeat_customer_rate: repeatCustomerRate,
  };
}

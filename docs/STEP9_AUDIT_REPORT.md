# STEP 9 — Alignment Audit Report (Read-Only)

**Date:** 2026-01-31  
**Scope:** Instructor app and related UI copy, naming, affordances.  
**Reference:** `docs/STEP_9_BILLING_PRICING_DECISIONS.md`  
**Method:** String-by-string scan and component review. No code was modified.

---

## Executive summary

The codebase is largely aligned with the STEP 9 decision record. No Billing/Checkout/Stripe component naming exists; payment and subscription surfaces are read-only and informational. Several copy and affordance issues were found: one phrase conflates confirmation with payment; one CTA (“Take over conversation”) risks implying AI control; a few subscription/billing phrases use “paid plan” or timeline promises (“will be available here”). All findings are copy or wording only. No implementation, backend, or structural changes are required. Recommended verdict: **SAFE WITH MINOR COPY FIXES**.

---

## 1. Booking & payment semantics

**Rule (STEP 9):** Confirmed ≠ Paid. Payment finalizes booking. Confirmation is instructor intent.

| File | Location | Issue | Suggested change |
|------|----------|--------|-------------------|
| `apps/instructor/components/InstructorConversationView.tsx` | Lines 244–246 | Block titled “Payment & confirmation” states: “Lessons are not confirmed until payment is completed.” This conflates confirmation with payment and contradicts STEP 9 (instructor confirms; payment finalizes). | Replace with neutral, intent-first copy, e.g.: “You confirm the lesson; payment is handled separately and finalizes the booking. You can share the payment link when you’re ready.” |
| `apps/instructor/components/BookingOverviewPanel.tsx` | Line 203 | Under “Reserved”: “It will be confirmed once payment is completed.” Implies confirmation happens at payment time. | Clarify that the instructor confirms; payment then finalizes. E.g.: “You can confirm when ready; payment can be collected afterward and will finalize the booking.” |
| `apps/instructor/components/BookingOverviewPanel.tsx` | Line 213 | “Payment is required to fully confirm the lesson.” Blurs confirmation (intent) and payment (finalization). | Prefer: “Payment completion will finalize the booking.” Or remove if redundant with the “Payment completion will finalize the booking” line already present below. |

**Aligned (no change):**

- “Confirmed — booking locked and ready for payment” (BookingOverviewPanel, BookingTimeline).
- “Confirmed — pending payment” and “Payment completion will finalize the booking” (BookingOverviewPanel).
- “Payment is handled outside FrostDesk for now” and “Payment status / Not collected yet” (read-only, informational).

---

## 2. Subscription & billing wording

**Rule (STEP 9):** Subscription = read-only surface. “May require a subscription” only. No commercial promise or timeline.

| File | Location | Issue | Suggested change |
|------|----------|--------|-------------------|
| `apps/instructor/components/UsingFrostDeskNote.tsx` | Line 18 | “Payments and advanced automation may require a **paid plan**.” “Paid plan” is commercial wording. | Use availability wording: “Payments and advanced automation may require a subscription.” or “Some payment and automation features may be available with a subscription.” |
| `apps/instructor/components/SubscriptionStatusPanel.tsx` | Line 21 | “Billing and subscription management **will be available here**.” Implies a timeline and a place promise. | Neutral, no timeline: “Billing and subscriptions are handled separately.” |
| `apps/instructor/components/BookingOverviewPanel.tsx` | Line 247 | “Available with subscription” can read as a CTA or commitment. | Softer: “May be available with a subscription.” or “Feature availability may vary by plan.” |

**Aligned (no change):**

- “Billing and subscriptions will be handled separately.” (UsingFrostDeskNote).
- “Some features shown here may require an active subscription.” (InstructorConversationView).
- “Advanced actions may require a subscription.” (BookingTimeline).
- “may require an active subscription in the future” (SubscriptionStatusPanel) — “in the future” is acceptable as non-specific.

---

## 3. AI control & automation affordance

**Rule (STEP 9):** AI suggests, human decides. Manual escalation always available. No automation by default.

| File | Location | Issue | Suggested change |
|------|----------|--------|-------------------|
| `apps/instructor/components/BookingAssistIndicators.tsx` | Line 313 | Button label: “**Take over conversation**.” Can imply the AI was in control and the human is “taking over,” which is psychologically strong and can suggest automation risk. | Softer, instructor-in-control wording. Examples: “Continue manually,” “Reply yourself,” “Switch to manual replies.” |

**Aligned (no change):**

- “AI suggests, human decides.” (BookingAssistIndicators).
- “You’re always in control. Suggested replies are optional.” (DecisionTransparencyNote).
- “Human-led” badge and “Why Frost thinks this” tooltip (BookingAssistIndicators).

---

## 4. Naming & mental model alignment

**Rule (STEP 9):** No Billing*, Checkout*, PaymentAction*, Stripe* components. PaymentStatus / SubscriptionStatus and read-only, informational naming only.

**Findings:**

- No components or files named Billing*, Checkout*, PaymentAction*, or Stripe* in the instructor app.
- “Payment status” and “Payment” (section heading) in BookingOverviewPanel are used in a read-only, informational way. Aligned.
- “Subscription” and “SubscriptionStatusPanel” are read-only and informational. Aligned.

**No naming changes recommended.**

---

## 5. Placeholder and promise safety

**Rule (STEP 9):** Neutral, informational wording; no timeline or commercial promise.

| File | Location | Issue | Suggested change |
|------|----------|--------|-------------------|
| `apps/instructor/components/SubscriptionStatusPanel.tsx` | Line 21 | “will be available **here**” — place + time promise. | See Section 2: “Billing and subscriptions are handled separately.” |
| `apps/instructor/components/BookingOverviewPanel.tsx` | Line 239 | “**You will be able to** track payment status here.” — future promise. | Neutral: “Payment status can be tracked here when payment features are available.” or “Payment status is shown here when available.” (avoid “will be able to” as a near-term commitment). |

Other “placeholder” or “available” usages (e.g. inbox placeholder list, calendar placeholder) are technical/UX, not commercial. No change.

---

## 6. Client ownership and platform overreach

**Rule (STEP 9):** Client belongs to instructor. FrostDesk is a tool, not intermediary.

**Findings:** No copy was found that suggests FrostDesk owns clients, sets prices, or “we handle clients.” PolicyForm “the full amount will be charged” is instructor-defined policy content (no-show), not FrostDesk promising to charge. No change.

---

## 7. Final verdict

| Verdict | Rationale |
|--------|-----------|
| **SAFE WITH MINOR COPY FIXES** | No structural or naming violations. No Stripe, billing, or checkout logic. All issues are copy or affordance only: (1) confirmation vs payment clarity in 3 places, (2) one CTA softened from “Take over conversation,” (3) subscription/billing wording in 3 places, (4) two placeholder/promise phrases made neutral. Changes are text-only, small, and reversible. |

**Recommended next steps (outside this audit):**

1. Apply the suggested copy and CTA changes in the order specified in the check-up (booking/payment first, then AI affordance, then subscription wording, then naming/placeholder if any).
2. Commit in four small commits as in the check-up instructions.
3. Treat the app as UI v1 freeze, demo-safe and investor-safe, until STEP 10 (Stripe subscription, SaaS only).

---

*End of STEP 9 audit report. No code was modified during this audit.*

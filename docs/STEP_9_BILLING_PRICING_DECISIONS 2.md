# STEP 9 — Billing & Pricing Architecture: Decision Record

**Status:** Locked  
**Scope:** Billing architecture, business entity, payment flows, fee model, pricing and packaging.  
**Audience:** Strategy, operations, investors.  
**This document is decision-only. It does not describe implementation, experiments, or alternatives.**

---

## 1. Purpose of STEP 9

Billing and pricing are decided once and locked early because they define who pays whom, when, and for what. Changing these later forces contract changes, accounting rework, and product refactors. By fixing the entity, the payment flows, the fee model, and the packaging before build, FrostDesk avoids rework, keeps compliance and accounting simple, and gives the product a stable commercial spine. STEP 9 is the single source of truth for all future billing and payment work.

---

## 2. Business entity and Stripe setup

- **Where the business account is opened:** The FrostDesk trading entity is established in the United Kingdom. All merchant and SaaS billing operations run through this entity.

- **Why UK:** The UK offers a clear regulatory regime for fintech and SaaS, straightforward incorporation, and a single jurisdiction for contracts, VAT, and financial reporting. It aligns with a European and UK instructor base and keeps currency and tax treatment predictable.

- **Why Stripe UK:** Stripe is used as the sole payment and billing provider. The Stripe account is opened under the UK entity (Stripe UK). Stripe provides subscription billing for SaaS plans, and when instructor–client payments are enabled, it will provide the payment rail. One provider keeps integrations, reconciliation, and support simple.

- **What is intentionally deferred:** Stripe Connect is not adopted at STEP 9. Instructor–client payments, when introduced, will be implemented in a way that can later be migrated to Connect without changing the documented payment flows or who owns the money. Connect is a future optimisation, not a requirement for the current flow design.

---

## 3. Payment flow map

Three flows are defined. Each is separate; no flow is a subset of another.

**Flow A — Client to instructor (lesson payment)**

- The client pays the instructor for lessons or services.
- The instructor sets their own prices and terms. FrostDesk does not set or mandate client-facing prices.
- If the instructor uses FrostDesk to collect payment, the money is received by the instructor (or by the platform on the instructor’s behalf under clear terms). FrostDesk does not own this money; it is instructor revenue. When and how the instructor is paid (e.g. settlement to their bank) is defined by the payment implementation and is outside the scope of this document.
- This flow is optional. Instructors may use FrostDesk without enabling client payments.

**Flow B — Instructor to FrostDesk (SaaS subscription)**

- The instructor (or their business) pays FrostDesk for use of the product.
- Payment is due according to the chosen plan (e.g. monthly or annual). The subscription is billed by FrostDesk via Stripe; the instructor pays FrostDesk.
- FrostDesk owns this revenue. It is SaaS income.

**Flow C — Instructor to FrostDesk (transaction fee, when payments are enabled)**

- If the instructor has enabled collection of client payments through FrostDesk, a transaction fee may apply on those payments.
- The fee is taken by FrostDesk from the payment flow; the remainder is the instructor’s. The exact moment of split (e.g. at capture or at settlement) is an implementation detail; the decision is that FrostDesk may take a percentage of the instructor’s client payment volume when that volume is processed via FrostDesk.
- This flow exists only when client payments are enabled. It is separate from the SaaS subscription (Flow B).

**Summary**

| Who pays | Who receives | For what |
|----------|--------------|----------|
| Client   | Instructor   | Lessons or services (instructor’s price) |
| Instructor | FrostDesk | SaaS subscription (plan fee) |
| Instructor (via share of client payment) | FrostDesk | Transaction fee (only when client payments are enabled) |

Money ownership: client payment is instructor revenue until any transaction fee is deducted; subscription and transaction fee are FrostDesk revenue.

---

## 4. Fee model and take-rate

- **SaaS subscription:** The instructor (or their business) is the payer. Billing is recurring (e.g. monthly or annual). The amount depends on the chosen plan. This is FrostDesk’s primary revenue.

- **Optional transaction fee:** When the instructor uses FrostDesk to collect payments from clients, FrostDesk may charge a percentage of that payment volume. The percentage and cap, if any, are set in commercial terms. This is framed as a fee for payment processing and platform use, not as a tax on the instructor’s own pricing or on revenue collected outside FrostDesk.

- **What FrostDesk does not tax:** Revenue the instructor earns outside FrostDesk (e.g. cash, bank transfer, or another processor) is not subject to FrostDesk fees. FrostDesk does not charge on the instructor’s list prices or on bookings that do not result in a payment through FrostDesk.

---

## 5. Pricing and packaging decisions

- **Tiers:** Three plan tiers are defined: Starter, Core, and Pro. They are differentiated by feature access and usage limits, not by a different payment flow or fee structure. The same two revenue streams (subscription and optional transaction fee) apply across tiers.

- **Default plan:** Core is the default plan. New instructors are placed on Core unless they explicitly choose Starter or Pro. This balances accessibility with sustainable unit economics and positions Core as the main offer.

- **Starter:** Positioned for instructors who want to try the product or have minimal volume. Limited features or usage. Psychologically framed as entry and validation, not as the long-term default.

- **Core:** Positioned as the standard plan for active instructors. Full everyday use: inbox, booking flow, AI assistance, and (when enabled) payment collection. Framed as “the plan most instructors use.”

- **Pro:** Positioned for instructors with higher volume or need for advanced capabilities. Clear limits and benefits are defined so it is an upgrade, not a vague “enterprise” tier.

- **Add-ons:** Add-ons exist for discrete capabilities (e.g. extra channels, higher usage, or specific features) that do not fit neatly into the three tiers. They are framed as optional extensions of the chosen plan, not as hidden fees. Pricing of add-ons is consistent with the fee model (subscription or usage-based), not a third revenue stream that contradicts this document.

---

## 6. What FrostDesk explicitly does not do

- FrostDesk does not force any instructor to accept or request payment through the platform. Instructors can use the product without enabling client payments.

- FrostDesk does not charge clients automatically. Any charge to a client is only after the instructor has agreed and the flow is explicit; there is no hidden or automatic debiting of clients.

- FrostDesk does not apply hidden fees. Subscription and transaction fees (when applicable) are stated in the plan and commercial terms.

- FrostDesk does not replace the instructor–client relationship. The product supports that relationship (inbox, booking, optional payments); it does not insert itself as the party that sets prices, owns the client, or dictates how the instructor runs their business.

---

## 7. Scalability and future-proofing

- **Avoiding refactors:** By fixing the entity, the provider (Stripe UK), and the three flows (client–instructor, instructor–FrostDesk subscription, instructor–FrostDesk transaction fee) now, the system can be built once. Later changes are configuration and product rules, not architectural rewrites.

- **Stripe Connect:** The flow map is written so that “instructor receives client money” and “FrostDesk may take a transaction fee” remain true whether the implementation uses a single Stripe account today or Stripe Connect later. Connect would change how funds move technically, not who pays whom or who owns the money. Migration to Connect can be done without breaking the decisions in this document.

- **Accounting and compliance:** One entity, one provider, and clear separation of (1) instructor revenue, (2) subscription revenue, and (3) transaction-fee revenue keep reporting and tax treatment clear. No grey areas between “instructor money” and “platform money” are introduced.

---

*End of STEP 9 decision record.*

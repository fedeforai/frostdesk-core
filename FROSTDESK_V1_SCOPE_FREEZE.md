# FrostDesk v1 – Scope Freeze (Pilot Mode)

## Purpose

This document freezes the scope of FrostDesk v1 for the duration of the pilot. It exists to prevent scope creep, protect execution stability, and align the team on what is included and excluded.

**This document is blocking, authoritative, and final.**

Anything not explicitly listed in the "What FrostDesk v1 DOES" section is OUT OF SCOPE for v1. This document overrides verbal agreements, informal discussions, and future promises.

### AI Authority Boundary

In FrostDesk v1, AI has **no operational authority**.

AI may:
- classify
- evaluate
- suggest (draft-only)

AI may not:
- execute actions
- trigger side effects
- modify system state
- communicate with customers

All AI output is advisory and requires explicit human action.

## What FrostDesk v1 DOES

FrostDesk v1 provides the following capabilities:

- Receives inbound WhatsApp messages via Meta webhook integration
- Persists messages with idempotency guarantees
- Tracks conversation state and timeline
- Classifies message intent using AI (read-only classification)
- Generates confidence scores for intent classification
- Evaluates AI response eligibility using deterministic rules
- Classifies escalation requirements
- Generates draft responses using AI (draft-only, no autonomous sending)
- Provides human inbox interface for message review
- Enables human approval workflow for AI-generated drafts
- Enables human operators to manually send messages outside of AI automation, after reviewing AI drafts
- Displays booking lifecycle information (read-only visibility)
- Provides instructor dashboard for booking management
- Provides admin dashboard for system oversight
- Manages feature flags for capability gating
- Enforces AI quotas and gating rules
- Monitors system health and degradation states
- Logs AI decision snapshots for observability
- Supports three human roles: System Administrator, Human Operator, Human Approver
- Provides booking audit logging
- Tracks conversation AI mode state
- Manages instructor availability configuration
- Manages instructor services and pricing
- Manages instructor policies
- Manages instructor meeting points
- Displays calendar events and availability conflicts
- Provides booking detail views and lifecycle tracking

All AI operations are read-only or draft-only. All state mutations require explicit human approval.

## What FrostDesk v1 DOES NOT DO

FrostDesk v1 does not provide the following capabilities:

- Autonomous AI message sending
- Automated booking creation
- Automated booking modification
- Automated booking cancellation
- Automated payment processing
- Automated payment confirmation
- Automated refunds
- Automated calendar writes
- Automated instructor assignment
- Automated pricing decisions
- AI-initiated outbound communication
- AI decisions without explicit human approval
- AI actions producing irreversible side effects
- Background jobs with write side effects
- Time-based automated actions
- Event-driven automated executions without human confirmation
- Multi-channel support (email, SMS, other messaging platforms)
- Customer accounts or authentication
- Payment gateway integration
- Advanced analytics or reporting dashboards
- Customizable workflows or business rules
- Multi-instructor or multi-tenant support
- Marketplace or instructor discovery
- Mobile applications
- Real-time calendar synchronization
- Automated availability management

## Explicitly Out of Scope (v1)

The following areas are explicitly excluded from v1 and are postponed to v2 or rejected:

**AI Lifecycle Management**
- AI model training or fine-tuning
- AI performance optimization
- AI learning from pilot data
- AI self-adjustment of rules or thresholds

**Schema Extensions**
- New database tables beyond current schema
- New entity types (customers, payments, invoices)
- Extended booking attributes
- Multi-tenant data models

**Multi-Channel Support**
- Email integration
- SMS integration
- Other messaging platform integrations
- Unified inbox across channels

**Payment Processing**
- Payment gateway integration
- Automated payment collection
- Refund processing
- Invoice generation

**Advanced Analytics**
- Custom reporting
- Business intelligence dashboards
- Predictive analytics
- Performance benchmarking

**Customization**
- Configurable business rules
- Custom workflow definitions
- White-label customization
- Branding modifications

**Automation**
- Automated booking confirmations
- Automated reminder messages
- Scheduled tasks with side effects
- Event-driven automation

These exclusions are binding. No work on these areas is permitted during v1 pilot.

## Success Criteria for v1

FrostDesk v1 is considered successful when all of the following criteria are met:

1. **Message Reception Stability**: System receives and persists 100% of inbound WhatsApp messages without data loss, with idempotency guarantees verified.

2. **Human Approval Workflow Integrity**: All AI-generated drafts require explicit human approval before sending. Zero autonomous AI sends occur in production.

3. **Booking Visibility Accuracy**: All booking lifecycle states are accurately reflected in instructor and admin dashboards. Read-only visibility matches database state.

4. **System Observability Completeness**: All AI decisions, eligibility evaluations, and escalation classifications are logged with complete audit trails. Zero silent AI operations occur.

5. **Pilot Readiness**: System operates in pilot mode with all governance boundaries enforced. Feature flags, quotas, and gating rules function as designed. Kill switch mechanisms are operational.

These criteria are binary and measurable. Partial fulfillment does not constitute success.

## Governance

**Document Authority**

This document overrides all verbal agreements, informal discussions, and future promises. It is the single source of truth for v1 scope.

**Change Control**

Any change to v1 scope requires:
- Explicit version bump to v2
- New scope freeze document for v2
- Formal approval process
- Updated governance documentation

No incremental scope additions are permitted. No exceptions are granted.

**Validation Protocol**

During pilot validation:
- Scope is considered approved unless a formal written objection is raised within the defined validation window
- Requests for out-of-scope features are rejected with reference to this document
- Scope violations require immediate correction
- Persistent violations invalidate pilot conditions

**Kill Switch**

At any point during the pilot, FrostDesk v1 may be fully disabled without notice if governance, safety, or scope boundaries are violated.

This includes:
- disabling AI draft generation
- disabling admin access
- reverting to message persistence only

**Enforcement**

This document is binding for all team members, stakeholders, and contributors. Violations of scope boundaries are considered governance failures and require immediate remediation.

---

**Document Status**: Active and Binding

**Effective Date**: 2026-01-26

**Version**: 1.0

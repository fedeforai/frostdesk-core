# HUMAN_RESPONSIBILITY_MATRIX.md

**Status**: Frozen

Human responsibility allocation formally defined and binding.

**Effective Date**: 2026-01-24

## 1. Principle

**Every action with external effect or user impact requires a clearly identified human owner.**

AI actions have no authority and no ownership.

## 2. Roles Defined

### 2.1 System Administrator

**Description**

Operational and governance owner of the FrostDesk system.

**Permitted Actions**

- Enable or disable system-wide feature flags
- Activate emergency kill switches
- Access system health and degradation snapshots
- Manage admin access permissions
- Suspend the pilot if governance is violated

**Mandatory Actions**

- Monitor system health indicators
- Act immediately on boundary violations
- Preserve audit logs and system traces

**Prohibited Actions**

- Bypassing governance rules
- Granting AI autonomous authority
- Modifying pilot scope without a new governance block

### 2.2 Human Operator

**Description**

Primary human interface handling inbound user communications.

**Permitted Actions**

- View inbound messages
- Review AI-generated drafts
- Manually edit AI drafts
- Manually send messages to users
- Escalate conversations to Human Approver

**Mandatory Actions**

- Review message context before sending
- Ensure message accuracy and appropriateness
- Escalate when uncertainty exists

**Prohibited Actions**

- Sending messages without review
- Relying on AI drafts without validation
- Creating commitments or guarantees

### 2.3 Human Approver

**Description**

Final authority for sensitive or high-impact communications.

**Permitted Actions**

- Approve or reject AI-generated drafts
- Authorize booking-related communications
- Authorize pricing or availability statements
- Override draft content with manual responses

**Mandatory Actions**

- Explicitly approve or reject each draft
- Ensure compliance with pilot constraints
- Ensure human accountability for each approval

**Prohibited Actions**

- Delegating approval to AI
- Approving messages without review
- Authorizing actions outside pilot scope

## 3. AI to Human Ownership Mapping

| AI Output | Human Owner |
|-----------|-------------|
| Intent classification | Human Operator |
| Eligibility evaluation | Human Operator |
| Escalation classification | Human Operator |
| Draft response | Human Operator |
| Draft approval | Human Approver |
| Message sending | Human Operator |
| System override | System Administrator |

## 4. Responsibility Enforcement

- Every externally visible action must be attributable to a human role
- Every approval must be logged with human identity
- Absence of action does not imply consent
- Ambiguity requires escalation, not assumption

## 5. Responsibility Lock

**This responsibility matrix is final and binding for the duration of the pilot.**

Any change requires a new governance block and explicit approval.

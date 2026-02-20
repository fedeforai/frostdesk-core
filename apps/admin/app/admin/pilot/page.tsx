import { requireAdmin } from '@/lib/requireAdmin';
import Breadcrumbs from '@/components/admin/Breadcrumbs';
import ErrorState from '@/components/admin/ErrorState';
import StatusBadge from '@/components/admin/StatusBadge';
import Link from 'next/link';

export default async function PilotProtocolPage() {
  try {
    await requireAdmin();
  } catch (error) {
    return (
      <div style={{ padding: '2rem' }}>
        <ErrorState status={403} message="Admin access required" />
      </div>
    );
  }

  const steps = [
    {
      number: 1,
      title: 'Login',
      description: 'Authenticate as an admin user with appropriate role (system_admin, human_operator, or human_approver). The system enforces role-based access control for all operations.',
      link: '/admin',
      linkText: 'Go to Admin Dashboard',
      status: 'approved' as const,
    },
    {
      number: 2,
      title: 'Receive Message',
      description: 'Inbound messages from customers arrive via WhatsApp webhook. Messages are automatically persisted and appear in the Human Inbox for review. Each message includes intent classification and confidence scores.',
      link: '/admin/human-inbox',
      linkText: 'View Human Inbox',
      status: 'pending' as const,
    },
    {
      number: 3,
      title: 'AI Draft Generated',
      description: 'For eligible conversations, the system generates an AI draft reply. The draft is stored as metadata and visible in the conversation detail view. AI eligibility is determined by confidence thresholds, escalation needs, and system kill switches.',
      link: '/admin/human-inbox',
      linkText: 'View Conversations',
      note: 'Open any conversation to see the AI Draft panel',
      status: 'ai_draft_ready' as const,
    },
    {
      number: 4,
      title: 'Human Approval',
      description: 'A human operator or approver reviews the AI draft. The draft can be approved and sent, edited manually, or rejected. All approvals are logged with the human actor identity and timestamp.',
      link: '/admin/human-inbox',
      linkText: 'Review Drafts',
      note: 'Use the "Send this reply" button to approve and send',
      status: 'waiting_human' as const,
    },
    {
      number: 5,
      title: 'Booking Creation',
      description: 'When a booking is created (either from conversation context or manual entry), it appears in the bookings list. Bookings have states: pending, confirmed, or cancelled. All state transitions are audited.',
      link: '/admin/bookings',
      linkText: 'View Bookings',
      status: 'proposed' as const,
    },
    {
      number: 6,
      title: 'Audit Trail',
      description: 'Every booking state change is recorded in the audit trail. The lifecycle view shows the complete history: previous state, new state, actor (human/system), and timestamp. This provides full traceability for compliance and debugging.',
      link: '/admin/bookings',
      linkText: 'View Booking Lifecycle',
      note: 'Open any booking and navigate to the Lifecycle tab',
      status: 'confirmed' as const,
    },
  ];

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <Breadcrumbs items={[
        { label: 'Admin', href: '/admin' },
        { label: 'Pilot Protocol', href: '/admin/pilot' },
      ]} />
      
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: '600', color: 'rgba(226, 232, 240, 0.95)', marginBottom: '0.5rem' }}>
          Pilot Protocol Guide
        </h1>
        <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
          Step-by-step guide to the FrostDesk pilot workflow. This page is read-only and intended for demos, partners, and investors.
        </p>
      </div>

      <div style={{ 
        backgroundColor: '#f0f9ff', 
        border: '1px solid #3b82f6', 
        borderRadius: '0.5rem', 
        padding: '1.5rem',
        marginBottom: '2rem',
      }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: '600', color: 'rgba(226, 232, 240, 0.95)', marginBottom: '1rem' }}>
          What is the Pilot?
        </h2>
        <p style={{ color: '#1e40af', fontSize: '0.875rem', lineHeight: '1.6', marginBottom: '1rem' }}>
          The FrostDesk pilot is a <strong>governed, read-only observation phase</strong> designed to validate AI-assisted booking workflows 
          under strict human supervision. All AI operations are <strong>draft-only</strong> and require explicit human approval before any action.
        </p>
        <p style={{ color: '#1e40af', fontSize: '0.875rem', lineHeight: '1.6', marginBottom: '0' }}>
          <strong>Effective Date:</strong> January 24, 2026 | <strong>Status:</strong> Active | <strong>Mode:</strong> Read-Only / Human-Supervised
        </p>
      </div>

      <div style={{ 
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem',
      }}>
        <div style={{ 
          backgroundColor: '#ffffff', 
          border: '1px solid #e5e7eb', 
          borderRadius: '0.5rem', 
          padding: '1.25rem',
        }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: '600', color: 'rgba(226, 232, 240, 0.95)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Active Flows
          </h3>
          <ul style={{ 
            color: '#374151', 
            fontSize: '0.875rem', 
            lineHeight: '1.8',
            margin: 0,
            paddingLeft: '1.25rem',
          }}>
            <li>WhatsApp inbound messages</li>
            <li>AI intent classification</li>
            <li>AI draft generation</li>
            <li>Human approval workflow</li>
            <li>Booking lifecycle tracking</li>
            <li>Audit trail logging</li>
          </ul>
        </div>

        <div style={{ 
          backgroundColor: '#ffffff', 
          border: '1px solid #e5e7eb', 
          borderRadius: '0.5rem', 
          padding: '1.25rem',
        }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: '600', color: 'rgba(226, 232, 240, 0.95)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Read-Only Operations
          </h3>
          <ul style={{ 
            color: '#374151', 
            fontSize: '0.875rem', 
            lineHeight: '1.8',
            margin: 0,
            paddingLeft: '1.25rem',
          }}>
            <li>Message viewing</li>
            <li>Conversation timeline</li>
            <li>AI decision visibility</li>
            <li>System health monitoring</li>
            <li>KPI tracking</li>
            <li>Audit log inspection</li>
          </ul>
        </div>

        <div style={{ 
          backgroundColor: '#ffffff', 
          border: '1px solid #e5e7eb', 
          borderRadius: '0.5rem', 
          padding: '1.25rem',
        }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: '600', color: 'rgba(226, 232, 240, 0.95)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Metrics Tracked
          </h3>
          <ul style={{ 
            color: '#374151', 
            fontSize: '0.875rem', 
            lineHeight: '1.8',
            margin: 0,
            paddingLeft: '1.25rem',
          }}>
            <li>Conversations per day</li>
            <li>AI drafts generated</li>
            <li>Human approvals</li>
            <li>Bookings created</li>
            <li>Intent confidence scores</li>
            <li>System degradation signals</li>
          </ul>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {steps.map((step) => (
          <div
            key={step.number}
            style={{
              border: '1px solid #e5e7eb',
              borderRadius: '0.5rem',
              padding: '1.5rem',
              backgroundColor: '#ffffff',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
              <div style={{
                width: '2rem',
                height: '2rem',
                borderRadius: '50%',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.875rem',
                fontWeight: '600',
                flexShrink: 0,
              }}>
                {step.number}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <h3 style={{ 
                    fontSize: '1.125rem', 
                    fontWeight: '600', 
                    color: 'rgba(226, 232, 240, 0.95)',
                  }}>
                    {step.title}
                  </h3>
                  <StatusBadge status={step.status} size="sm" />
                </div>
                <p style={{ 
                  color: '#374151', 
                  fontSize: '0.875rem', 
                  lineHeight: '1.5',
                  marginBottom: '0.75rem',
                }}>
                  {step.description}
                </p>
                {step.note && (
                  <p style={{ 
                    color: '#6b7280', 
                    fontSize: '0.8125rem', 
                    fontStyle: 'italic',
                    marginBottom: '0.75rem',
                  }}>
                    {step.note}
                  </p>
                )}
                <Link
                  href={step.link}
                  style={{
                    display: 'inline-block',
                    color: '#2563eb',
                    textDecoration: 'none',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    padding: '0.5rem 1rem',
                    border: '1px solid #2563eb',
                    borderRadius: '0.375rem',
                  }}
                >
                  {step.linkText} →
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ 
        marginTop: '3rem',
        padding: '1.5rem',
        backgroundColor: '#fef3c7',
        border: '1px solid #fbbf24',
        borderRadius: '0.5rem',
      }}>
        <h2 style={{ fontSize: '1rem', fontWeight: '600', color: '#92400e', marginBottom: '0.75rem' }}>
          Important Notes
        </h2>
        <ul style={{ 
          color: '#78350f', 
          fontSize: '0.875rem', 
          lineHeight: '1.6',
          margin: 0,
          paddingLeft: '1.5rem',
        }}>
          <li>All AI operations are read-only or draft-only. No autonomous actions are permitted.</li>
          <li>Human approval is required for all outbound messages and booking state changes.</li>
          <li>Complete audit trails are maintained for all actions.</li>
          <li>System kill switches can immediately disable AI processing if needed.</li>
          <li>Role-based access control ensures only authorized users can perform sensitive operations.</li>
        </ul>
      </div>
    </div>
  );
}

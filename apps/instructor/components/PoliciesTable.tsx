'use client';

import type { InstructorPolicy } from '@/lib/instructorApi';

interface PoliciesTableProps {
  policies: InstructorPolicy[];
  onEdit: (policy: InstructorPolicy) => void;
  onAdd: () => void;
}

const policyTypeLabels: Record<string, string> = {
  cancellation: 'Cancellation',
  no_show: 'No Show',
  weather: 'Weather',
  payment: 'Payment',
  liability: 'Liability',
  meeting_point: 'Meeting Point',
  substitution: 'Substitution',
  group_private: 'Group/Private',
  escalation: 'Escalation',
};

export default function PoliciesTable({ policies, onEdit, onAdd }: PoliciesTableProps) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: 'rgba(226, 232, 240, 0.95)' }}>
          Policies
        </h2>
        <button
          type="button"
          onClick={onAdd}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '0.375rem',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: '500',
            outline: 'none',
          }}
          onFocus={(e) => {
            e.currentTarget.style.outline = '2px solid #3b82f6';
            e.currentTarget.style.outlineOffset = '2px';
          }}
          onBlur={(e) => {
            e.currentTarget.style.outline = 'none';
          }}
          aria-label="Add policy"
        >
          Add policy
        </button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table
          role="table"
          aria-label="Policies list"
          style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid rgba(255, 255, 255, 0.1)' }}
        >
          <thead>
            <tr style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
              <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid rgba(255, 255, 255, 0.1)', fontWeight: '600', fontSize: '0.875rem', color: 'rgba(226, 232, 240, 0.95)' }}>
                Policy Type
              </th>
              <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid rgba(255, 255, 255, 0.1)', fontWeight: '600', fontSize: '0.875rem', color: 'rgba(226, 232, 240, 0.95)' }}>
                Version
              </th>
              <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid rgba(255, 255, 255, 0.1)', fontWeight: '600', fontSize: '0.875rem', color: 'rgba(226, 232, 240, 0.95)' }}>
                Active
              </th>
              <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid rgba(255, 255, 255, 0.1)', fontWeight: '600', fontSize: '0.875rem', color: 'rgba(226, 232, 240, 0.95)' }}>
                Valid From
              </th>
              <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid rgba(255, 255, 255, 0.1)', fontWeight: '600', fontSize: '0.875rem', color: 'rgba(226, 232, 240, 0.95)' }}>
                Valid To
              </th>
              <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid rgba(255, 255, 255, 0.1)', fontWeight: '600', fontSize: '0.875rem', color: 'rgba(226, 232, 240, 0.95)' }}>
                Edit
              </th>
            </tr>
          </thead>
          <tbody>
            {policies.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'rgba(148, 163, 184, 0.9)' }}>
                  No policies yet. Click &quot;Add policy&quot; to create one.
                </td>
              </tr>
            ) : (
              policies.map((policy) => (
                <tr
                  key={policy.id}
                  role="row"
                  style={{
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                    cursor: 'pointer',
                    color: 'rgba(226, 232, 240, 0.95)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <td style={{ padding: '0.75rem', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    {policyTypeLabels[policy.policy_type] || policy.policy_type}
                  </td>
                  <td style={{ padding: '0.75rem', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    v{policy.version}
                  </td>
                  <td style={{ padding: '0.75rem', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    {policy.is_active ? (
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        backgroundColor: 'rgba(59, 130, 246, 0.2)',
                        color: 'rgba(147, 197, 253, 1)',
                        borderRadius: '0.25rem',
                        fontSize: '0.75rem',
                        fontWeight: '500',
                      }}>
                        Active
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td style={{ padding: '0.75rem', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    {policy.valid_from ? new Date(policy.valid_from).toLocaleDateString() : '—'}
                  </td>
                  <td style={{ padding: '0.75rem', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    {policy.valid_to ? new Date(policy.valid_to).toLocaleDateString() : '—'}
                  </td>
                  <td style={{ padding: '0.75rem', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    <button
                      type="button"
                      onClick={() => onEdit(policy)}
                      style={{
                        padding: '0.25rem 0.5rem',
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        color: 'rgba(226, 232, 240, 0.95)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '0.375rem',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        outline: 'none',
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.outline = '2px solid #3b82f6';
                        e.currentTarget.style.outlineOffset = '2px';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.outline = 'none';
                      }}
                      aria-label={`Edit policy ${policy.policy_type}`}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

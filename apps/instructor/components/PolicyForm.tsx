'use client';

import { useState, useEffect } from 'react';
import type { InstructorPolicy, CreateInstructorPolicyParams, UpdateInstructorPolicyParams, PolicyType } from '@/lib/instructorApi';
import { createInstructorPolicy, updateInstructorPolicy } from '@/lib/instructorApi';

interface PolicyFormProps {
  policy?: InstructorPolicy | null;
  existingPolicies?: InstructorPolicy[];
  onCancel: () => void;
  onSuccess: () => void;
}

const policyTypes: PolicyType[] = [
  'cancellation',
  'no_show',
  'weather',
  'payment',
  'liability',
  'meeting_point',
  'substitution',
  'group_private',
  'escalation',
];

const policyTypeLabels: Record<PolicyType, string> = {
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

const frostDeskTemplates: Record<PolicyType, { title: string; content: string }> = {
  cancellation: {
    title: 'Cancellation Policy',
    content: 'Cancellations must be made at least 24 hours in advance. Refunds are available for cancellations made more than 24 hours before the scheduled time.',
  },
  no_show: {
    title: 'No-Show Policy',
    content: 'If you do not show up for your scheduled lesson without prior notice, the full amount will be charged. Please contact us as soon as possible if you cannot attend.',
  },
  weather: {
    title: 'Weather Policy',
    content: 'Lessons may be cancelled or rescheduled due to severe weather conditions. We will contact you if weather conditions are unsafe. Full refunds or rescheduling available.',
  },
  payment: {
    title: 'Payment Policy',
    content: 'Payment is required at the time of booking. We accept major credit cards and bank transfers. All prices are in EUR unless otherwise stated.',
  },
  liability: {
    title: 'Liability Policy',
    content: 'Participants acknowledge the inherent risks of skiing/snowboarding. All participants must have appropriate insurance. The instructor is not liable for accidents or injuries.',
  },
  meeting_point: {
    title: 'Meeting Point Policy',
    content: 'Please arrive at the designated meeting point 10 minutes before your scheduled lesson time. Late arrivals may result in shortened lesson duration.',
  },
  substitution: {
    title: 'Substitution Policy',
    content: 'If you need to substitute a participant, please notify us at least 24 hours in advance. Substitutions are subject to availability and skill level matching.',
  },
  group_private: {
    title: 'Group/Private Lesson Policy',
    content: 'Group lessons have a maximum capacity. Private lessons are one-on-one. Switching between group and private lessons may require additional fees.',
  },
  escalation: {
    title: 'Escalation Policy',
    content: 'If you have concerns or complaints, please contact us directly. We will investigate and respond within 48 hours. Escalation to management is available if needed.',
  },
};

export default function PolicyForm({ policy, existingPolicies = [], onCancel, onSuccess }: PolicyFormProps) {
  const [policyType, setPolicyType] = useState<PolicyType>(policy?.policy_type || 'cancellation');
  const [title, setTitle] = useState(policy?.title || '');
  const [content, setContent] = useState(policy?.content || '');
  const [version, setVersion] = useState(policy?.version?.toString() || '1');
  const [validFrom, setValidFrom] = useState(policy?.valid_from || '');
  const [validTo, setValidTo] = useState(policy?.valid_to || '');
  const [isActive, setIsActive] = useState(policy?.is_active ?? false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (policy) {
      setPolicyType(policy.policy_type);
      setTitle(policy.title);
      setContent(policy.content);
      setVersion(policy.version.toString());
      setValidFrom(policy.valid_from || '');
      setValidTo(policy.valid_to || '');
      setIsActive(policy.is_active);
    } else {
      // Pre-load template if no policy exists for this type (only on initial mount or type change)
      const existingPolicyForType = existingPolicies.find(p => p.policy_type === policyType && p.is_active);
      if (!existingPolicyForType) {
        const template = frostDeskTemplates[policyType];
        if (template) {
          setTitle(template.title);
          setContent(template.content);
        }
      }
    }
  }, [policy, policyType, existingPolicies]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !content.trim() || !version.trim()) {
      setError('Title, content, and version are required');
      return;
    }

    const versionNum = Number(version);
    if (isNaN(versionNum) || versionNum < 1) {
      setError('Version must be a positive number');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (policy) {
        // Update existing policy
        const params: UpdateInstructorPolicyParams = {
          policy_type: policyType,
          title: title.trim(),
          content: content.trim(),
          version: versionNum,
          valid_from: validFrom.trim() || null,
          valid_to: validTo.trim() || null,
          is_active: isActive,
        };
        await updateInstructorPolicy(policy.id, params);
      } else {
        // Create new policy
        const params: CreateInstructorPolicyParams = {
          policy_type: policyType,
          title: title.trim(),
          content: content.trim(),
          version: versionNum,
          valid_from: validFrom.trim() || null,
          valid_to: validTo.trim() || null,
          is_active: isActive,
        };
        await createInstructorPolicy(params);
      }
      onSuccess();
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to save policy';
      setError(errorMessage);
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: '800px' }}>
      {error && (
        <div
          role="alert"
          aria-live="polite"
          style={{
            marginBottom: '1rem',
            padding: '0.75rem',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            color: 'rgba(252, 165, 165, 0.95)',
            borderRadius: '0.375rem',
            border: '1px solid rgba(239, 68, 68, 0.25)',
          }}
        >
          {error}
        </div>
      )}

      <div style={{ marginBottom: '1rem' }}>
        <label
          htmlFor="policy_type"
          style={{
            display: 'block',
            marginBottom: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: '500',
color: 'rgba(226, 232, 240, 0.95)',
          }}
        >
          Policy Type *
        </label>
        <select
          id="policy_type"
          value={policyType}
          onChange={(e) => {
            const newType = e.target.value as PolicyType;
            setPolicyType(newType);
            // Pre-load template if no policy exists for this type and we're creating new
            if (!policy) {
              const existingPolicyForType = existingPolicies.find(p => p.policy_type === newType && p.is_active);
              if (!existingPolicyForType) {
                const template = frostDeskTemplates[newType];
                if (template) {
                  setTitle(template.title);
                  setContent(template.content);
                }
              } else {
                // Clear if policy exists
                setTitle('');
                setContent('');
              }
            }
          }}
          required
          disabled={loading}
          style={{
            width: '100%',
            padding: '0.5rem',
border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '0.375rem',
            fontSize: '1rem',
            outline: 'none',
backgroundColor: 'rgba(15, 23, 42, 0.6)',
          }}
          onFocus={(e) => {
            e.currentTarget.style.outline = '2px solid #3b82f6';
            e.currentTarget.style.outlineOffset = '2px';
          }}
          onBlur={(e) => {
            e.currentTarget.style.outline = 'none';
          }}
          aria-required="true"
        >
          {policyTypes.map((type) => (
            <option key={type} value={type}>
              {policyTypeLabels[type]}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label
          htmlFor="title"
          style={{
            display: 'block',
            marginBottom: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: '500',
color: 'rgba(226, 232, 240, 0.95)',
          }}
        >
          Title *
        </label>
        <input
          type="text"
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          disabled={loading}
          style={{
            width: '100%',
            padding: '0.5rem',
border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '0.375rem',
            fontSize: '1rem',
            outline: 'none',
          }}
          onFocus={(e) => {
            e.currentTarget.style.outline = '2px solid #3b82f6';
            e.currentTarget.style.outlineOffset = '2px';
          }}
          onBlur={(e) => {
            e.currentTarget.style.outline = 'none';
          }}
          aria-required="true"
        />
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label
          htmlFor="content"
          style={{
            display: 'block',
            marginBottom: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: '500',
color: 'rgba(226, 232, 240, 0.95)',
          }}
        >
          Content * (Markdown allowed)
        </label>
        <textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
          disabled={loading}
          rows={10}
          style={{
            width: '100%',
            padding: '0.5rem',
border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '0.375rem',
            fontSize: '1rem',
            outline: 'none',
            fontFamily: 'monospace',
            resize: 'vertical',
          }}
          onFocus={(e) => {
            e.currentTarget.style.outline = '2px solid #3b82f6';
            e.currentTarget.style.outlineOffset = '2px';
          }}
          onBlur={(e) => {
            e.currentTarget.style.outline = 'none';
          }}
          aria-required="true"
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
        <div>
          <label
            htmlFor="version"
            style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: '500',
  color: 'rgba(226, 232, 240, 0.95)',
            }}
          >
            Version *
          </label>
          <input
            type="number"
            id="version"
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            required
            min="1"
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.5rem',
  border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '0.375rem',
              fontSize: '1rem',
              outline: 'none',
            }}
            onFocus={(e) => {
              e.currentTarget.style.outline = '2px solid #3b82f6';
              e.currentTarget.style.outlineOffset = '2px';
            }}
            onBlur={(e) => {
              e.currentTarget.style.outline = 'none';
            }}
            aria-required="true"
          />
        </div>
        <div>
          <label
            htmlFor="valid_from"
            style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: '500',
  color: 'rgba(226, 232, 240, 0.95)',
            }}
          >
            Valid From
          </label>
          <input
            type="date"
            id="valid_from"
            value={validFrom}
            onChange={(e) => setValidFrom(e.target.value)}
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.5rem',
  border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '0.375rem',
              fontSize: '1rem',
              outline: 'none',
            }}
            onFocus={(e) => {
              e.currentTarget.style.outline = '2px solid #3b82f6';
              e.currentTarget.style.outlineOffset = '2px';
            }}
            onBlur={(e) => {
              e.currentTarget.style.outline = 'none';
            }}
          />
        </div>
        <div>
          <label
            htmlFor="valid_to"
            style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: '500',
  color: 'rgba(226, 232, 240, 0.95)',
            }}
          >
            Valid To
          </label>
          <input
            type="date"
            id="valid_to"
            value={validTo}
            onChange={(e) => setValidTo(e.target.value)}
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.5rem',
  border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '0.375rem',
              fontSize: '1rem',
              outline: 'none',
            }}
            onFocus={(e) => {
              e.currentTarget.style.outline = '2px solid #3b82f6';
              e.currentTarget.style.outlineOffset = '2px';
            }}
            onBlur={(e) => {
              e.currentTarget.style.outline = 'none';
            }}
          />
        </div>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: '500',
color: 'rgba(226, 232, 240, 0.95)',
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            disabled={loading}
            style={{
              width: '1rem',
              height: '1rem',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          />
          Set as active (will deactivate other policies of the same type)
        </label>
      </div>

      <div style={{ display: 'flex', gap: '1rem' }}>
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: 'rgba(255, 255, 255, 0.04)',
color: 'rgba(226, 232, 240, 0.95)',
border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '0.375rem',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '1rem',
            outline: 'none',
          }}
          onFocus={(e) => {
            if (!loading) {
              e.currentTarget.style.outline = '2px solid #3b82f6';
              e.currentTarget.style.outlineOffset = '2px';
            }
          }}
          onBlur={(e) => {
            e.currentTarget.style.outline = 'none';
          }}
          aria-label="Cancel"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading || !title.trim() || !content.trim() || !version.trim()}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: loading ? 'rgba(148, 163, 184, 0.9)' : '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '0.375rem',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '1rem',
            fontWeight: '500',
            outline: 'none',
          }}
          onFocus={(e) => {
            if (!loading) {
              e.currentTarget.style.outline = '2px solid #3b82f6';
              e.currentTarget.style.outlineOffset = '2px';
            }
          }}
          onBlur={(e) => {
            e.currentTarget.style.outline = 'none';
          }}
          aria-label="Save policy"
        >
          {loading ? 'Saving...' : 'Save'}
        </button>
      </div>
    </form>
  );
}

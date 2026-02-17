/**
 * Instructor policy domain: structured schema (Zod) and merge strategy for PATCH.
 * Known keys and typed params; freeform is separate.
 */

import { z } from 'zod';

/** Structured policy fields: known keys with typed params. */
export const policyStructuredSchema = z.object({
  cancellation: z
    .object({
      notice_hours: z.number().int().min(0).optional(),
      refund_percent_before: z.number().min(0).max(100).optional(),
      refund_percent_after: z.number().min(0).max(100).optional(),
      text_override: z.string().max(2000).optional(),
    })
    .strict()
    .optional(),
  no_show: z
    .object({
      charge_percent: z.number().min(0).max(100).optional(),
      grace_minutes: z.number().int().min(0).optional(),
      text_override: z.string().max(2000).optional(),
    })
    .strict()
    .optional(),
  weather: z
    .object({
      reschedule_or_refund: z.enum(['reschedule', 'refund', 'either']).optional(),
      text_override: z.string().max(2000).optional(),
    })
    .strict()
    .optional(),
  payment: z
    .object({
      methods: z.array(z.string().max(50)).max(10).optional(),
      currency: z.string().length(3).optional(),
      text_override: z.string().max(2000).optional(),
    })
    .strict()
    .optional(),
  liability: z
    .object({
      waiver_required: z.boolean().optional(),
      text_override: z.string().max(2000).optional(),
    })
    .strict()
    .optional(),
  meeting_point: z
    .object({
      arrival_minutes_before: z.number().int().min(0).optional(),
      text_override: z.string().max(2000).optional(),
    })
    .strict()
    .optional(),
});

export type PolicyStructured = z.infer<typeof policyStructuredSchema>;

/** Full policy document (API shape). */
export const instructorPolicyDocumentSchema = z.object({
  instructor_id: z.string().uuid(),
  structured: policyStructuredSchema,
  freeform: z.string(),
  version: z.number().int().min(1),
  updated_by: z.string().uuid().nullable(),
  updated_at: z.string(),
});

export type InstructorPolicyDocument = z.infer<typeof instructorPolicyDocumentSchema>;

/** PATCH body: partial structured (merge) and/or partial freeform. */
export const patchInstructorPolicyBodySchema = z.object({
  structured: policyStructuredSchema.partial().optional(),
  freeform: z.string().optional(),
});

export type PatchInstructorPolicyBody = z.infer<typeof patchInstructorPolicyBodySchema>;

/**
 * Deep-merge partial structured into existing (only top-level keys present in patch).
 * Does not remove keys; only adds/overwrites.
 */
export function mergeStructured(
  existing: PolicyStructured,
  patch: Partial<PolicyStructured>
): PolicyStructured {
  const out: PolicyStructured = { ...existing };
  for (const key of Object.keys(patch) as (keyof PolicyStructured)[]) {
    const patchVal = patch[key];
    if (patchVal === undefined) continue;
    const existingVal = existing[key];
    if (existingVal != null && typeof existingVal === 'object' && typeof patchVal === 'object' && !Array.isArray(patchVal)) {
      (out as Record<string, unknown>)[key] = { ...existingVal, ...patchVal };
    } else {
      (out as Record<string, unknown>)[key] = patchVal;
    }
  }
  return out;
}

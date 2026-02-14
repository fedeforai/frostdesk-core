/**
 * Instructor policy document: one row per instructor (structured + freeform, versioned).
 * Used by GET/PATCH /instructor/policies. Audit log on PATCH with diff_jsonb.
 */

import { sql } from './client.js';
import { insertAuditEvent } from './audit_log_repository.js';
import type { PolicyStructured } from './instructor_policy_domain.js';
import { mergeStructured } from './instructor_policy_domain.js';

export interface InstructorPolicyDocumentRow {
  instructor_id: string;
  structured: PolicyStructured;
  freeform: string;
  version: number;
  updated_by: string | null;
  updated_at: string;
}

export interface PatchInstructorPolicyDocumentParams {
  instructorId: string;
  structured?: Partial<PolicyStructured>;
  freeform?: string;
  expectedVersion: number;
  updatedBy: string;
}

/**
 * Gets the policy document for an instructor. If none exists, returns default (version 1, empty).
 */
export async function getInstructorPolicyDocument(
  instructorId: string
): Promise<InstructorPolicyDocumentRow> {
  const rows = await sql<InstructorPolicyDocumentRow[]>`
    SELECT
      instructor_id,
      structured,
      freeform,
      version,
      updated_by,
      updated_at
    FROM instructor_policy_document
    WHERE instructor_id = ${instructorId}
    LIMIT 1
  `;
  if (rows.length > 0) {
    return rows[0];
  }
  return {
    instructor_id: instructorId,
    structured: {},
    freeform: '',
    version: 1,
    updated_by: null,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Patches the policy document with optimistic lock. Merges structured (deep) and optionally freeform.
 * Writes audit_log with action 'policy_patch' and payload { diff_jsonb }.
 */
export async function patchInstructorPolicyDocument(
  params: PatchInstructorPolicyDocumentParams
): Promise<InstructorPolicyDocumentRow> {
  const { instructorId, expectedVersion, updatedBy } = params;
  const existing = await getInstructorPolicyDocument(instructorId);

  const newStructured =
    params.structured !== undefined
      ? mergeStructured(existing.structured, params.structured)
      : existing.structured;
  const newFreeform = params.freeform !== undefined ? params.freeform : existing.freeform;

  const diffJsonb: Record<string, unknown> = {};
  if (params.structured !== undefined) diffJsonb.structured = params.structured;
  if (params.freeform !== undefined) diffJsonb.freeform = params.freeform;

  if (existing.version !== expectedVersion) {
    const err = new Error('Policy document was updated by another request (version mismatch)');
    (err as Error & { code: string }).code = 'VERSION_MISMATCH';
    throw err;
  }

  const newVersion = existing.version + 1;

  const exists = await sql<{ n: number }[]>`SELECT 1 AS n FROM instructor_policy_document WHERE instructor_id = ${instructorId} LIMIT 1`;
  const rowExists = exists.length > 0;

  if (rowExists) {
    const updated = await sql<InstructorPolicyDocumentRow[]>`
      UPDATE instructor_policy_document
      SET
        structured = ${JSON.stringify(newStructured)}::jsonb,
        freeform = ${newFreeform},
        version = ${newVersion},
        updated_by = ${updatedBy},
        updated_at = NOW()
      WHERE instructor_id = ${instructorId}
        AND version = ${expectedVersion}
      RETURNING
        instructor_id,
        structured,
        freeform,
        version,
        updated_by,
        updated_at
    `;
    if (updated.length === 0) {
      const err = new Error('Policy document was updated by another request (version mismatch)');
      (err as Error & { code: string }).code = 'VERSION_MISMATCH';
      throw err;
    }
    await insertAuditEvent({
      actor_type: 'instructor',
      actor_id: updatedBy,
      action: 'policy_patch',
      entity_type: 'instructor_policy',
      entity_id: instructorId,
      severity: 'info',
      payload: { diff_jsonb: diffJsonb },
    });
    return updated[0];
  }

  const inserted = await sql<InstructorPolicyDocumentRow[]>`
    INSERT INTO instructor_policy_document (instructor_id, structured, freeform, version, updated_by, updated_at)
    VALUES (${instructorId}, ${JSON.stringify(newStructured)}::jsonb, ${newFreeform}, ${newVersion}, ${updatedBy}, NOW())
    RETURNING instructor_id, structured, freeform, version, updated_by, updated_at
  `;
  await insertAuditEvent({
    actor_type: 'instructor',
    actor_id: updatedBy,
    action: 'policy_patch',
    entity_type: 'instructor_policy',
    entity_id: instructorId,
    severity: 'info',
    payload: { diff_jsonb: diffJsonb },
  });
  if (inserted.length === 0) {
    throw new Error('Failed to insert instructor policy document');
  }
  return inserted[0];
}

/**
 * AI integration hook: build policy context (rules, summary, snippets) from instructor policy document.
 * Deterministic summary for stable AI behaviour.
 */

import { getInstructorPolicyDocument } from './instructor_policy_document_repository.js';
import type { PolicyStructured } from './instructor_policy_domain.js';

export interface PolicyContext {
  rules: string[];
  summary: string;
  snippets: string[];
}

/**
 * Builds policy context for an instructor: structured rules, deterministic summary, and freeform snippets.
 */
export async function buildPolicyContext(instructorId: string): Promise<PolicyContext> {
  const doc = await getInstructorPolicyDocument(instructorId);
  const rules = structuredToRules(doc.structured);
  const summary = buildSummary(doc.structured, doc.freeform);
  const snippets = buildSnippets(doc.structured, doc.freeform);
  return { rules, summary, snippets };
}

function structuredToRules(s: PolicyStructured): string[] {
  const out: string[] = [];
  if (s.cancellation) {
    const c = s.cancellation;
    const parts: string[] = ['Cancellation:'];
    if (c.notice_hours != null) parts.push(`${c.notice_hours}h notice`);
    if (c.refund_percent_before != null) parts.push(`refund ${c.refund_percent_before}% before notice`);
    if (c.refund_percent_after != null) parts.push(`${c.refund_percent_after}% after`);
    if (c.text_override) parts.push(c.text_override);
    if (parts.length > 1) out.push(parts.join('. '));
  }
  if (s.no_show) {
    const n = s.no_show;
    const parts: string[] = ['No-show:'];
    if (n.charge_percent != null) parts.push(`charge ${n.charge_percent}%`);
    if (n.grace_minutes != null) parts.push(`${n.grace_minutes}min grace`);
    if (n.text_override) parts.push(n.text_override);
    if (parts.length > 1) out.push(parts.join('. '));
  }
  if (s.weather) {
    const w = s.weather;
    const parts: string[] = ['Weather:'];
    if (w.reschedule_or_refund) parts.push(w.reschedule_or_refund);
    if (w.text_override) parts.push(w.text_override);
    if (parts.length > 1) out.push(parts.join('. '));
  }
  if (s.payment) {
    const p = s.payment;
    const parts: string[] = ['Payment:'];
    if (p.currency) parts.push(p.currency);
    if (p.methods?.length) parts.push(p.methods.join(', '));
    if (p.text_override) parts.push(p.text_override);
    if (parts.length > 1) out.push(parts.join('. '));
  }
  if (s.liability?.waiver_required != null) {
    out.push(`Liability: waiver required ${s.liability.waiver_required}`);
    if (s.liability.text_override) out.push(s.liability.text_override);
  }
  if (s.meeting_point) {
    const m = s.meeting_point;
    const parts: string[] = ['Meeting point:'];
    if (m.arrival_minutes_before != null) parts.push(`arrive ${m.arrival_minutes_before}min before`);
    if (m.text_override) parts.push(m.text_override);
    if (parts.length > 1) out.push(parts.join('. '));
  }
  return out;
}

/** Deterministic summary: fixed order and formatting. */
function buildSummary(structured: PolicyStructured, freeform: string): string {
  const parts: string[] = [];
  const keys: (keyof PolicyStructured)[] = [
    'cancellation',
    'no_show',
    'weather',
    'payment',
    'liability',
    'meeting_point',
  ];
  for (const k of keys) {
    const v = structured[k];
    if (v && typeof v === 'object' && Object.keys(v).length > 0) {
      parts.push(`${k}: ${JSON.stringify(v)}`);
    }
  }
  if (freeform.trim()) parts.push(`freeform: ${freeform.trim().slice(0, 500)}`);
  return parts.length > 0 ? parts.join(' | ') : 'No policy set';
}

function buildSnippets(structured: PolicyStructured, freeform: string): string[] {
  const out: string[] = [];
  const rules = structuredToRules(structured);
  out.push(...rules);
  if (freeform.trim()) {
    const chunk = freeform.trim().slice(0, 1000);
    if (chunk) out.push(chunk);
  }
  return out;
}

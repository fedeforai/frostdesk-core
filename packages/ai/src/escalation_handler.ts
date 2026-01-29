export interface EscalationResult {
  escalated: true;
  reason: 'LOW_CONFIDENCE';
}

export function handleEscalation(): EscalationResult {
  return {
    escalated: true,
    reason: 'LOW_CONFIDENCE',
  };
}

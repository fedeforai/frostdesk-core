export type ConfidenceDecision = 'ALLOW' | 'ESCALATE';

export interface ConfidenceGateParams {
  confidence: number;
  threshold?: number;
}

export function confidenceGate(
  params: ConfidenceGateParams
): ConfidenceDecision {
  const { confidence, threshold = 0.7 } = params;

  if (confidence < threshold) {
    return 'ESCALATE';
  }

  return 'ALLOW';
}

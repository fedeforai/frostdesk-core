import { describe, it, expect } from 'vitest';
import {
  shouldUpdateSummary,
  estimateTokens,
  MESSAGE_THRESHOLD,
  TOKEN_BUDGET_SOFT_LIMIT,
} from './summary_policy.js';

describe('shouldUpdateSummary', () => {
  const base = {
    messageCountSinceLast: 0,
    intentChanged: false,
    bookingStateChanged: false,
    estimatedTokens: 0,
  };

  it('returns false when no triggers are met', () => {
    const result = shouldUpdateSummary(base);
    expect(result.shouldUpdate).toBe(false);
    expect(result.reason).toBeNull();
  });

  it('triggers on message count threshold', () => {
    const result = shouldUpdateSummary({
      ...base,
      messageCountSinceLast: MESSAGE_THRESHOLD,
    });
    expect(result.shouldUpdate).toBe(true);
    expect(result.reason).toBe('message_threshold');
  });

  it('triggers when intent changes', () => {
    const result = shouldUpdateSummary({
      ...base,
      intentChanged: true,
    });
    expect(result.shouldUpdate).toBe(true);
    expect(result.reason).toBe('intent_changed');
  });

  it('triggers when booking state changes', () => {
    const result = shouldUpdateSummary({
      ...base,
      bookingStateChanged: true,
    });
    expect(result.shouldUpdate).toBe(true);
    expect(result.reason).toBe('booking_state_changed');
  });

  it('triggers when token budget is exceeded', () => {
    const result = shouldUpdateSummary({
      ...base,
      estimatedTokens: TOKEN_BUDGET_SOFT_LIMIT + 1,
    });
    expect(result.shouldUpdate).toBe(true);
    expect(result.reason).toBe('token_budget_exceeded');
  });

  it('uses priority order: message threshold first', () => {
    const result = shouldUpdateSummary({
      messageCountSinceLast: MESSAGE_THRESHOLD,
      intentChanged: true,
      bookingStateChanged: true,
      estimatedTokens: TOKEN_BUDGET_SOFT_LIMIT + 1,
    });
    expect(result.shouldUpdate).toBe(true);
    expect(result.reason).toBe('message_threshold');
  });

  it('does not trigger just below threshold', () => {
    const result = shouldUpdateSummary({
      ...base,
      messageCountSinceLast: MESSAGE_THRESHOLD - 1,
    });
    expect(result.shouldUpdate).toBe(false);
  });
});

describe('estimateTokens', () => {
  it('returns 0 for empty array', () => {
    expect(estimateTokens([])).toBe(0);
  });

  it('estimates correctly for known input', () => {
    // 20 chars ≈ 5 tokens
    expect(estimateTokens(['12345678901234567890'])).toBe(5);
  });

  it('sums across multiple texts', () => {
    // 8 + 8 = 16 chars ≈ 4 tokens
    expect(estimateTokens(['12345678', '12345678'])).toBe(4);
  });
});

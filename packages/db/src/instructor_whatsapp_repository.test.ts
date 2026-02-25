/**
 * Unit tests for instructor_whatsapp_repository (getInstructorIdByPhoneNumberId).
 * Mocks the SQL client; no real DB required.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('./client.js', () => ({
  sql: vi.fn(),
}));

describe('instructor_whatsapp_repository', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // Avoid loading repository until after mock is in place; client is already mocked at hoist time
    const { sql } = await import('./client.js');
    vi.mocked(sql).mockReset();
  });

  describe('getInstructorIdByPhoneNumberId', () => {
    it('returns instructor_id when a row exists for the phone_number_id', async () => {
      const { sql } = await import('./client.js');
      vi.mocked(sql).mockResolvedValue([{ instructor_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' }] as any);

      const { getInstructorIdByPhoneNumberId } = await import('./instructor_whatsapp_repository.js');
      const result = await getInstructorIdByPhoneNumberId('meta-phone-123');

      expect(result).toBe('a1b2c3d4-e5f6-7890-abcd-ef1234567890');
      expect(sql).toHaveBeenCalledTimes(1);
    });

    it('returns null when no row exists for the phone_number_id', async () => {
      const { sql } = await import('./client.js');
      vi.mocked(sql).mockResolvedValue([] as any);

      const { getInstructorIdByPhoneNumberId } = await import('./instructor_whatsapp_repository.js');
      const result = await getInstructorIdByPhoneNumberId('unknown-phone-id');

      expect(result).toBe(null);
      expect(sql).toHaveBeenCalledTimes(1);
    });
  });
});

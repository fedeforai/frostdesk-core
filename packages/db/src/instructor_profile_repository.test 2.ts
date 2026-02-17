/**
 * Unit tests: display_name fallback for instructor profile insert (pure helper, no DB).
 */

import { describe, it, expect } from 'vitest';
import {
  resolveDisplayNameForInsert,
  type CreateInstructorProfileParamsDisplayName,
} from './instructor_profile_utils.js';

describe('instructor_profile_repository (resolveDisplayNameForInsert)', () => {
  const baseParams: CreateInstructorProfileParamsDisplayName & { full_name: string } = {
    full_name: 'Mario Rossi',
  };

  describe('resolveDisplayNameForInsert', () => {
    it('returns full_name when display_name is omitted', () => {
      expect(resolveDisplayNameForInsert(baseParams)).toBe('Mario Rossi');
    });

    it('returns full_name when display_name is undefined', () => {
      expect(resolveDisplayNameForInsert({ ...baseParams, display_name: undefined })).toBe('Mario Rossi');
    });

    it('returns "" when display_name omitted and full_name is empty', () => {
      expect(resolveDisplayNameForInsert({ ...baseParams, full_name: '' })).toBe('');
    });

    it('returns display_name when provided', () => {
      expect(resolveDisplayNameForInsert({ ...baseParams, display_name: 'Mario R.' })).toBe('Mario R.');
    });

    it('returns display_name when explicitly empty string', () => {
      expect(resolveDisplayNameForInsert({ ...baseParams, display_name: '' })).toBe('');
    });

    it('returns full_name when display_name is null (draft-friendly fallback)', () => {
      expect(resolveDisplayNameForInsert({ ...baseParams, display_name: null })).toBe('Mario Rossi');
    });
  });
});


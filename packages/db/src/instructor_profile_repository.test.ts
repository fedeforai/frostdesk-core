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
    it('returns null when display_name is omitted (no full_name fallback to avoid display_name index collisions)', () => {
      expect(resolveDisplayNameForInsert(baseParams)).toBeNull();
    });

    it('returns null when display_name is undefined', () => {
      expect(resolveDisplayNameForInsert({ ...baseParams, display_name: undefined })).toBeNull();
    });

    it('returns null when display_name omitted and full_name is empty', () => {
      expect(resolveDisplayNameForInsert({ ...baseParams, full_name: '' })).toBeNull();
    });

    it('returns display_name when provided', () => {
      expect(resolveDisplayNameForInsert({ ...baseParams, display_name: 'Mario R.' })).toBe('Mario R.');
    });

    it('returns null when display_name is explicitly empty string (treated as absent)', () => {
      expect(resolveDisplayNameForInsert({ ...baseParams, display_name: '' })).toBeNull();
    });

    it('returns null when display_name is null', () => {
      expect(resolveDisplayNameForInsert({ ...baseParams, display_name: null })).toBeNull();
    });
  });
});


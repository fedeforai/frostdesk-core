/**
 * Unit tests: JSONB schema validation for instructor profile definitive domain.
 */

import { describe, it, expect } from 'vitest';
import {
  marketingFieldsSchema,
  operationalFieldsSchema,
  pricingConfigSchema,
  aiConfigProfileSchema,
  complianceSchema,
  patchProfileBodySchema,
  instructorProfileDefinitiveSchema,
  instructorAssetSchema,
  instructorReviewDefinitiveSchema,
} from './instructor_profile_definitive_domain.js';

describe('instructor_profile_definitive_domain', () => {
  describe('marketingFieldsSchema', () => {
    it('accepts empty object', () => {
      expect(marketingFieldsSchema.parse({})).toEqual({});
    });
    it('accepts full shape', () => {
      const v = {
        shortBio: 'Ski pro',
        extendedBio: 'Long text',
        commsTone: 'friendly' as const,
        languages: ['it', 'en'],
        resorts: { base: 'Cervinia', operating: ['Cervinia', 'Zermatt'] },
      };
      expect(marketingFieldsSchema.parse(v)).toEqual(v);
    });
    it('rejects invalid commsTone', () => {
      expect(() => marketingFieldsSchema.parse({ commsTone: 'invalid' })).toThrow();
    });
  });

  describe('operationalFieldsSchema', () => {
    it('accepts empty object', () => {
      expect(operationalFieldsSchema.parse({})).toEqual({});
    });
    it('accepts constraints and equipment', () => {
      const v = {
        constraints: { maxPrivate: 4, minDurationMin: 120 },
        equipment: { offPisteAllowed: true },
      };
      expect(operationalFieldsSchema.parse(v)).toEqual(v);
    });
  });

  describe('pricingConfigSchema', () => {
    it('accepts empty object', () => {
      expect(pricingConfigSchema.parse({})).toEqual({});
    });
    it('accepts currency and multipliers', () => {
      expect(pricingConfigSchema.parse({ currency: 'EUR', multipliers: { weekend: 1.2 } })).toEqual({
        currency: 'EUR',
        multipliers: { weekend: 1.2 },
      });
    });
  });

  describe('aiConfigProfileSchema', () => {
    it('accepts empty object', () => {
      expect(aiConfigProfileSchema.parse({})).toEqual({});
    });
    it('accepts automationEnabled and guardrails', () => {
      const v = {
        automationEnabled: true,
        guardrails: { escalationKeywords: ['refund'] },
      };
      expect(aiConfigProfileSchema.parse(v)).toEqual(v);
    });
  });

  describe('complianceSchema', () => {
    it('accepts empty object', () => {
      expect(complianceSchema.parse({})).toEqual({});
    });
    it('accepts insurance and gdprConsentAt', () => {
      const v = { insurance: { verified: true }, gdprConsentAt: '2026-01-01T00:00:00Z' };
      expect(complianceSchema.parse(v)).toEqual(v);
    });
  });

  describe('patchProfileBodySchema', () => {
    it('accepts partial scalar fields', () => {
      expect(patchProfileBodySchema.parse({ full_name: 'Mario' }).full_name).toBe('Mario');
      expect(patchProfileBodySchema.parse({ display_name: 'Mario R.' }).display_name).toBe('Mario R.');
      expect(patchProfileBodySchema.parse({ timezone: 'Europe/Rome' }).timezone).toBe('Europe/Rome');
    });
    it('accepts partial JSONB (merge later)', () => {
      const out = patchProfileBodySchema.parse({ marketing_fields: { shortBio: 'Hi' } });
      expect(out.marketing_fields).toEqual({ shortBio: 'Hi' });
    });
    it('rejects unknown top-level keys when strict', () => {
      expect(() => patchProfileBodySchema.parse({ unknownKey: 1 })).toThrow();
    });
  });

  describe('instructorProfileDefinitiveSchema', () => {
    it('accepts minimal valid profile row', () => {
      const row = {
        id: '11111111-1111-4111-8111-111111111111',
        user_id: '22222222-2222-4222-8222-222222222222',
        full_name: 'Mario',
        display_name: 'Mario R.',
        slug: null,
        profile_status: 'draft',
        timezone: 'Europe/Rome',
        availability_mode: 'manual',
        calendar_sync_enabled: false,
        marketing_fields: {},
        operational_fields: {},
        pricing_config: {},
        ai_config: {},
        compliance: {},
        approval_status: 'pending',
        risk_score: 0,
        internal_notes: null,
        account_health: 'ok',
        fraud_flag: false,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      };
      expect(instructorProfileDefinitiveSchema.parse(row)).toEqual(row);
    });
  });

  describe('instructorAssetSchema', () => {
    it('accepts valid asset', () => {
      const a = {
        id: '11111111-1111-4111-8111-111111111111',
        instructor_id: '22222222-2222-4222-8222-222222222222',
        kind: 'profile_photo',
        storage_path: 'instructor/123/photo.jpg',
        mime_type: 'image/jpeg',
        meta: {},
        created_at: '2026-01-01T00:00:00Z',
      };
      expect(instructorAssetSchema.parse(a)).toEqual(a);
    });
    it('rejects invalid kind', () => {
      expect(() =>
        instructorAssetSchema.parse({
          id: '11111111-1111-4111-8111-111111111111',
          instructor_id: '22222222-2222-4222-8222-222222222222',
          kind: 'invalid_kind',
          storage_path: '/path',
          created_at: '2026-01-01T00:00:00Z',
        })
      ).toThrow();
    });
  });

  describe('instructorReviewDefinitiveSchema', () => {
    it('accepts valid review', () => {
      const r = {
        id: '11111111-1111-4111-8111-111111111111',
        instructor_id: '22222222-2222-4222-8222-222222222222',
        source: 'internal',
        rating: 5,
        title: 'Great',
        body: 'Very good lesson.',
        reviewer_name: 'Alice',
        occurred_at: '2026-01-15',
        created_at: '2026-01-16T00:00:00Z',
      };
      expect(instructorReviewDefinitiveSchema.parse(r)).toEqual(r);
    });
    it('rejects rating out of range', () => {
      expect(() =>
        instructorReviewDefinitiveSchema.parse({
          id: '11111111-1111-4111-8111-111111111111',
          instructor_id: '22222222-2222-4222-8222-222222222222',
          source: 'internal',
          rating: 6,
          created_at: '2026-01-01T00:00:00Z',
        })
      ).toThrow();
    });
  });
});

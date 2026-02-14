/**
 * Definitive instructor profile domain: JSONB shapes, InstructorAsset, InstructorReview, InstructorAiConfigVersion.
 * Type-safe; no any. Used for GET/PATCH profile, GET reviews, GET assets.
 */

import { z } from 'zod';

// ---- JSONB shapes (stable structure for marketing, operational, pricing, ai_config, compliance) ----

export const marketingFieldsSchema = z.object({
  shortBio: z.string().optional(),
  extendedBio: z.string().optional(),
  teachingPhilosophy: z.string().optional(),
  targetAudiences: z.array(z.string()).optional(),
  uspTags: z.array(z.string()).optional(),
  commsTone: z.enum(['professional', 'friendly', 'performance']).optional(),
  languages: z.array(z.string()).optional(),
  sports: z.array(z.string()).optional(),
  resorts: z.object({
    base: z.string().optional(),
    operating: z.array(z.string()).optional(),
  }).optional(),
}).passthrough();

export type MarketingFields = z.infer<typeof marketingFieldsSchema>;

export const operationalFieldsSchema = z.object({
  constraints: z.object({
    maxPrivate: z.number().optional(),
    maxGroup: z.number().optional(),
    minDurationMin: z.number().optional(),
    defaultDurationMin: z.number().optional(),
    multiDay: z.boolean().optional(),
    sameDayAllowed: z.boolean().optional(),
    advanceHours: z.number().optional(),
  }).optional(),
  location: z.object({
    allowedZones: z.array(z.string()).optional(),
    travelBufferMin: z.number().optional(),
  }).optional(),
  equipment: z.object({
    providesEquipment: z.boolean().optional(),
    offPisteAllowed: z.boolean().optional(),
    avalancheGearRequired: z.boolean().optional(),
  }).optional(),
}).passthrough();

export type OperationalFields = z.infer<typeof operationalFieldsSchema>;

export const pricingConfigSchema = z.object({
  currency: z.string().optional(),
  depositPct: z.number().optional(),
  multipliers: z.object({
    weekend: z.number().optional(),
    peakSeason: z.number().optional(),
  }).optional(),
}).passthrough();

export type PricingConfig = z.infer<typeof pricingConfigSchema>;

export const aiConfigProfileSchema = z.object({
  automationEnabled: z.boolean().optional(),
  autoConfirmEnabled: z.boolean().optional(),
  humanRequiredFor: z.object({
    priceNegotiation: z.boolean().optional(),
    offPiste: z.boolean().optional(),
    largeGroups: z.boolean().optional(),
    vip: z.boolean().optional(),
  }).optional(),
  conversation: z.object({
    tone: z.string().optional(),
    emojiAllowed: z.boolean().optional(),
    upsellEnabled: z.boolean().optional(),
  }).optional(),
  guardrails: z.object({
    neverDiscountBelowPct: z.number().optional(),
    maxGroupSizeAllowed: z.number().optional(),
    escalationKeywords: z.array(z.string()).optional(),
  }).optional(),
}).passthrough();

export type AiConfigProfile = z.infer<typeof aiConfigProfileSchema>;

export const complianceSchema = z.object({
  insurance: z.object({
    verified: z.boolean().optional(),
    expiryDate: z.string().optional(),
    docAssetId: z.string().uuid().optional(),
  }).optional(),
  contractSigned: z.boolean().optional(),
  kycStatus: z.string().optional(),
  gdprConsentAt: z.string().optional(),
}).passthrough();

export type Compliance = z.infer<typeof complianceSchema>;

// ---- InstructorProfile (definitive row: identity + JSONB sections) ----
export type ProfileStatus = 'draft' | 'active' | 'suspended';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';
export type AvailabilityMode = 'manual' | 'gcal_sync' | 'hybrid';
export type AccountHealth = 'ok' | 'watch' | 'restricted';

export interface InstructorProfileDefinitive {
  id: string;
  user_id: string;
  full_name: string;
  display_name: string;
  slug: string | null;
  profile_status: ProfileStatus;
  timezone: string;
  availability_mode: AvailabilityMode;
  calendar_sync_enabled: boolean;
  marketing_fields: MarketingFields;
  operational_fields: OperationalFields;
  pricing_config: PricingConfig;
  ai_config: AiConfigProfile;
  compliance: Compliance;
  approval_status: ApprovalStatus;
  risk_score: number;
  internal_notes: string | null;
  account_health: AccountHealth;
  fraud_flag: boolean;
  created_at: string;
  updated_at: string;
}

export const profileStatusSchema = z.enum(['draft', 'active', 'suspended']);
export const approvalStatusSchema = z.enum(['pending', 'approved', 'rejected']);
export const availabilityModeSchema = z.enum(['manual', 'gcal_sync', 'hybrid']);
export const accountHealthSchema = z.enum(['ok', 'watch', 'restricted']);

export const instructorProfileDefinitiveSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  full_name: z.string(),
  display_name: z.string(),
  slug: z.string().nullable(),
  profile_status: profileStatusSchema,
  timezone: z.string(),
  availability_mode: availabilityModeSchema,
  calendar_sync_enabled: z.boolean(),
  marketing_fields: marketingFieldsSchema,
  operational_fields: operationalFieldsSchema,
  pricing_config: pricingConfigSchema,
  ai_config: aiConfigProfileSchema,
  compliance: complianceSchema,
  approval_status: approvalStatusSchema,
  risk_score: z.number().int(),
  internal_notes: z.string().nullable(),
  account_health: accountHealthSchema,
  fraud_flag: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});

// ---- InstructorAsset ----
export type InstructorAssetKind = 'profile_photo' | 'whatsapp_photo' | 'gallery' | 'license_scan' | 'insurance_pdf' | 'other';

export interface InstructorAsset {
  id: string;
  instructor_id: string;
  kind: InstructorAssetKind;
  storage_path: string;
  mime_type: string | null;
  meta: Record<string, unknown>;
  created_at: string;
}

export const instructorAssetKindSchema = z.enum(['profile_photo', 'whatsapp_photo', 'gallery', 'license_scan', 'insurance_pdf', 'other']);
export const instructorAssetSchema = z.object({
  id: z.string().uuid(),
  instructor_id: z.string().uuid(),
  kind: instructorAssetKindSchema,
  storage_path: z.string(),
  mime_type: z.string().nullable(),
  meta: z.record(z.string(), z.unknown()).default({}),
  created_at: z.string(),
});

// ---- InstructorReview (spec-aligned: title, body, reviewer_name, occurred_at, source) ----
export type InstructorReviewSource = 'internal' | 'imported' | 'partner';

export interface InstructorReviewDefinitive {
  id: string;
  instructor_id: string;
  source: InstructorReviewSource;
  rating: number;
  title: string | null;
  body: string | null;
  reviewer_name: string | null;
  occurred_at: string | null; // date ISO
  created_at: string;
}

export const instructorReviewSourceSchema = z.enum(['internal', 'imported', 'partner']);
export const instructorReviewDefinitiveSchema = z.object({
  id: z.string().uuid(),
  instructor_id: z.string().uuid(),
  source: instructorReviewSourceSchema,
  rating: z.number().int().min(1).max(5),
  title: z.string().nullable(),
  body: z.string().nullable(),
  reviewer_name: z.string().nullable(),
  occurred_at: z.string().nullable(),
  created_at: z.string(),
});

// ---- InstructorAiConfigVersion (audit row) ----
export interface InstructorAiConfigVersion {
  id: string;
  instructor_id: string;
  ai_config: AiConfigProfile;
  created_at: string;
  created_by: string | null;
}

export const instructorAiConfigVersionSchema = z.object({
  id: z.string().uuid(),
  instructor_id: z.string().uuid(),
  ai_config: aiConfigProfileSchema,
  created_at: z.string(),
  created_by: z.string().uuid().nullable(),
});

// ---- PATCH profile: partial JSONB merge (allowed top-level keys) ----
export const patchProfileBodySchema = z.object({
  full_name: z.string().optional(),
  display_name: z.string().optional(),
  slug: z.string().nullable().optional(),
  profile_status: profileStatusSchema.optional(),
  timezone: z.string().optional(),
  availability_mode: availabilityModeSchema.optional(),
  calendar_sync_enabled: z.boolean().optional(),
  marketing_fields: marketingFieldsSchema.optional(),
  operational_fields: operationalFieldsSchema.optional(),
  pricing_config: pricingConfigSchema.optional(),
  ai_config: aiConfigProfileSchema.optional(),
  compliance: complianceSchema.optional(),
}).strict();

export type PatchProfileBody = z.infer<typeof patchProfileBodySchema>;

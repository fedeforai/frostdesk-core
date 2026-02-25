// Utils & client
export { ensureValidUUID, isValidUUID } from './utils.js';
export { sql } from './client.js';
export { createDbClient } from './supabase_client.js';

// Messages
export { insertMessage } from './messages.js';
export {
  createMessage,
  persistOutboundMessage,
  persistOutboundMessageFromEcho,
  persistInboundMessageWithInboxBridge,
  getMessagesByConversation,
} from './message_repository.js';
export type {
  Message,
  MessageDirection,
  CreateMessageParams,
  PersistInboundMessageWithInboxBridgeParams,
  PersistOutboundMessageParams,
  PersistOutboundMessageFromEchoParams,
} from './message_repository.js';

// Outbound send jobs (WhatsApp queue)
export {
  enqueueOutboundSend,
  claimNextPendingJob,
  markOutboundJobSent,
  markOutboundJobFailed,
  getOutboundQueueStats,
  OutboundQueueFullError,
} from './outbound_send_jobs_repository.js';
export type {
  OutboundSendJobStatus,
  EnqueueOutboundSendParams,
  EnqueueOutboundSendResult,
  OutboundSendJobRow,
  OutboundQueueStats,
} from './outbound_send_jobs_repository.js';

// Channel identity mapping
export {
  findChannelIdentityMapping,
  insertChannelIdentityMapping,
} from './channel_identity_mapping_repository.js';
export type { ChannelIdentityMapping } from './channel_identity_mapping_repository.js';

// Conversation
export {
  setConversationAIMode,
  getConversationById,
  resolveConversationByChannel,
  createConversation,
} from './conversation_repository.js';
export { ConversationNotFoundError } from './conversation_repository.js';
export type { Conversation, CreateConversationParams } from './conversation_repository.js';
export {
  resolveConversationForInboundMessage,
  setConversationAIModeAdmin,
} from './conversation_service.js';
export type { ResolveConversationForInboundMessageParams } from './conversation_service.js';
export {
  getConversationAiState,
  setConversationAiState,
} from './conversation_ai_state_repository.js';
export type { ConversationAiState, SetConversationAiStateParams } from './conversation_ai_state_repository.js';

// Conversation ↔ Customer linking (CM-2)
export {
  linkConversationToCustomer,
  getConversationCustomerId,
} from './conversation_customer_link.js';

// Conversation decision timeline (read-only)
export { getConversationDecisionTimeline } from './conversation_decision_timeline_repository.js';
export type {
  DecisionTimelineEventType,
  DecisionTimelineActorType,
  ConversationDecisionTimelineEvent,
} from './conversation_decision_timeline_repository.js';

// Conversation handoff
export {
  recordHandoff,
  HandoffNotOwnerError,
  HandoffConflictError,
} from './conversation_handoff_repository.js';
export type { RecordHandoffParams, RecordHandoffResult } from './conversation_handoff_repository.js';

// Inbound messages
export {
  findInboundMessageByExternalId,
  insertInboundMessage,
  getLatestInboundSenderIdentityByConversationId,
} from './inbound_messages_repository.js';
export type { InboundMessage, InsertInboundMessageParams } from './inbound_messages_repository.js';

// Booking
export {
  createBooking,
  getBookingById,
  listInstructorBookings,
  getUpcomingBookingsByConversation,
  updateBookingState,
  updateBooking,
  updateBookingDetails,
  updateBookingStatus,
  deleteBooking,
  getBookingInstructorId,
  getConfirmedOrModifiedBookingsInRange,
} from './booking_repository.js';
export { BookingNotFoundError } from './booking_repository.js';
export type { ListInstructorBookingsFilters } from './booking_repository.js';
export type { UpdateBookingDetailsPatch } from './booking_repository.js';
export type { BookingState } from './booking_state_machine.js';
export {
  InvalidBookingTransitionError,
  transitionBookingState,
  canTransition,
  isTerminal,
  isActive,
} from './booking_state_machine.js';

// Feature flags
export {
  getFeatureFlag,
  isFeatureEnabled,
  setFeatureFlag,
} from './feature_flag_repository.js';
export type { AdminFeatureFlagKey } from './feature_flag_repository.js';

// Booking expiry (read + apply pending→declined if expired)
export { getBookingByIdWithExpiryCheck } from './booking_expiry.js';

// AI booking suggestion context (read-only: availability, busySlots, recentBookings)
export { getAIBookingSuggestionContext } from './ai_booking_suggestion_repository.js';
export type { AIBookingSuggestionContext } from './ai_booking_suggestion_repository.js';

// Phone normalization (E.164)
export { normalizePhoneE164 } from './phone_normalize.js';

// Customer profiles & notes (instructor-scoped)
export {
  listInstructorCustomers,
  getCustomerById,
  upsertCustomer,
  computeCustomerValueScore,
} from './customer_profile_repository.js';
export type { CustomerProfileRow, CustomerProfileListItem } from './customer_profile_repository.js';
export {
  listNotesByCustomerId,
  createCustomerNote,
} from './customer_notes_repository.js';
export type { CustomerNoteRow } from './customer_notes_repository.js';
export { countBookingsByCustomerId, getCustomerStats, getCustomerRevenue } from './customer_repository.js';

// Booking audit (state change log)
export { recordBookingAudit } from './booking_audit.js';
export type { RecordBookingAuditParams } from './booking_audit.js';
export { listInstructorBookingAuditLogs } from './booking_audit_log_repository.js';

// Booking lifecycle
export { getBookingLifecycle } from './booking_lifecycle_repository.js';
export { getBookingLifecycleAdmin } from './booking_lifecycle_service.js';
export type { BookingLifecycleEvent, BookingLifecycleEventType } from './booking_lifecycle_repository.js';

// Booking timeline (decision/audit read-only)
export { getBookingTimeline } from './booking_timeline_repository.js';

// AI snapshot
export {
  insertAISnapshot,
  findAISnapshotByMessageId,
  listAISnapshotsByConversation,
  listAISnapshotsByConversationId,
} from './ai_snapshot_repository.js';
export type { AISnapshot, InsertAISnapshotParams } from './ai_snapshot_repository.js';

// AI draft
export { findDraftByMessageId, insertDraftOnce } from './ai_draft_repository.js';
export type { AIDraftMetadata } from './ai_draft_repository.js';
export { orchestrateInboundDraft } from './inbound_draft_orchestrator.js';
export type { InboundDraftOrchestratorParams, InboundDraftOrchestratorResult } from './inbound_draft_orchestrator.js';

// AI draft send
export { approveAndSendAIDraft } from './ai_draft_send_service.js';
export { DraftNotFoundError } from './ai_draft_send_repository.js';

// AI reply & gating
export { sendAIReply } from './ai_reply_service.js';
export { isAIEnabledForConversation } from './ai_global_gate.js';
export { getAIGatingDecision } from './ai_gating_service.js';
export { isAIEnvDisabled } from './ai_env_kill_switch.js';
export { getAIQuotaStatus } from './ai_quota_repository.js';

// AI draft service (admin) — generateDraft is injected by API so db does not depend on api
export { generateAndStoreAIDraft } from './ai_draft_service.js';
export type { GenerateDraftResult } from './ai_draft_service.js';

// AI decision snapshot
export { buildAIDecisionSnapshot } from './ai_decision_snapshot.js';

// Intent confidence
export { getIntentConfidenceTelemetry } from './intent_confidence_service.js';

// Admin access
export {
  assertAdminAccess,
  UnauthorizedError,
  isAdmin,
  getUserRole,
  assertRoleAllowed,
  assertAuthenticated,
} from './admin_access.js';
export { RoleNotAllowedError, AuthenticationRequiredError } from './admin_access.js';

// Admin read models / services
export { getAdminDashboardMetricsReadModel } from './admin_dashboard_service.js';
export { getAdminKPISnapshotReadModel } from './admin_kpi_service.js';
export { getComprehensiveDashboardReadModel } from './admin_comprehensive_dashboard_service.js';
export { getComprehensiveDashboard } from './admin_comprehensive_dashboard_repository.js';
export type { ComprehensiveDashboard } from './admin_comprehensive_dashboard_repository.js';
export { getAdminConversations } from './admin_conversation_service.js';
export { getAdminBookings, adminOverrideBookingStatus } from './admin_booking_service.js';
export type { GetAdminBookingsParams, AdminOverrideBookingStatusParams } from './admin_booking_service.js';
export { getAdminBookingDetail } from './admin_booking_detail_service.js';
export { getAdminMessages } from './admin_message_service.js';
export { getHumanInboxDetailReadModel } from './human_inbox_detail_service.js';
export { getHumanInbox } from './human_inbox_service.js';
export type { GetHumanInboxParams, HumanInboxItem } from './human_inbox_service.js';
export { getConversationTimelineReadModel } from './conversation_timeline_service.js';
export { getSystemDegradationSignalsReadModel } from './system_degradation_service.js';
export { getSystemHealth } from './system_health_service.js';

// Instructor profile (repository)
export {
  getInstructorProfile,
  getInstructorProfileByUserId,
  createInstructorProfile,
  updateInstructorProfile,
  updateInstructorProfileByUserId,
  updateInstructorProfileByUserIdExtended,
  completeInstructorOnboarding,
} from './instructor_profile_repository.js';
export type {
  InstructorProfile,
  UpdateInstructorProfileParams,
  CreateInstructorProfileParams,
  UpdateInstructorProfileByUserIdParams,
  UpdateInstructorProfileByUserIdExtendedParams,
} from './instructor_profile_repository.js';

// Instructor referrals (trusted peers)
export { listReferralsForInstructor, isReferredInstructor } from './instructor_referrals_repository.js';
export type { InstructorReferralRow, ReferralWithProfile } from './instructor_referrals_repository.js';

// Instructor dashboard (read-only aggregated data)
export { getInstructorDashboardData } from './instructor_dashboard_repository.js';
export type { InstructorDashboardData } from './instructor_dashboard_repository.js';

// Instructor KPIs (read-only aggregation)
export { getRevenueKpi, getFunnelKpi, getBusinessKpi, parseWindow } from './instructor_kpi_repository.js';
export type { RevenueKpi, FunnelKpi, BusinessKpi } from './instructor_kpi_repository.js';

// Instructor availability (repository)
export {
  getInstructorAvailability,
  listInstructorAvailability,
  upsertInstructorAvailability,
  createInstructorAvailability,
  updateInstructorAvailability,
  deactivateInstructorAvailability,
  findInstructorAvailabilityBySlot,
  toggleInstructorAvailability,
} from './instructor_availability_repository.js';
export { InstructorAvailabilityNotFoundError } from './instructor_availability_repository.js';
export type {
  InstructorAvailability,
  UpsertInstructorAvailabilityParams,
  CreateInstructorAvailabilityParams,
  UpdateInstructorAvailabilityParams,
} from './instructor_availability_repository.js';

// Availability vs calendar conflicts (read-only)
export { listAvailabilityCalendarConflicts } from './availability_conflict_repository.js';
export type { AvailabilityCalendarConflict } from './availability_conflict_repository.js';

// Calendar conflicts (read-only, for instructor calendar UI)
export { getCalendarConflicts } from './calendar_conflict_repository.js';
export type {
  CalendarConflictDto,
  GetCalendarConflictsParams,
  ConflictSource,
  ConflictProvider,
} from './calendar_conflict_repository.js';

// Availability enforcement (conflict validation before booking creation)
export { validateAvailability, AvailabilityConflictError } from './availability_validation.js';
export type { ValidateAvailabilityParams } from './availability_validation.js';

// Availability overrides (date-specific add/remove)
export {
  listAvailabilityOverridesInRange,
  createAvailabilityOverride,
  deleteAvailabilityOverride,
} from './availability_overrides_repository.js';
export type {
  InstructorAvailabilityOverride,
  CreateAvailabilityOverrideParams,
} from './availability_overrides_repository.js';

// Calendar connections (Google etc.)
export {
  getCalendarConnection,
  upsertCalendarConnection,
  updateCalendarConnectionSync,
} from './calendar_connections_repository.js';
export type { CalendarConnection, CalendarConnectionStatus } from './calendar_connections_repository.js';

// Calendar events cache (list for instructor calendar UI)
export { listInstructorEvents } from './calendar_events_cache_repository.js';
export type { CalendarEventCache } from './calendar_events_cache_repository.js';

// External busy blocks (mirror of Google busy events)
export {
  listExternalBusyBlocksInRange,
  upsertExternalBusyBlock,
  deleteExternalBusyBlocksByConnection,
} from './external_busy_blocks_repository.js';
export type { ExternalBusyBlock } from './external_busy_blocks_repository.js';

// Sellable slots (core domain)
export { computeSellableSlots, computeSellableSlotsFromInput } from './compute_sellable_slots.js';
export type {
  SellableSlot,
  ComputeSellableSlotsParams,
  ComputeSellableSlotsResult,
  ExcludedRange,
} from './compute_sellable_slots.js';

// Instructor domain (types + Zod for API boundaries)
export type {
  InstructorProfile as InstructorProfileDomain,
  InstructorService as InstructorServiceDomain,
  AvailabilityWindow,
  AvailabilityOverride as AvailabilityOverrideDomain,
  ExternalBusyBlock as ExternalBusyBlockDomain,
  InstructorAIConfig,
  ComputeSellableSlotsInput,
} from './instructor_domain.js';
export {
  instructorProfileStatusSchema,
  instructorProfileSchema,
  lessonTypeSchema,
  instructorServiceSchema,
  availabilityWindowSchema,
  availabilityOverrideSchema,
  externalBusyBlockSchema,
  escalationModeSchema,
  instructorAIConfigSchema,
  sellableSlotSchema,
  computeSellableSlotsInputSchema,
} from './instructor_domain.js';

// Instructor profile definitive (JSONB shapes, assets, reviews, ai_versions)
export {
  getInstructorProfileDefinitiveByUserId,
  patchInstructorProfileByUserId,
  listInstructorReviews,
  listInstructorAssets,
} from './instructor_profile_definitive_repository.js';
export type { InstructorProfileDefinitiveRow } from './instructor_profile_definitive_repository.js';
export type {
  InstructorProfileDefinitive,
  InstructorAsset,
  InstructorReviewDefinitive,
  InstructorAiConfigVersion,
  MarketingFields,
  OperationalFields,
  PricingConfig,
  AiConfigProfile,
  Compliance,
  PatchProfileBody,
  BillingStatus,
} from './instructor_profile_definitive_domain.js';
export {
  marketingFieldsSchema,
  operationalFieldsSchema,
  pricingConfigSchema,
  aiConfigProfileSchema,
  complianceSchema,
  instructorProfileDefinitiveSchema,
  instructorAssetSchema,
  instructorReviewDefinitiveSchema,
  instructorAiConfigVersionSchema,
  patchProfileBodySchema,
} from './instructor_profile_definitive_domain.js';

// Instructor services (repository)
export {
  getInstructorServices,
  listInstructorServices,
  createInstructorService,
  updateInstructorService,
} from './instructor_services_repository.js';
export type {
  InstructorService,
  CreateInstructorServiceParams,
  UpdateInstructorServiceParams,
  LessonType,
} from './instructor_services_repository.js';

// Instructor meeting points (repository)
export {
  listInstructorMeetingPoints,
  createInstructorMeetingPoint,
  updateInstructorMeetingPoint,
} from './instructor_meeting_points_repository.js';
export type {
  InstructorMeetingPoint,
  CreateInstructorMeetingPointParams,
  UpdateInstructorMeetingPointParams,
} from './instructor_meeting_points_repository.js';

// Instructor guardrails (repository)
export { getInstructorGuardrails, updateInstructorGuardrails } from './instructor_guardrails_repository.js';
export type { InstructorGuardrails, UpdateInstructorGuardrailsPatch } from './instructor_guardrails_repository.js';

// Instructor WhatsApp (repository — linking only)
export {
  getInstructorIdByPhoneNumberId,
  getInstructorWhatsappAccount,
  connectInstructorWhatsappAccount,
  verifyInstructorWhatsappAccount,
  listInstructorWhatsappAccounts,
} from './instructor_whatsapp_repository.js';
export type {
  InstructorWhatsappAccount,
  ConnectInstructorWhatsappParams,
  VerifyInstructorWhatsappParams,
  ListInstructorWhatsappAccountRow,
} from './instructor_whatsapp_repository.js';

// Instructor inbox (repository — read-only)
export { getInstructorInbox } from './instructor_inbox_repository.js';
export type { InstructorInboxItem } from './instructor_inbox_repository.js';

// Instructor policy document (one row per instructor, versioned, audit on PATCH)
export {
  getInstructorPolicyDocument,
  patchInstructorPolicyDocument,
} from './instructor_policy_document_repository.js';
export type {
  InstructorPolicyDocumentRow,
  PatchInstructorPolicyDocumentParams,
} from './instructor_policy_document_repository.js';
export {
  policyStructuredSchema,
  instructorPolicyDocumentSchema,
  patchInstructorPolicyBodySchema,
  mergeStructured,
} from './instructor_policy_domain.js';
export type {
  PolicyStructured,
  InstructorPolicyDocument,
  PatchInstructorPolicyBody,
} from './instructor_policy_domain.js';
export { buildPolicyContext } from './instructor_policy_context.js';
export type { PolicyContext } from './instructor_policy_context.js';

// Audit log (append-only)
export { insertAuditEvent, listAuditLog } from './audit_log_repository.js';
export type {
  InsertAuditEventParams,
  AuditLogRow,
  ListAuditLogParams,
  ListAuditLogResult,
  AuditEventActorType,
  AuditEventEntityType,
  AuditEventSeverity,
} from './audit_log_repository.js';

// Instructor reply (FEATURE 2.8 — manual reply v1)
export {
  insertInstructorReply,
  markConversationHumanHandled,
} from './instructor_reply_repository.js';
export type {
  InstructorReplyMessage,
  InsertInstructorReplyParams,
} from './instructor_reply_repository.js';

// Instructor draft lifecycle (STEP 4.1 — ai_drafts + events)
export {
  upsertProposedDraft,
  getDraftById,
  getActiveDraftForConversation,
  markDraftUsed,
  markDraftIgnored,
  computeEffectiveState,
} from './instructor_draft_repository.js';
export { DraftNotFoundError as InstructorDraftNotFoundError } from './instructor_draft_repository.js';
export type { AiDraftRow, AiDraftState } from './instructor_draft_repository.js';
export {
  insertInstructorDraftEvent,
  getInstructorDraftKpiSummary,
} from './instructor_draft_events_repository.js';
export type {
  InsertInstructorDraftEventParams,
  KpiWindow,
  InstructorDraftKpiSummary,
} from './instructor_draft_events_repository.js';

// Instructor approval (admin) & ensure-profile (gate)
export {
  listPendingInstructors,
  setInstructorApprovalStatus,
  listAllInstructorProfiles,
  ensureInstructorProfile,
} from './instructor_approval_repository.js';
export type {
  PendingInstructor,
  InstructorApprovalRow,
  AdminInstructorRow,
  ListAllInstructorProfilesParams,
  ListAllInstructorProfilesResult,
  EnsureInstructorProfileRow,
} from './instructor_approval_repository.js';

// Booking field extraction (pure regex, no LLM)
export { extractBookingFields } from './booking_field_extractor.js';
export type { ExtractedBookingFields, BookingExtractionResult } from './booking_field_extractor.js';

// AI Booking Drafts (structured booking proposals from AI)
export {
  insertAIBookingDraft,
  listAIBookingDrafts,
  getAIBookingDraftById,
  confirmAIBookingDraft as confirmAIBookingDraftV2,
  rejectAIBookingDraft,
  countPendingBookingDrafts,
  getPendingBookingDraftByConversation,
  getConfirmedBookingIdsByConversation,
} from './ai_booking_draft_repository_v2.js';
export type {
  AIBookingDraftRow,
  BookingDraftStatus,
  InsertAIBookingDraftParams,
} from './ai_booking_draft_repository_v2.js';

// Conversation suggested actions (inbox: when human action needed)
export { getSuggestedActionsForConversation } from './conversation_suggested_actions.js';
export type { SuggestedAction } from './conversation_suggested_actions.js';

// P2.1: AI Draft → Booking (atomic confirmation)
export { confirmAIBookingDraftWithAudit } from './ai_booking_confirm_repository.js';
export type {
  ConfirmAIBookingDraftInput,
  ConfirmAIBookingDraftResult,
} from './ai_booking_confirm_repository.js';

// Instructor Stripe Connect (repository)
export {
  getInstructorStripeInfo,
  saveStripeAccountId,
  updateStripeConnectStatus,
  findInstructorByStripeAccountId,
} from './instructor_stripe_repository.js';
export type {
  StripeConnectStatus,
  InstructorStripeInfo,
} from './instructor_stripe_repository.js';

// Booking payment Connect (repository)
export {
  getBookingPayment,
  setBookingPaymentPending,
  setBookingPaymentPaid,
  setBookingPaymentFailed,
  getBookingByCheckoutSession,
} from './booking_payment_connect_repository.js';
export type {
  PaymentStatus,
  BookingPaymentRow,
} from './booking_payment_connect_repository.js';

// Stripe webhook idempotency
export { tryInsertStripeWebhookEvent } from './stripe_webhook_repository.js';

// AI behavior events (instructor actions for tracking)
export { insertAiBehaviorEvent } from './ai_behavior_events_repository.js';
export type { AiBehaviorEventRow } from './ai_behavior_events.js';

// Booking auto-confirm on payment
export { autoConfirmBookingIfEligible } from './booking_auto_confirm.js';

// Instructor subscriptions (Stripe billing)
export {
  getInstructorSubscription,
  findInstructorSubscriptionByStripeSubId,
  upsertInstructorSubscription,
} from './instructor_subscription_repository.js';
export type { SubscriptionStatus } from './instructor_subscription_repository.js';

// Dev-only: Simulation harness helpers
export {
  createOrGetCustomerProfile,
  normalizePhone,
  listAuditSince,
  listBookingsSince,
  listConversationAuditSince,
  seedBookingForTest,
} from './dev/sim_harness_repository.js';
export type {
  CustomerSource,
  SimCustomerProfile,
  SimAuditRow,
  SimBookingRow,
  SeedBookingParams,
} from './dev/sim_harness_repository.js';

// Loop B: AI usage telemetry
export {
  insertAiUsageEvent,
  getAiUsageSummary,
  getAiUsageByInstructor,
  getAiUsageByConversation,
  getAiCostSpikes,
  getAiCostSummary,
} from './ai_usage_repository.js';
export type {
  InsertAiUsageEventParams,
  AiUsageWindow,
  AiUsageSummary,
  InstructorAiUsage,
  ConversationAiUsage,
  AiCostSpike,
  AiCostSummary,
} from './ai_usage_repository.js';

// Loop C: Customer booking context (read-only suggestion memory)
export { getLastCompletedBookingContext } from './customer_booking_context.js';
export type { CustomerBookingContext } from './customer_booking_context.js';

// Reschedule context (read-only booking lookup for AI draft enrichment)
export { findActiveBookingForReschedule } from './reschedule_context_repository.js';
export type { ActiveBookingForReschedule } from './reschedule_context_repository.js';

// Rolling Summary (token control)
export {
  getConversationSummary,
  getMessageCountSinceLastSummary,
  getRecentMessagesForSummary,
  updateConversationSummary,
} from './conversation_summary_repository.js';
export type {
  ConversationSummary,
  UpdateConversationSummaryParams,
} from './conversation_summary_repository.js';

export {
  shouldUpdateSummary,
  estimateTokens,
  MESSAGE_THRESHOLD,
  TOKEN_BUDGET_SOFT_LIMIT,
} from './summary_policy.js';
export type {
  SummaryPolicyInput,
  SummaryPolicyOutput,
  SummaryTriggerReason,
} from './summary_policy.js';

export { generateSummary } from './summary_generator.js';
export type { SummaryInput, SummaryOutput } from './summary_generator.js';

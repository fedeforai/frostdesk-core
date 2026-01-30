// Utils & client
export { ensureValidUUID, isValidUUID } from './utils.js';
export { sql } from './client.js';
export { createDbClient } from './supabase_client.js';

// Messages
export { insertMessage } from './messages.js';
export {
  createMessage,
  persistOutboundMessage,
  persistInboundMessageWithInboxBridge,
  getMessagesByConversation,
} from './message_repository.js';
export type {
  Message,
  MessageDirection,
  CreateMessageParams,
  PersistInboundMessageWithInboxBridgeParams,
  PersistOutboundMessageParams,
} from './message_repository.js';

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

// Inbound messages
export {
  findInboundMessageByExternalId,
  insertInboundMessage,
  getLatestInboundSenderIdentityByConversationId,
} from './inbound_messages_repository.js';
export type { InboundMessage, InsertInboundMessageParams } from './inbound_messages_repository.js';

// Booking
export { updateBookingState } from './booking_repository.js';
export { BookingNotFoundError } from './booking_repository.js';
export type { BookingState } from './booking_state_machine.js';
export { InvalidBookingTransitionError, transitionBookingState } from './booking_state_machine.js';

// Feature flags
export { getFeatureFlag, isFeatureEnabled } from './feature_flag_repository.js';

// Booking lifecycle
export { getBookingLifecycle } from './booking_lifecycle_repository.js';
export { getBookingLifecycleAdmin } from './booking_lifecycle_service.js';
export type { BookingLifecycleEvent, BookingLifecycleEventType } from './booking_lifecycle_repository.js';

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
  completeInstructorOnboarding,
} from './instructor_profile_repository.js';
export type {
  InstructorProfile,
  UpdateInstructorProfileParams,
  CreateInstructorProfileParams,
  UpdateInstructorProfileByUserIdParams,
} from './instructor_profile_repository.js';

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
} from './instructor_services_repository.js';

// Instructor guardrails (repository)
export { getInstructorGuardrails, updateInstructorGuardrails } from './instructor_guardrails_repository.js';
export type { InstructorGuardrails, UpdateInstructorGuardrailsPatch } from './instructor_guardrails_repository.js';

// Instructor WhatsApp (repository — linking only)
export {
  getInstructorWhatsappAccount,
  connectInstructorWhatsappAccount,
  verifyInstructorWhatsappAccount,
} from './instructor_whatsapp_repository.js';
export type {
  InstructorWhatsappAccount,
  VerifyInstructorWhatsappParams,
} from './instructor_whatsapp_repository.js';

// Instructor inbox (repository — read-only)
export { getInstructorInbox } from './instructor_inbox_repository.js';
export type { InstructorInboxItem } from './instructor_inbox_repository.js';

// Instructor reply (FEATURE 2.8 — manual reply v1)
export {
  insertInstructorReply,
  markConversationHumanHandled,
} from './instructor_reply_repository.js';
export type {
  InstructorReplyMessage,
  InsertInstructorReplyParams,
} from './instructor_reply_repository.js';

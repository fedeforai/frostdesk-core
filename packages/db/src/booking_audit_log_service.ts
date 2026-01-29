import { listInstructorBookingAuditLogs } from './booking_audit_log_repository.js';

export async function getInstructorBookingAuditLogsService(userId: string) {
  return listInstructorBookingAuditLogs(userId);
}

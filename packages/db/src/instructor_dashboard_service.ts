import { getInstructorDashboardData } from './instructor_dashboard_repository.js';

export async function getInstructorDashboardService(userId: string) {
  return getInstructorDashboardData(userId);
}

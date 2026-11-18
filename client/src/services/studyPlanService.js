import { api } from './api';

export const studyPlanService = {
  /**
   * Get daily study plan for a specific date (defaults to today)
   */
  async getDailyPlan(date) {
    const query = date ? `?date=${encodeURIComponent(date)}` : '';
    const res = await api.get(`/study-plan/daily${query}`);
    return res.data;
  },

  /**
   * Get weekly schedule (7 days)
   */
  async getWeeklySchedule(startDate) {
    const query = startDate ? `?startDate=${encodeURIComponent(startDate)}` : '';
    const res = await api.get(`/study-plan/weekly${query}`);
    return res.data;
  },

  /**
   * Save or update daily study plan
   */
  async saveDailyPlan(planData) {
    const res = await api.post('/study-plan', planData);
    return res.data;
  },

  /**
   * Toggle task completion inside a study plan
   */
  async toggleTask(planId, taskId) {
    const res = await api.patch(`/study-plan/${planId}/task/${taskId}`);
    return res.data;
  },
};

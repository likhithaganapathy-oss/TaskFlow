import { api } from './api';

export const notificationService = {
  /**
   * Fetch user notifications
   */
  async getNotifications(unreadOnly = false, limit = 20) {
    const query = new URLSearchParams();
    if (unreadOnly) query.append('unreadOnly', 'true');
    if (limit) query.append('limit', limit);
    return await api.get(`/notifications?${query.toString()}`);
  },

  /**
   * Mark a single notification as read
   */
  async markRead(id) {
    return await api.patch(`/notifications/${id}/read`);
  },

  /**
   * Mark all notifications as read
   */
  async markAllRead() {
    return await api.patch('/notifications/read-all');
  },
};

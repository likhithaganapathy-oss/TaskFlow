import { api } from './api';

export const aiService = {
  /**
   * Request study assistance from TaskFlow AI
   * action: 'summarize' | 'explain' | 'schedule' | 'breakdown' | 'chat'
   */
  async getAssistance({ action, title, subject, description, query }) {
    return await api.post('/ai/assistant', {
      action,
      title,
      subject,
      description,
      query,
    });
  },
};

import { api } from './api';

export const taskService = {
  /**
   * Fetch assignments with optional search, filter, and sort queries
   */
  async getTasks(params = {}) {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.subject && params.subject !== 'All') query.append('subject', params.subject);
    if (params.status && params.status !== 'All') query.append('status', params.status);
    if (params.priority && params.priority !== 'All') query.append('priority', params.priority);
    if (params.scope && params.scope !== 'All') query.append('scope', params.scope);
    if (params.sort) query.append('sort', params.sort);

    const queryString = query.toString();
    const endpoint = queryString ? `/tasks?${queryString}` : '/tasks';
    return await api.get(endpoint);
  },

  /**
   * Get a single assignment by ID
   */
  async getTask(id) {
    return await api.get(`/tasks/${id}`);
  },

  /**
   * Create a new assignment
   */
  async createTask(taskData) {
    return await api.post('/tasks', taskData);
  },

  /**
   * Update an existing assignment
   */
  async updateTask(id, taskData) {
    return await api.put(`/tasks/${id}`, taskData);
  },

  /**
   * Update task status (Pending, In Progress, Completed)
   */
  async updateTaskStatus(id, status) {
    return await api.patch(`/tasks/${id}/status`, { status });
  },

  /**
   * Delete an assignment
   */
  async deleteTask(id) {
    return await api.delete(`/tasks/${id}`);
  },
};


import { api } from './api';

export const adminService = {
  /**
   * Fetch institutional statistics for admin dashboard
   */
  async getStats() {
    return await api.get('/admin/stats');
  },

  /**
   * Fetch all registered student accounts with their assignment metrics
   */
  async getStudents(search = '') {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    return await api.get(`/admin/users${query}`);
  },

  /**
   * Delete a student account and cascade-delete their assignments
   */
  async deleteStudent(id) {
    return await api.delete(`/admin/users/${id}`);
  },

  /**
   * Create a new student account (Admin)
   */
  async createStudent(studentData) {
    return await api.post('/admin/users', studentData);
  },

  /**
   * Update student details (Admin)
   */
  async updateStudent(id, studentData) {
    return await api.put(`/admin/users/${id}`, studentData);
  },

  /**
   * Toggle student activation status
   */
  async toggleStudentStatus(id) {
    return await api.patch(`/admin/users/${id}/status`);
  },

  /**
   * Send institutional announcement to all or selected students
   */
  async sendAnnouncement(data) {
    return await api.post('/admin/announcements', data);
  },

  /**
   * Fetch assignments across all students with filters
   */
  async getAllTasks(params = {}) {
    const query = new URLSearchParams();
    if (params.studentId && params.studentId !== 'All') query.append('studentId', params.studentId);
    if (params.scope && params.scope !== 'All') query.append('scope', params.scope);
    if (params.category && params.category !== 'All') query.append('category', params.category);
    if (params.search) query.append('search', params.search);
    if (params.subject && params.subject !== 'All') query.append('subject', params.subject);
    if (params.status && params.status !== 'All') query.append('status', params.status);
    if (params.priority && params.priority !== 'All') query.append('priority', params.priority);
    if (params.sort) query.append('sort', params.sort);

    const queryString = query.toString();
    const endpoint = queryString ? `/admin/tasks?${queryString}` : '/admin/tasks';
    return await api.get(endpoint);
  },

  /**
   * Create an assignment assigned to all, specific student, or group
   */
  async createTaskForStudent(taskData) {
    return await api.post('/admin/tasks', taskData);
  },

  /**
   * Update any assignment
   */
  async updateTask(id, taskData) {
    return await api.put(`/admin/tasks/${id}`, taskData);
  },

  /**
   * Fetch student submissions for an assignment
   */
  async getSubmissions(taskId) {
    return await api.get(`/admin/tasks/${taskId}/submissions`);
  },

  /**
   * Grade a student submission with marks & feedback
   */
  async gradeSubmission(taskId, { studentId, marks, maxMarks, feedback }) {
    return await api.post(`/admin/tasks/${taskId}/grade`, {
      studentId,
      marks,
      maxMarks,
      feedback,
    });
  },

  /**
   * Delete any assignment
   */
  async deleteTask(id) {
    return await api.delete(`/admin/tasks/${id}`);
  },

  /**
   * Fetch submission monitoring overview across all students
   */
  async getSubmissionOverview() {
    const res = await api.get('/admin/submissions/overview');
    return res.data;
  },

  /**
   * Fetch exportable report dataset
   */
  async getReportData(type) {
    const res = await api.get(`/admin/reports/${type}`);
    return res.data;
  },

  /**
   * Fetch institutional calendar events
   */
  async getCalendarEvents() {
    const res = await api.get('/admin/calendar/events');
    return res.data;
  },

  /**
   * Create institutional calendar event
   */
  async createCalendarEvent(data) {
    const res = await api.post('/admin/calendar/events', data);
    return res.data;
  },

  /**
   * Delete institutional calendar event
   */
  async deleteCalendarEvent(id) {
    const res = await api.delete(`/admin/calendar/events/${id}`);
    return res.data;
  },
};

import { api } from './api';

export const subjectService = {
  async getSubjects() {
    const res = await api.get('/subjects');
    return res.data;
  },

  async createSubject(data) {
    const res = await api.post('/subjects', data);
    return res.data;
  },

  async updateSubject(id, data) {
    const res = await api.put(`/subjects/${id}`, data);
    return res.data;
  },

  async deleteSubject(id) {
    const res = await api.delete(`/subjects/${id}`);
    return res.data;
  },
};

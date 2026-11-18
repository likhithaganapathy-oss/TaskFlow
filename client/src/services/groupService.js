import { api } from './api';

export const groupService = {
  async getGroups() {
    const res = await api.get('/groups');
    return res.data;
  },

  async createGroup(data) {
    const res = await api.post('/groups', data);
    return res.data;
  },

  async updateGroup(id, data) {
    const res = await api.put(`/groups/${id}`, data);
    return res.data;
  },

  async deleteGroup(id) {
    const res = await api.delete(`/groups/${id}`);
    return res.data;
  },
};

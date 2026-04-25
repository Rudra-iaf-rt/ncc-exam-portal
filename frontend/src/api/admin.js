import apiClient from './client';

export const adminApi = {
  getUsers: () => apiClient.get('/admin/users'),
  createUser: (userData) => apiClient.post('/admin/users', userData),
  updateUser: (id, userData) => apiClient.patch(`/admin/users/${id}`, userData),
  deleteUser: (id) => apiClient.delete(`/admin/users/${id}`),
  bulkImport: (formData) => apiClient.post('/admin/users/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),

  getStats: () => apiClient.get('/admin/stats'),
  getLogs: () => apiClient.get('/admin/logs'),

  getAssignments: () => apiClient.get('/admin/assignments'),
  createAssignments: (data) => apiClient.post('/admin/assignments', data),
  deleteAssignment: (id) => apiClient.delete(`/admin/assignments/${id}`),

  getExams: () => apiClient.get('/admin/exams'),
  updateResult: (id, data) => apiClient.patch(`/admin/results/${id}`, data),
  searchUsers: (params) => apiClient.get('/admin/users/search', { params }),
  getFilters: () => apiClient.get('/admin/users/filters'),
};

export default adminApi;

import apiClient from './client';

export const adminApi = {
  getUsers: (params) => apiClient.get('/admin/users', { params }),
  getStaff: () => apiClient.get('/admin/users', { params: { role: 'INSTRUCTOR' } }),
  createUser: (userData) => apiClient.post('/admin/users', userData),
  updateUser: (id, userData) => apiClient.patch(`/admin/users/${id}`, userData),
  deleteUser: (id) => apiClient.delete(`/admin/users/${id}`),
  getUserStats: (id) => apiClient.get(`/admin/users/${id}/stats`),
  bulkImport: (formData) => apiClient.post('/admin/users/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  bulkManageExams: (enable) => apiClient.put('/users/bulk-manage-exams', { enable }),

  // Colleges
  getColleges: () => apiClient.get('/admin/colleges'),
  createCollege: (data) => apiClient.post('/admin/colleges', data),
  updateCollege: (id, data) => apiClient.patch(`/admin/colleges/${id}`, data),
  deleteCollege: (id) => apiClient.delete(`/admin/colleges/${id}`),

  getStats: () => apiClient.get('/admin/stats'),
  getLogs: () => apiClient.get('/admin/logs'),

  // Batches
  getBatches: () => apiClient.get('/admin/batches'),
  createBatch: (data) => apiClient.post('/admin/batches', data),
  updateBatch: (id, data) => apiClient.patch(`/admin/batches/${id}`, data),
  deleteBatch: (id) => apiClient.delete(`/admin/batches/${id}`),

  getAssignments: () => apiClient.get('/admin/assignments'),
  createAssignments: (data) => apiClient.post('/admin/assignments', data),
  deleteAssignment: (id) => apiClient.delete(`/admin/assignments/${id}`),

  getExams: () => apiClient.get('/admin/exams'),
  updateResult: (id, data) => apiClient.patch(`/admin/results/${id}`, data),
  bulkEmailResults: (data) => apiClient.post('/results/bulk-email', data),
  bulkDeleteResults: (data) => apiClient.post('/results/bulk-delete', data),
  searchUsers: (params) => apiClient.get('/admin/users/search', { params }),

  // Groups
  getGroups: () => apiClient.get('/admin/groups'),
  getGroup: (id) => apiClient.get(`/admin/groups/${id}`),
  createGroup: (data) => apiClient.post('/admin/groups', data),
  updateGroup: (id, data) => apiClient.put(`/admin/groups/${id}`, data),
  deleteGroup: (id) => apiClient.delete(`/admin/groups/${id}`),
  bulkDisableGroups: (data) => apiClient.post('/admin/groups/bulk-disable', data),
  bulkEnableGroups: (data) => apiClient.post('/admin/groups/bulk-enable', data),

  getFilters: () => apiClient.get('/admin/users/filters'),
  
  bulkDisableUsers: (data) => apiClient.post('/admin/users/bulk-disable', data),
  bulkDisableMaterials: (data) => apiClient.post('/admin/materials/bulk-disable', data),
  bulkVerifyMaterials: (data) => apiClient.post('/admin/materials/bulk-verify', data),
  bulkStatusExams: (data) => apiClient.post('/admin/exams/bulk-status', data),
  
  getLiveMonitor: (examId) => apiClient.get(`/admin/exams/${examId}/live-monitor`),
  getExamAnalytics: (examId) => apiClient.get(`/admin/exams/${examId}/analytics`),

  // Performance diagnostics (admin-only, reads backend ring buffer)
  getPerfData: (params) => apiClient.get('/admin/perf', { params, bypassCache: true }),
};

export default adminApi;

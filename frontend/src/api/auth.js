import apiClient from './client';

export const authApi = {
  login: (credentials) => apiClient.post('/auth/login', credentials),
  loginStaff: (credentials) => apiClient.post('/auth/login/staff', credentials),
  logout: () => apiClient.post('/auth/logout'),
  refresh: () => apiClient.post('/auth/refresh'),
  getMe: () => apiClient.get('/auth/me'),
  forgotPassword: (email) => apiClient.post('/auth/password/forgot', { email }),
  resetPassword: (data) => apiClient.post('/auth/password/reset', data),
  changePassword: (data) => apiClient.post('/auth/password/change', data),
};

export default authApi;

import apiClient from './client';

export const authApi = {
  login: (credentials) => apiClient.post('/auth/login', credentials),
  loginStaff: (credentials) => apiClient.post('/auth/login/staff', credentials),
  logout: () => apiClient.post('/auth/logout'),
  refresh: () => apiClient.post('/auth/refresh'),
  getMe: () => apiClient.get('/auth/me'),
};

export default authApi;

import apiClient from './client';

export const generalApi = {
  getMaterials: () => apiClient.get('/materials'),
};

export default generalApi;

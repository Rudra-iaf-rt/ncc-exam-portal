import client from './client';

const materialsApi = {
  list: (params) => client.get('/materials', { params }),

  getById: (id) => client.get(`/materials/${id}`),

  upload: (data, onUploadProgress) => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        formData.append(key, val);
      }
    });

    return client.post('/material/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress,
    });
  },

  update: (id, data) => client.patch(`/materials/${id}`, data),

  delete: (id) => client.delete(`/materials/${id}`),
  getDownloadUrl: (id) => {
    const token = localStorage.getItem('ncc_token');
    const base = client.defaults.baseURL.replace(/\/+$/, '');
    return `${base}/materials/${id}/download?token=${token}`;
  },

  getViewUrl: (id) => {
    const token = localStorage.getItem('ncc_token');
    const base = client.defaults.baseURL.replace(/\/+$/, '');
    return `${base}/materials/${id}/view?token=${token}`;
  }
};

export default materialsApi;

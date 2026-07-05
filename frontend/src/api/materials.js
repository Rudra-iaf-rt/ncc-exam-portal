import client from './client';

const materialsApi = {
  /**
   * List syllabus materials with optional filters (subject, fileType, wing)
   */
  list: (params) => client.get('/materials', { params }),

  /**
   * Get a single material's details
   */
  getById: (id) => client.get(`/materials/${id}`),

  /**
   * Upload a new material to Backblaze B2.
   * Sends as multipart/form-data. Supports onUploadProgress for progress bars.
   *
   * @param {object} data - { title, subject, description, fileType, wing, collegeId, file: File }
   * @param {function} [onUploadProgress] - axios progress callback
   */
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

  /**
   * Update material metadata
   */
  update: (id, data) => client.patch(`/materials/${id}`, data),

  /**
   * Soft delete a material
   */
  delete: (id) => client.delete(`/materials/${id}`),

  /**
   * Get the authenticated download URL for a material.
   * Backend will stream the file securely.
   */
  getDownloadUrl: (id) => {
    const token = localStorage.getItem('ncc_token');
    return `/api/materials/${id}/download?token=${token}`;
  },

  /**
   * Get the direct view URL for inline previewing.
   * Backend will stream the file securely.
   */
  getViewUrl: (id) => {
    const token = localStorage.getItem('ncc_token');
    return `/api/materials/${id}/view?token=${token}`;
  }
};

export default materialsApi;

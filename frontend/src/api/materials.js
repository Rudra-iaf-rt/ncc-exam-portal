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
   * Upload a new material (either local file or Google Drive URL)
   */
  upload: (data) => {
    // If it's a Drive URL, we can send it as JSON
    if (data.driveUrl) {
      return client.post('/material/upload', data);
    }
    
    // Otherwise, handle as multipart form data for local file uploads
    const formData = new FormData();
    Object.keys(data).forEach(key => {
      if (data[key] !== undefined && data[key] !== null) {
        formData.append(key, data[key]);
      }
    });
    
    return client.post('/material/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  /**
   * Soft delete a material
   */
  delete: (id) => client.delete(`/materials/${id}`),

  /**
   * Trigger manual revalidation of a Google Drive link
   */
  revalidate: (id) => client.post(`/materials/${id}/revalidate`),

  /**
   * Get the download URL for a material
   */
  getDownloadUrl: (id) => {
    const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    return `${baseURL}/materials/${id}/download`;
  }
};

export default materialsApi;

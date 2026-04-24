import apiClient from './client';

export const examApi = {
  // Cadet Exam Actions
  getExams: () => apiClient.get('/exams'),
  getAssigned: () => apiClient.get('/exams').then(res => res.data.exams),
  createExam: (data) => apiClient.post('/exams/create', data),
  updateExamStatus: (id, status) => apiClient.patch(`/exams/${id}/status`, { status }),
  deleteExam: (id) => apiClient.delete(`/exams/${id}`),
  
  // Attempts
  startAttempt: (examId) => apiClient.post('/attempt/start', { examId }),
  saveAnswer: (attemptId, data) => apiClient.post(`/attempt/${attemptId}/answer`, data),
  saveViolation: (attemptId) => apiClient.post(`/attempt/${attemptId}/violation`),
  submitAttempt: (data) => apiClient.post('/attempt/submit', data),

  // Results
  getResults: () => apiClient.get('/results'),
  getAdminResults: () => apiClient.get('/results/admin'),
};

export default examApi;

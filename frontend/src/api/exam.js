import apiClient from './client';

export const examApi = {
  // Staff/Admin Exam Management
  updateExamStatus: (id, status) => apiClient.patch(`/exams/${id}`, { status }),
  deleteExam: (id) => apiClient.delete(`/exams/${id}`),

  // Cadet Exam Actions
  getExams: () => apiClient.get('/exams'),
  getAssigned: () => apiClient.get('/exams').then(res => res.data.exams),
  createExam: (data) => apiClient.post('/exams/create', data),
  
  // Attempts
  startAttempt: (examId) => apiClient.post('/attempt/start', { examId }),
  saveAnswer: (data) => apiClient.post('/attempt/answer', data),
  saveViolation: (data) => apiClient.post('/exam/violation', data),
  submitAttempt: (data) => apiClient.post('/attempt/submit', data),

  // Results
  getResults: () => apiClient.get('/results'),
  getAdminResults: () => apiClient.get('/results/admin'),
};

export default examApi;

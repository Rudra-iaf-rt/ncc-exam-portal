import apiClient from './client';

export const examApi = {
  // Staff/Admin Exam Management
  updateExamStatus: (id, status) => apiClient.patch(`/exams/${id}/publish`, { status }),
  publishResults: (id) => apiClient.patch(`/exams/${id}/publish-results`),
  updateExamMeta: (id, data) => apiClient.patch(`/exams/${id}`, data),
  updateExamQuestions: (id, questions) => apiClient.put(`/exams/${id}/questions`, { questions }),
  deleteExam: (id) => apiClient.delete(`/exams/${id}`),
  extendTime: (data) => apiClient.post(`/staff/exams/${data.examId}/extend-time`, data),
  terminateSession: (data) => apiClient.post(`/staff/exams/${data.examId}/terminate-session`, data),
  resetAttempt: (data) => apiClient.post(`/staff/exams/${data.examId}/reset-attempt`, data),

  // Cadet Exam Actions
  getExams: (params) => apiClient.get('/exams', { params }),
  getAssigned: () => apiClient.get('/exams').then(res => res.data.exams),
  getExamDetails: (id) => apiClient.get(`/staff/exams/${id}`),
  createExam: (data) => apiClient.post('/exams/create', data),
  createExamFromExcel: ({ title, duration, negativeMarking, negativeMarks, file }) => {
    const form = new FormData();
    form.append('title', String(title ?? ''));
    form.append('duration', String(duration ?? ''));
    if (negativeMarking !== undefined) form.append('negativeMarking', String(negativeMarking));
    if (negativeMarks !== undefined) form.append('negativeMarks', String(negativeMarks));
    form.append('file', file);
    return apiClient.post('/exams/create-from-excel', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  
  // Attempts
  startAttempt: (examId, sessionId) => apiClient.post('/attempt/start', { examId, sessionId }),
  saveAnswer: (data) => apiClient.post('/attempt/answer', data),
  syncAnswers: (data) => apiClient.post('/attempt/sync', data),
  saveViolation: (data) => apiClient.post('/exam/violation', data),
  sendHeartbeat: (data) => apiClient.post('/exam/heartbeat', data),
  submitAttempt: (data) => apiClient.post('/attempt/submit', data),

  // Results
  getResults: (params) => apiClient.get('/results', { params }),
  getAdminResults: (params) => apiClient.get('/results/admin', { params }),
  getResultReview: (examId) => apiClient.get(`/results/review/${examId}`),
  getAdminResultReview: (examId, studentId) => apiClient.get(`/results/admin/review/${examId}/${studentId}`),
  exportBulkAdminResults: (params) => apiClient.get('/results/export-bulk', { 
    params,
    responseType: 'blob' 
  }),
};

export default examApi;
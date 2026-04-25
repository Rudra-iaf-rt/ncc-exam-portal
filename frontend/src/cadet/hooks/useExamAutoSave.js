import { useState, useCallback, useRef } from 'react';
import { examApi } from '../../api';

export const useExamAutoSave = (examId) => {
  const [syncStatus, setSyncStatus] = useState('saved'); // 'saved', 'saving', 'error'
  const saveTimeoutsRef = useRef({});

  const saveAnswer = useCallback(async (questionId, selectedAnswer, nextIndex = 0) => {
    setSyncStatus('saving');
    
    try {
      await examApi.saveAnswer({ 
        examId: Number(examId), 
        questionId, 
        selectedAnswer, 
        nextQuestionIndex: nextIndex 
      });
      setSyncStatus('saved');
    } catch (error) {
      setSyncStatus('error');
    }
  }, [examId]);

  const queueSave = useCallback((questionId, selectedAnswer, nextIndex = 0) => {
    if (saveTimeoutsRef.current[questionId]) {
      clearTimeout(saveTimeoutsRef.current[questionId]);
    }
    
    setSyncStatus('saving');
    saveTimeoutsRef.current[questionId] = setTimeout(() => {
      saveAnswer(questionId, selectedAnswer, nextIndex);
      delete saveTimeoutsRef.current[questionId];
    }, 1000); // 1s debounce
  }, [saveAnswer]);

  return { syncStatus, queueSave };
};

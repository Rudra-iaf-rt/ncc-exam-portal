import { useState, useCallback, useRef } from 'react';
import { examApi } from '../../api';

export const useExamAutoSave = (attemptId) => {
  const [syncStatus, setSyncStatus] = useState('saved'); // 'saved', 'saving', 'error'
  const saveTimeoutsRef = useRef({});

  const saveAnswer = useCallback(async (questionId, selectedAnswer) => {
    setSyncStatus('saving');
    
    try {
      await examApi.saveAnswer(attemptId, { questionId, selectedAnswer });
      setSyncStatus('saved');
    } catch (error) {
      setSyncStatus('error');
    }
  }, [attemptId]);

  const queueSave = useCallback((questionId, selectedAnswer) => {
    if (saveTimeoutsRef.current[questionId]) {
      clearTimeout(saveTimeoutsRef.current[questionId]);
    }
    
    setSyncStatus('saving');
    saveTimeoutsRef.current[questionId] = setTimeout(() => {
      saveAnswer(questionId, selectedAnswer);
      delete saveTimeoutsRef.current[questionId];
    }, 1000); // 1s debounce
  }, [saveAnswer]);

  return { syncStatus, queueSave };
};

import { useState, useCallback, useRef } from 'react';
import { examApi } from '../../api';

export const useExamAutoSave = (examId) => {
  const [syncStatus, setSyncStatus] = useState('idle'); // 'idle' | 'saving' | 'saved' | 'error'
  const saveTimeoutsRef = useRef({});

  const saveAnswer = useCallback(async (questionId, selectedAnswer, nextQuestionIndex) => {
    setSyncStatus('saving');
    
    try {
      await examApi.saveAnswer({
        examId: Number(examId),
        questionId: Number(questionId),
        selectedAnswer,
        nextQuestionIndex: Number(nextQuestionIndex ?? 0),
      });
      setSyncStatus('saved');
    } catch (error) {
      setSyncStatus('error');
    }
  }, [examId]);

  const queueSave = useCallback((questionId, selectedAnswer, nextQuestionIndex) => {
    if (saveTimeoutsRef.current[questionId]) {
      clearTimeout(saveTimeoutsRef.current[questionId]);
    }
    
    setSyncStatus('saving');
    saveTimeoutsRef.current[questionId] = setTimeout(() => {
      saveAnswer(questionId, selectedAnswer, nextQuestionIndex);
      delete saveTimeoutsRef.current[questionId];
    }, 1000); // 1s debounce
  }, [saveAnswer]);

  return { syncStatus, queueSave };
};

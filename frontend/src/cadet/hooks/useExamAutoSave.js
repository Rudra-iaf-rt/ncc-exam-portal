import { useState, useCallback, useRef, useEffect } from 'react';
import { examApi } from '../../api';

export const useExamAutoSave = (examId) => {
  const [syncStatus, setSyncStatus] = useState('idle'); // 'idle' | 'saving' | 'saved' | 'error'
  const syncTimeoutRef = useRef(null);

  // The local storage key format for this exam
  const storageKey = `ncc_exam_${examId}_answers`;

  // Provide a method to load initially
  const loadLocalAnswers = useCallback(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      console.error("Failed to parse local answers:", e);
      return null;
    }
  }, [storageKey]);

  const clearLocalAnswers = useCallback(() => {
    localStorage.removeItem(storageKey);
  }, [storageKey]);

  // Sync to server spontaneously (debounced to prevent spamming the DB)
  const syncToServer = useCallback(async (currentAnswers) => {
    if (Object.keys(currentAnswers).length === 0) return;
    
    setSyncStatus('saving');
    try {
      // Send the entire batch to the server
      await examApi.syncAnswers({
        examId: Number(examId),
        answers: currentAnswers,
      });
      setSyncStatus('saved');
    } catch (error) {
      console.error("Sync failed", error);
      setSyncStatus('error');
    }
  }, [examId]);

  const queueSave = useCallback((questionId, selectedAnswer) => {
    // 1. Read directly from LocalStorage to avoid React state lag
    let currentAnswers = {};
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) currentAnswers = JSON.parse(stored);
    } catch (e) {}

    // Ignore duplicate clicks on the same answer
    if (currentAnswers[questionId] === selectedAnswer) {
      return;
    }

    // 2. Immediately save to LocalStorage (0 latency, crash safe)
    const updatedAnswers = { ...currentAnswers, [questionId]: selectedAnswer };
    localStorage.setItem(storageKey, JSON.stringify(updatedAnswers));
    
    // 3. Debounce the server sync to ensure DB is not overwhelmed 
    setSyncStatus('saving');
    
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }
    
    syncTimeoutRef.current = setTimeout(() => {
      syncToServer(updatedAnswers);
    }, 60000); 
    
  }, [storageKey, syncToServer]);

  // Clean up timeout and add beforeunload/visibilitychange hooks for data safety
  useEffect(() => {
    const handleUnloadOrHide = () => {
      if (document.visibilityState === 'hidden') {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          try {
            const answers = JSON.parse(stored);
            if (Object.keys(answers).length > 0) {
              const token = localStorage.getItem('token');
              // Use keepalive fetch to ensure data sends even if tab is closing
              fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/exams/attempt/sync`, {
                method: 'POST',
                keepalive: true,
                headers: {
                  'Content-Type': 'application/json',
                  ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({ examId: Number(examId), answers })
              }).catch(console.error);
            }
          } catch (e) {}
        }
      }
    };

    document.addEventListener('visibilitychange', handleUnloadOrHide);

    return () => {
      document.removeEventListener('visibilitychange', handleUnloadOrHide);
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [examId, storageKey]);

  return { syncStatus, queueSave, loadLocalAnswers, clearLocalAnswers };
};

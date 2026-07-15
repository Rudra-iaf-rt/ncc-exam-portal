import { useState, useCallback, useRef, useEffect } from 'react';
import { examApi } from '../../api';

export const useExamAutoSave = (examId, userId) => {
  const [syncStatus, setSyncStatus] = useState('idle');
  const syncTimeoutRef = useRef(null);

  const storageKey = `ncc_exam_${examId}_student_${userId}_answers`;

  const loadLocalAnswers = useCallback(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (!stored) return null;
      const parsed = JSON.parse(stored);
      return parsed.answers || parsed;
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
      if (stored) {
        const parsed = JSON.parse(stored);
        currentAnswers = parsed.answers || parsed;
      }
    } catch (e) {}

    // Ignore duplicate clicks on the same answer
    if (currentAnswers[questionId] === selectedAnswer) {
      return;
    }

    // 2. Immediately save to LocalStorage (0 latency, crash safe)
    const updatedAnswers = { ...currentAnswers };
    if (selectedAnswer === null || selectedAnswer === undefined) {
      delete updatedAnswers[questionId];
    } else {
      updatedAnswers[questionId] = selectedAnswer;
    }
    localStorage.setItem(storageKey, JSON.stringify({
      answers: updatedAnswers,
      timestamp: Date.now()
    }));
    
    // 3. Debounce the server sync to ensure DB is not overwhelmed 
    setSyncStatus('queued');
    
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }
    
    // 60 s debounce: protects the free-tier Neon DB from query storms when 500
    // cadets are simultaneously answering questions. This is safe because:
    //   a) Every answer is ALREADY written to localStorage instantly (line 62) — crash-proof.
    //   b) The keepalive fetch below fires the moment the tab hides — tab-close-proof.
    //   c) executeSubmit() merges localStorage into the final payload — submit-proof.
    // The debounce only controls the *background* sync; it does not affect data safety.
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
            const storedData = JSON.parse(stored);
            const answers = storedData.answers || storedData; // Backwards compatible
            if (Object.keys(answers).length > 0) {
              const token = localStorage.getItem('ncc_token'); // must match key used in auth.js
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

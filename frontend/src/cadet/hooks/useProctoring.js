import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { examApi } from '../../api';

const isMobileDevice = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

export const useProctoring = ({ onSecurityBreach, maxWarnings = 3 }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [warningCount, setWarningCount] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [isTerminated, setIsTerminated] = useState(false);
  const [lastViolationType, setLastViolationType] = useState(null); // 'TAB_SWITCH' | 'FULLSCREEN_EXIT' | 'SCREEN_STOP'
  const [screenStream, setScreenStream] = useState(null);

  // Keep stable ref to callback to avoid stale closure in event listeners
  const onSecurityBreachRef = useRef(onSecurityBreach);
  useEffect(() => {
    onSecurityBreachRef.current = onSecurityBreach;
  }, [onSecurityBreach]);

  // examId injected from ExamAttempt via ref so we don't need it as a prop
  const examIdRef = useRef(null);
  const setExamId = useCallback((id) => { examIdRef.current = id; }, []);

  const isViolatingRef = useRef(false);
  // Tracks real-time warning count outside React state to avoid stale closures (Bug-6 fix)
  const warningCountRef = useRef(0);
  // Synchronous ref — avoids the stale-state window where dismissWarning could
  // unlock after the 3rd violation before isTerminated React state propagates.
  const isTerminatedRef = useRef(false);

  /**
   * Record a violation server-side and react to the returned count.
   *
   * Security invariants:
   *   1. isViolatingRef is reset on EVERY exit path — no silent swallowing (Bug-3 fix)
   *   2. warningCountRef is used instead of stale `warningCount` state (Bug-6 fix)
   *   3. Server count is always authoritative; local ref is only a fallback
   */
  const recordViolation = useCallback(async (type) => {
    // Gate: one violation in-flight at a time. Also permanently locked after termination.
    if (isViolatingRef.current) return;
    isViolatingRef.current = true;

    // Bug-6 fix: read from ref — immune to stale React state in rapid concurrent calls
    let newCount = warningCountRef.current + 1;
    setLastViolationType(type);

    if (examIdRef.current) {
      try {
        const { data } = await examApi.saveViolation({ examId: examIdRef.current, type });
        // Server count is authoritative — corrects any local drift
        newCount = data.warningCount;
        if (data.terminate) {
          // Keep isViolatingRef permanently true — no more violations ever allowed.
          // DO NOT reset it here. This is the intentional change from the old code
          // which reset it before calling onSecurityBreach, creating a 4th-violation window.
          isTerminatedRef.current = true;
          warningCountRef.current = newCount;
          setWarningCount(newCount);
          setIsTerminated(true);
          setShowWarning(true);
          onSecurityBreachRef.current?.(true);
          return;
        }
      } catch (_err) {
        // Network failure: fall back to local ref count.
        // Bug-3 fix: MUST reset here — next violation must be allowed to record.
        isViolatingRef.current = false;
      }
    }

    // Keep ref in sync with the count we're committing to state
    warningCountRef.current = newCount;
    setWarningCount(newCount);

    if (newCount >= maxWarnings) {
      // Permanent lock — exam is over, no more violations can be recorded.
      isTerminatedRef.current = true;
      // isViolatingRef stays true — intentionally NOT reset here.
      setIsTerminated(true);
      setShowWarning(true);
      onSecurityBreachRef.current?.(true);
    } else {
      setShowWarning(true);
      // isViolatingRef is reset by dismissWarning() when cadet clicks "Return to Exam"
    }
  }, [maxWarnings]); // Bug-6: warningCount removed — read from warningCountRef instead

  // Fullscreen Handlers
  const requestFullscreen = useCallback(async () => {
    const isMobile = isMobileDevice();
    
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else if (isMobile) {
        // Fallback for mobile devices (like iOS) that don't support document-level fullscreen
        setIsFullscreen(true);
        toast.info('Secure Mode: Fullscreen bypass activated for mobile.', {
          description: 'Please do not switch tabs during the exam.'
        });
      } else {
        toast.error('Fullscreen mode is not supported by your browser.');
      }
    } catch (_err) {
      if (isMobile) {
        setIsFullscreen(true);
      } else {
        toast.error('Failed to enter fullscreen mode. Please check browser permissions.');
      }
    }
  }, []);

  const requestScreenShare = useCallback(async () => {
    const isMobile = isMobileDevice();
    const hasScreenShareSupport = !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia);

    // Bug-2 fix: mobile / unsupported-browser bypass is now logged server-side so
    // admins can audit every session that skipped real screen capture.
    // The examIdRef is populated by setProctoringExamId() in startExam() before
    // the cadet can ever reach this button, so it is reliably set here.
    if (isMobile || !hasScreenShareSupport) {
      setIsScreenSharing(true);

      const bypassType = isMobile ? 'MOBILE_SCREEN_SHARE_BYPASS' : 'BROWSER_SCREEN_SHARE_UNSUPPORTED';
      const bypassMsg  = isMobile
        ? 'Mobile device — screen capture bypassed'
        : 'Browser does not support getDisplayMedia — screen capture bypassed';

      if (examIdRef.current) {
        // Fire-and-forget: log bypass for admin visibility; never block the cadet flow.
        // isPenalty:false ensures this audit log does NOT increment warningCount.
        examApi.saveViolation({
          examId: examIdRef.current,
          type:    bypassType,
          message: bypassMsg,
          isPenalty: false,
        }).catch(() => {});
      }

      if (isMobile) {
        toast.info('Mobile detected: Screen sharing requirement waived.', {
          description: 'Ensure you stay on this page to avoid violations.'
        });
      } else {
        toast.warning('Browser limit: Screen sharing not supported. Proceeding with caution.');
      }
      return true;
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: 'monitor' },
        audio: false,
      });

      const videoTrack = stream.getVideoTracks()[0];

      // Enforce entire-screen sharing where the browser reports surface type
      const settings = videoTrack.getSettings();
      if (settings.displaySurface && settings.displaySurface !== 'monitor') {
        stream.getTracks().forEach(t => t.stop());
        toast.error('You must share your ENTIRE SCREEN to continue.');
        return false;
      }

      videoTrack.onended = () => {
        setIsScreenSharing(false);
        toast.error('Screen transmission terminated. This is a security violation.');
        recordViolation('SCREEN_STOP');
      };

      setScreenStream(stream);
      setIsScreenSharing(true);
      return true;
    } catch (_err) {
      // getDisplayMedia failed on a mobile that technically supports it — allow bypass
      if (isMobile) {
        setIsScreenSharing(true);
        if (examIdRef.current) {
          // isPenalty:false — getDisplayMedia failure on mobile is an audit log, not a penalty.
          examApi.saveViolation({
            examId:  examIdRef.current,
            type:    'MOBILE_SCREEN_SHARE_BYPASS',
            message: 'Mobile device — getDisplayMedia threw, screen capture bypassed',
            isPenalty: false,
          }).catch(() => {});
        }
        return true;
      }
      toast.error('Screen sharing is required to attempt the exam.');
      return false;
    }
  }, [recordViolation]);

  // Fullscreen & visibility event listeners
  // Bug-7 fix: mouseLeave removed — it fires on browser chrome overlays (e.g. the
  // OS screen-share notification bar) and is trivially evaded with a fast alt-tab.
  // The visibilitychange + blur combo below catches all real cheating vectors.
  useEffect(() => {
    const handleFullscreenChange = () => {
      const inFullscreen = !!document.fullscreenElement;
      setIsFullscreen(inFullscreen);
      // Only record violation if they were already in the proctored session
      if (!inFullscreen && isScreenSharing) {
        recordViolation('FULLSCREEN_EXIT');
      }
    };

    const handleVisibilityChange = () => {
      // Fires when the tab is hidden (alt-tab to another app, new tab, minimise)
      if (document.hidden && isScreenSharing) {
        recordViolation('TAB_SWITCH');
      }
    };

    const handleBlur = () => {
      // Catches focus loss when the page isn't actually hidden —
      // e.g. cadet clicks a second-monitor window or the OS taskbar.
      // Guard against double-firing with the visibility handler.
      if (isScreenSharing && !document.hidden) {
        recordViolation('FOCUS_LOSS');
      }
    };

    // mouseLeave covers the one gap blur+visibility miss: a cadet on a dual-monitor
    // setup who slides the cursor to their second screen to read notes WITHOUT clicking
    // anything (so blur never fires). Guards:
    //   1. 2-second timeout — filters out accidental exits (Chrome screen-share bar,
    //      edge of window, etc.). If the cursor returns within 2 s, no violation.
    //   2. document.hasFocus() check inside the callback — if the window lost focus
    //      during the wait (blur already fired and recorded a violation), we skip
    //      this one to avoid double-counting the same cheating event.
    let mouseLeaveTimer = null;

    const handleMouseLeave = () => {
      if (!isScreenSharing) return;
      // Only arm the timer when the window still has focus (blur hasn't fired)
      if (!document.hasFocus()) return;
      mouseLeaveTimer = setTimeout(() => {
        // Re-check before recording: if focus dropped during the 2-s wait,
        // blur already handled it — don't double-count.
        if (!document.hasFocus()) return;
        recordViolation('MOUSE_LEAVE');
      }, 2000);
    };

    const handleMouseEnter = () => {
      if (mouseLeaveTimer) {
        clearTimeout(mouseLeaveTimer);
        mouseLeaveTimer = null;
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseenter', handleMouseEnter);

    return () => {
      if (mouseLeaveTimer) clearTimeout(mouseLeaveTimer);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnter);
    };
  }, [isScreenSharing, recordViolation]);

  // Cleanup screen stream on unmount
  useEffect(() => {
    return () => {
      if (screenStream) {
        screenStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [screenStream]);

  /**
   * Called by ExamAttempt after startExam() resolves to sync the authoritative
   * server-side warningCount into the proctoring hook's state.
   *
   * If the count is already at or above the max (e.g. the cadet refreshed the page
   * mid-termination, or they're trying to re-enter after being auto-submitted), this
   * permanently locks all proctoring signals and shows the terminated UI immediately.
   */
  const initializeFromServer = useCallback((serverWarningCount) => {
    const count = Number(serverWarningCount) || 0;
    if (count <= 0) return; // Fresh attempt — nothing to restore

    warningCountRef.current = count;
    setWarningCount(count);

    if (count >= maxWarnings) {
      // Permanently lock — exam is over. This blocks re-entry after a page refresh.
      isTerminatedRef.current = true;
      isViolatingRef.current = true;
      setIsTerminated(true);
      setShowWarning(true);
      // No onSecurityBreach call here — we're restoring state, not triggering a new breach.
      // ExamAttempt will see isTerminated=true and will NOT navigate away automatically;
      // the cadet sees the "Exam Terminated" modal and must navigate manually.
    }
  }, [maxWarnings]);

  const dismissWarning = useCallback(() => {
    // Use the synchronous ref instead of React state to avoid the stale-state
    // window between the 3rd violation being processed and isTerminated propagating.
    if (!isTerminatedRef.current) {
      setShowWarning(false);
      isViolatingRef.current = false;
    }
  }, []); // No deps — reads only refs

  return {
    isFullscreen,
    isScreenSharing,
    warningCount,
    lastViolationType,
    showWarning,
    isTerminated,
    setShowWarning: dismissWarning, // Replace with the lock-releasing version
    requestFullscreen,
    requestScreenShare,
    setExamId, // Expose so ExamAttempt can inject examId after startExam resolves
    screenStream,
    initializeFromServer, // Called by ExamAttempt to restore server-side warningCount
  };
};

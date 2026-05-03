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

  /**
   * Record a violation server-side and react to the returned count.
   * Falls back to local count if the API call fails (network issue during exam).
   */
  const recordViolation = useCallback(async (type) => {
    // Prevent multiple simultaneous violation triggers (e.g. blur + visibility)
    if (isViolatingRef.current) return;
    isViolatingRef.current = true;

    let newCount = warningCount + 1; // Optimistic local fallback
    setLastViolationType(type);

    if (examIdRef.current) {
      try {
        const { data } = await examApi.saveViolation({ examId: examIdRef.current, type });
        newCount = data.warningCount;
        if (data.terminate) {
          onSecurityBreachRef.current?.(true);
          return;
        }
      } catch (_err) {
        // Network failure: use local count — violation still shown to cadet
      }
    }

    setWarningCount(newCount);
    if (newCount >= maxWarnings) {
      onSecurityBreachRef.current?.(true);
    } else {
      setShowWarning(true);
    }
  }, [warningCount, maxWarnings]);

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

    if (isMobile || !hasScreenShareSupport) {
      setIsScreenSharing(true);
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

      // Enforce entire screen sharing where the browser supports it
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
      // If it's a mobile device and getDisplayMedia failed (some mobile browsers 
      // have the API but it fails or is restricted), allow bypass.
      if (isMobile) {
        setIsScreenSharing(true);
        return true;
      }
      toast.error('Screen sharing is required to attempt the exam.');
      return false;
    }
  }, [recordViolation]);

  // Fullscreen & visibility event listeners
  useEffect(() => {
    const handleFullscreenChange = () => {
      const inFullscreen = !!document.fullscreenElement;
      setIsFullscreen(inFullscreen);
      // Only record violation if they were already in the exam (sharing) and leave
      if (!inFullscreen && isScreenSharing) {
        recordViolation('FULLSCREEN_EXIT');
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden && isScreenSharing) {
        recordViolation('TAB_SWITCH');
      }
    };

    const handleBlur = () => {
      // Blur catches window focus loss even if the tab isn't hidden 
      // (e.g. user clicks a taskbar icon or a second monitor window)
      if (isScreenSharing && !document.hidden) {
        recordViolation('FOCUS_LOSS');
      }
    };

    // Debounce mouse-leave so native browser overlays (e.g. the screen-share
    // notification bar) don't falsely trigger a violation. The cursor must leave
    // the document and NOT return for 500 ms before we count it.
    let mouseLeaveTimer = null;

    const handleMouseLeave = () => {
      if (!isScreenSharing) return;
      mouseLeaveTimer = setTimeout(() => {
        recordViolation('MOUSE_LEAVE');
      }, 500);
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

  const dismissWarning = useCallback(() => {
    setShowWarning(false);
    isViolatingRef.current = false;
  }, []);

  return {
    isFullscreen,
    isScreenSharing,
    warningCount,
    lastViolationType,
    showWarning,
    setShowWarning: dismissWarning, // Replace with the lock-releasing version
    requestFullscreen,
    requestScreenShare,
    setExamId, // Expose so ExamAttempt can inject examId after startExam resolves
    screenStream,
  };
};

import React, { createContext, useContext, useEffect, useRef } from 'react';
import { useLocation, useNavigationType, useNavigate } from 'react-router-dom';

const NavigationContext = createContext(null);

const getInitialStack = (currentPath) => {
  try {
    const stored = sessionStorage.getItem('nav_stack');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error("Could not parse nav_stack", e);
  }
  return [currentPath];
};

export function NavigationProvider({ children }) {
  const location = useLocation();
  const navType = useNavigationType();
  const navigate = useNavigate();
  
  const currentPath = location.pathname + location.search;
  const stackRef = useRef(getInitialStack(currentPath));
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
        isFirstRender.current = false;
        // Don't modify stack on the very first render effect because getInitialStack already handled it
        return;
    }

    if (navType === 'PUSH') {
      stackRef.current.push(currentPath);
      // Cap at 30 items to prevent memory bloat
      if (stackRef.current.length > 30) stackRef.current.shift();
    } else if (navType === 'POP') {
      // Browser back or navigate(-1) popped the browser history
      stackRef.current.pop();
    } else if (navType === 'REPLACE') {
      if (stackRef.current.length > 0) {
        stackRef.current[stackRef.current.length - 1] = currentPath;
      } else {
        stackRef.current.push(currentPath);
      }
    }
    
    // Sync to session storage for persistence across reloads
    try {
      sessionStorage.setItem('nav_stack', JSON.stringify(stackRef.current));
    } catch (e) {
      // Ignore sessionStorage limits/errors
    }
  }, [currentPath, navType]);

  const goBack = (fallbackUrl = '/') => {
    if (stackRef.current.length > 1) {
      const prevPath = stackRef.current[stackRef.current.length - 2];
      
      // If we know there is browser history natively, navigate(-1) is safest
      // to keep window.history perfectly synced.
      if (window.history && window.history.state && window.history.state.idx > 0) {
        navigate(-1);
      } else {
        // Fallback for cases like duplicated tabs where session storage restored the stack
        // but window.history is actually empty.
        stackRef.current.pop();
        navigate(prevPath, { replace: true });
      }
    } else {
      // Stack is empty or has only 1 item, so we cannot go back. Use fallback.
      navigate(fallbackUrl, { replace: true });
    }
  };

  return (
    <NavigationContext.Provider value={{ goBack }}>
      {children}
    </NavigationContext.Provider>
  );
}

export const useAppNavigation = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useAppNavigation must be used within a NavigationProvider');
  }
  return context;
};

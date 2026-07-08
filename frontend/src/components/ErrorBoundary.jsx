import React from 'react';
import apiClient from '../api/client';
import { AlertTriangle, RefreshCw } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
    
    // Log telemetry to backend securely via apiClient
    apiClient.post("/errors/client", {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      url: window.location.href,
      level: this.props.level || "COMPONENT"
    }).catch(err => {
      console.error("Failed to log client error to telemetry:", err);
    });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error);
      }
      return (
        <div className="w-full h-full flex flex-col items-center justify-center min-h-[50vh] p-6 sm:p-8 text-center animate-in fade-in duration-500">
          <AlertTriangle className="h-10 w-10 sm:h-12 sm:w-12 text-crimson/80 mb-5 sm:mb-6" strokeWidth={1.5} />
          
          <h2 className="font-display text-xl sm:text-2xl font-medium text-ink leading-tight mb-2">
            Unexpected Error
          </h2>
          
          <p className="font-ui text-[13px] sm:text-[14px] text-ink-3 font-normal max-w-sm sm:max-w-md mx-auto mb-6 sm:mb-8 px-2 sm:px-0">
            We encountered an issue rendering this section. Event has been recorded and would be solved ASAP.
          </p>
          
          <button 
            onClick={() => window.location.reload()}
            className="w-full sm:w-auto h-[36px] px-[18px] rounded-md font-ui text-[13px] font-medium flex items-center justify-center gap-2 transition-all bg-navy text-[#F4F0E4] hover:bg-navy-mid active:scale-95"
          >
            <RefreshCw size={16} strokeWidth={1.5} />
            <span>Reload Page</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

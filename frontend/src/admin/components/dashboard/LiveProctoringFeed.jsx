import React from 'react';
import { ShieldAlert, AlertTriangle } from 'lucide-react';

export default function LiveProctoringFeed({ violations }) {
  // Format the violation type for display
  const formatViolationType = (type) => {
    switch (type) {
      case 'TAB_SWITCH': return 'Tab Switch Detected';
      case 'FOCUS_LOST': return 'Window Focus Lost';
      case 'FULLSCREEN_EXIT': return 'Exited Fullscreen';
      case 'MULTIPLE_FACES': return 'Multiple Faces Detected';
      case 'NO_FACE': return 'Face Not Visible';
      default: return type.replace(/_/g, ' ');
    }
  };

  // Format relative time (e.g., "2 mins ago")
  const getRelativeTime = (dateStr) => {
    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
    const diffInMs = new Date() - new Date(dateStr);
    const diffInMins = Math.floor(diffInMs / 60000);
    const diffInHours = Math.floor(diffInMins / 60);

    if (diffInMins < 1) return 'Just now';
    if (diffInMins < 60) return rtf.format(-diffInMins, 'minute');
    if (diffInHours < 24) return rtf.format(-diffInHours, 'hour');
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <div className="flex flex-col h-full border border-stone-deep bg-white rounded-md shadow-sm overflow-hidden">
      <div className="flex justify-between items-center p-3 border-b border-stone-deep bg-stone-wash">
        <h3 className="m-0 font-mono text-[11px] font-bold uppercase tracking-wider text-crimson flex items-center gap-2">
          <ShieldAlert size={14} className="text-crimson/80" />
          Live Integrity Alerts
        </h3>
        <div className="flex items-center gap-2">
          <div className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-crimson opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-crimson"></span>
          </div>
          <span className="font-mono text-[9px] uppercase tracking-wider text-crimson/70 font-bold">Monitoring</span>
        </div>
      </div>

      <div className="flex flex-col overflow-y-auto">
        {violations && violations.length > 0 ? (
          violations.map((violation, idx) => (
            <div 
              key={violation.id} 
              className={`p-3 flex justify-between items-start gap-4 hover:bg-stone-wash transition-colors ${idx !== violations.length - 1 ? 'border-b border-stone-deep' : ''}`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-1">
                  <div className="font-ui text-[12px] font-bold text-navy truncate uppercase tracking-wide">
                    {violation.studentName}
                  </div>
                  <span className="font-mono text-[10px] text-ink-4 shrink-0">
                    {getRelativeTime(violation.date)}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-crimson font-bold uppercase tracking-wider">
                    {formatViolationType(violation.type)}
                  </span>
                  <span className="text-ink-4 text-[10px]">•</span>
                  <span className="font-mono text-[10px] text-ink-3 truncate">
                    {violation.examTitle}
                  </span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-olive-mid">Secure</span>
            <span className="font-ui text-[11px] text-ink-4 mt-0.5">No recent violations</span>
          </div>
        )}
      </div>
    </div>
  );
}

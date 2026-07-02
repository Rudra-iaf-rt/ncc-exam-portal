import React from 'react';
import { Loader2 } from 'lucide-react';

export default function PageLoader({ text = "Loading..." }) {
  return (
    <div className="w-full min-h-[50vh] flex flex-col items-center justify-center py-16 animate-in fade-in duration-300">
      <Loader2 size={24} className="animate-spin text-ink-4 mb-3" strokeWidth={2.5} />
      {text && (
        <p className="text-[13px] font-medium text-ink-3">
          {text}
        </p>
      )}
    </div>
  );
}

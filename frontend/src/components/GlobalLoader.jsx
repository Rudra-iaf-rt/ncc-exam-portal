import React from 'react';
import { Loader2 } from 'lucide-react';

export default function GlobalLoader({ text = "Loading..." }) {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm text-ink overflow-hidden animate-in fade-in duration-300">
      <div className="flex flex-col items-center gap-4">
        <Loader2 size={28} className="animate-spin text-ink-3" strokeWidth={2.5} />
        {text && (
          <p className="text-[13px] font-medium text-ink-3">
            {text}
          </p>
        )}
      </div>
    </div>
  );
}

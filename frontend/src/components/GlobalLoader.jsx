import React from 'react';
import { Shield, Anchor, Plane } from 'lucide-react';

export default function GlobalLoader({ text }) {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-stone animate-in fade-in duration-500">
      <div className="relative w-16 h-16 flex items-center justify-center mb-2">
        <Shield 
          size={40} 
          className="absolute text-navy animate-icon-sequence" 
          strokeWidth={1.5} 
          style={{ animationDelay: '0s' }} 
        />
        <Anchor 
          size={40} 
          className="absolute text-navy animate-icon-sequence" 
          strokeWidth={1.5} 
          style={{ animationDelay: '-2s' }} 
        />
        <Plane 
          size={40} 
          className="absolute text-gold animate-icon-sequence" 
          strokeWidth={1.5} 
          style={{ animationDelay: '-1s' }} 
        />
      </div>
      {text && (
        <p className="mt-2 text-[11px] font-medium text-navy/40 tracking-wide uppercase">
          {text}
        </p>
      )}
    </div>
  );
}

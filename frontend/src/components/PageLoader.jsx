import React from 'react';
import { Shield, Anchor, Plane } from 'lucide-react';

export default function PageLoader({ text }) {
  return (
    <div className="w-full h-full flex-1 min-h-[70vh] flex flex-col items-center justify-center animate-in fade-in duration-700">
      <div className="relative w-16 h-16 flex items-center justify-center mb-2">
        <Shield 
          size={40} 
          className="absolute text-emerald-900 animate-icon-sequence" 
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
        <p className="mt-2 text-[10px] font-medium text-navy/40 tracking-wide uppercase">
          {text}
        </p>
      )}
    </div>
  );
}

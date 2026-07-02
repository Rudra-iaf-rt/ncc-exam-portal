import React from 'react';

export default function GlobalLoader({ text }) {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-stone animate-in fade-in duration-500">
      <div className="w-6 h-6 border-[2.5px] border-navy/10 border-t-navy/80 rounded-full animate-spin" />
      {text && (
        <p className="mt-4 text-[11px] font-medium text-navy/40 tracking-wide uppercase">
          {text}
        </p>
      )}
    </div>
  );
}

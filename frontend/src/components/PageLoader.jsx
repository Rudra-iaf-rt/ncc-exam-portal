import React from 'react';

export default function PageLoader({ text }) {
  return (
    <div className="w-full min-h-[50vh] flex flex-col items-center justify-center animate-in fade-in duration-700">
      <div className="w-5 h-5 border-[2px] border-navy/10 border-t-navy/60 rounded-full animate-spin" />
      {text && (
        <p className="mt-4 text-[10px] font-medium text-navy/40 tracking-wide uppercase">
          {text}
        </p>
      )}
    </div>
  );
}

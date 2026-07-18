import React from 'react';

export default function StatCard({ icon: Icon, count, label, colorCls, bgCls = "bg-white", borderCls = "border-stone-200/50", className = "" }) {
  return (
    <div className={`flex flex-col items-center justify-center py-5 px-3 rounded-2xl shadow-[0_2px_12px_-4px_rgba(0,0,0,0.06)] border ${borderCls} transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 ${bgCls} ${className}`}>
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon size={15} className={colorCls} strokeWidth={2.5} />
        <span className="font-ui text-[10px] sm:text-[11px] font-semibold uppercase tracking-widest text-ink-4">{label}</span>
      </div>
      <span className="font-display text-[26px] sm:text-[28px] font-medium tracking-tight text-ink leading-none">{count}</span>
    </div>
  );
}

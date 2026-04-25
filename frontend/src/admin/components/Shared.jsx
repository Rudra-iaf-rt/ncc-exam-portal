export function StatCard({ label, value, subtext, icon, colorClass = 'text-navy' }) {
  return (
    <div className="bg-white border border-stone-deep p-5 rounded-md shadow-sm">
      <div className="flex justify-between items-start mb-3">
        <span className="font-mono text-[11px] tracking-[0.1em] uppercase text-ink-4">{label}</span>
        {icon && <div className={`opacity-20 ${colorClass}`}>{icon}</div>}
      </div>
      <div className={`font-display text-3xl font-medium leading-none ${colorClass}`}>{value}</div>
      {subtext && <div className="font-ui text-[12px] text-ink-4 mt-2 font-medium">{subtext}</div>}
    </div>
  );
}

export function PageHeader({ title, subtitle, action }) {
  const renderTitle = () => {
    if (typeof title === 'string') {
      const parts = title.split('*');
      if (parts.length > 1) {
        return (
          <>
            {parts[0]}<em className="not-italic text-navy-soft">{parts[1]}</em>{parts[2] || ''}
          </>
        );
      }
    }
    return title;
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 mb-10 pb-6 border-b border-stone-mid">
      <div>
        <h1 className="font-display text-3xl font-medium text-ink leading-tight">{renderTitle()}</h1>
        {subtitle && <p className="font-ui text-[14px] text-ink-3 mt-1.5 font-normal">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

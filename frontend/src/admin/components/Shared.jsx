import '../admin.css';

export function StatCard({ label, value, subtext, color = 'var(--navy)' }) {
  return (
    <div className="adm-card adm-stat-card">
      <span className="adm-stat-label">{label}</span>
      <div className="adm-stat-value" style={{ color }}>{value}</div>
      {subtext && <div className="adm-stat-sub">{subtext}</div>}
    </div>
  );
}

export function PageHeader({ title, subtitle, action }) {
  // Title might have italicized text using <em>
  const renderTitle = () => {
    if (typeof title === 'string') {
      const parts = title.split('*');
      if (parts.length > 1) {
        return (
          <>
            {parts[0]}<em>{parts[1]}</em>{parts[2] || ''}
          </>
        );
      }
    }
    return title;
  };

  return (
    <div className="adm-page-header">
      <div>
        <h1 className="adm-page-title">{renderTitle()}</h1>
        {subtitle && <p className="adm-page-subtitle">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

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
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-4 pb-4 border-b border-stone-mid">
      <div>
        <h1 className="font-display text-2xl font-medium text-ink leading-tight">{renderTitle()}</h1>
        {subtitle && <p className="font-ui text-[13px] text-ink-3 mt-1 font-normal">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

export function Pagination({ currentPage, totalPages, onPageChange, loading }) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between border-t border-stone-deep bg-stone-wash px-4 py-3.5 sm:px-6">
      {/* Mobile view */}
      <div className="flex flex-1 justify-between sm:hidden">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1 || loading}
          className="relative inline-flex items-center rounded-md border border-stone-deep bg-white px-4 py-2 text-sm font-semibold text-ink-2 hover:bg-stone disabled:opacity-40 transition-colors"
        >
          Previous
        </button>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages || loading}
          className="relative ml-3 inline-flex items-center rounded-md border border-stone-deep bg-white px-4 py-2 text-sm font-semibold text-ink-2 hover:bg-stone disabled:opacity-40 transition-colors"
        >
          Next
        </button>
      </div>
      
      {/* Desktop view */}
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div>
          <p className="text-[13px] text-ink-3 font-ui">
            Showing Page <span className="font-semibold text-navy">{currentPage}</span> of{' '}
            <span className="font-semibold text-navy">{totalPages}</span>
          </p>
        </div>
        <div>
          <nav className="isolate inline-flex -space-x-px rounded-md" aria-label="Pagination">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage <= 1 || loading}
              className="relative inline-flex items-center rounded-l-md border border-stone-deep bg-white px-3 py-2 text-[13px] font-semibold text-ink-2 hover:bg-stone disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              &larr; Prev
            </button>
            
            {(() => {
              const pages = [];
              const start = Math.max(1, currentPage - 2);
              const end = Math.min(totalPages, currentPage + 2);

              if (start > 1) {
                pages.push(
                  <button
                    key={1}
                    onClick={() => onPageChange(1)}
                    disabled={loading}
                    className={`relative inline-flex items-center px-3 py-2 text-[13px] font-semibold border ${
                      currentPage === 1
                        ? 'z-10 bg-navy text-[#F4F0E4] border-navy'
                        : 'border-stone-deep bg-white text-ink-2 hover:bg-stone'
                    } transition-all`}
                  >
                    1
                  </button>
                );
                if (start > 2) {
                  pages.push(
                    <span key="dots-start" className="relative inline-flex items-center px-3 py-2 text-[13px] font-semibold text-ink-4 border border-stone-deep bg-white">
                      ...
                    </span>
                  );
                }
              }

              for (let page = start; page <= end; page++) {
                const isCurrent = page === currentPage;
                pages.push(
                  <button
                    key={page}
                    onClick={() => onPageChange(page)}
                    disabled={loading}
                    className={`relative inline-flex items-center px-3.5 py-2 text-[13px] font-semibold border ${
                      isCurrent
                        ? 'z-10 bg-navy text-[#F4F0E4] border-navy'
                        : 'border-stone-deep bg-white text-ink-2 hover:bg-stone'
                    } transition-all`}
                  >
                    {page}
                  </button>
                );
              }

              if (end < totalPages) {
                if (end < totalPages - 1) {
                  pages.push(
                    <span key="dots-end" className="relative inline-flex items-center px-3 py-2 text-[13px] font-semibold text-ink-4 border border-stone-deep bg-white">
                      ...
                    </span>
                  );
                }
                pages.push(
                  <button
                    key={totalPages}
                    onClick={() => onPageChange(totalPages)}
                    disabled={loading}
                    className={`relative inline-flex items-center px-3 py-2 text-[13px] font-semibold border ${
                      currentPage === totalPages
                        ? 'z-10 bg-navy text-[#F4F0E4] border-navy'
                        : 'border-stone-deep bg-white text-ink-2 hover:bg-stone'
                    } transition-all`}
                  >
                    {totalPages}
                  </button>
                );
              }

              return pages;
            })()}

            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage >= totalPages || loading}
              className="relative inline-flex items-center rounded-r-md border border-stone-deep bg-white px-3 py-2 text-[13px] font-semibold text-ink-2 hover:bg-stone disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              Next &rarr;
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
}

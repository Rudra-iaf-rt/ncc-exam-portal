import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, XCircle, Search, Loader2 } from 'lucide-react';

export default function MultiSelect({ options, selectedValues, onChange, placeholder, searchable = false, onOpen, isLoading = false }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = (val) => {
    const strVal = String(val);
    if (selectedValues.includes(strVal)) {
      onChange(selectedValues.filter(v => v !== strVal));
    } else {
      onChange([...selectedValues, strVal]);
    }
  };

  const hasSelections = selectedValues.length > 0;
  
  const filteredOptions = searchable 
    ? options.filter(opt => (opt.label || String(opt.value)).toLowerCase().includes(search.toLowerCase()))
    : options;

  return (
    <div className="relative" ref={containerRef}>
      {/* Trigger */}
      <div
        className={`w-full min-h-[46px] px-4 py-2 border rounded-xl font-ui text-[14px] bg-white flex flex-wrap gap-1 items-center cursor-pointer transition-all shadow-sm
          ${open ? 'border-navy-soft ring-[3px] ring-navy-wash' : 'border-stone-deep hover:border-navy-soft/50'}
        `}
        onClick={() => {
          if (!open && onOpen) onOpen();
          setOpen(!open);
        }}
      >
        {!hasSelections ? (
          <span className="text-ink-4 flex-1 select-none">{placeholder}</span>
        ) : (
          <div className="flex flex-wrap gap-1.5 flex-1 overflow-hidden py-0.5">
            {selectedValues.slice(0, 2).map(val => {
              const opt = options.find(o => String(o.value) === val);
              return (
                <span
                  key={val}
                  className="bg-navy/10 text-navy border border-navy/20 pl-2 pr-1.5 py-0.5 rounded-md text-[12px] flex items-center gap-1 font-medium max-w-[220px]"
                >
                  <span className="truncate">{opt?.label || val}</span>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onChange(selectedValues.filter(v => v !== val)); }}
                    className="text-navy/40 hover:text-crimson transition-colors flex-shrink-0 p-0.5"
                  >
                    <XCircle size={12} />
                  </button>
                </span>
              );
            })}
            {selectedValues.length > 2 && (
              <span className="bg-stone-wash text-ink-3 border border-stone px-2 py-0.5 rounded-md text-[12px] flex items-center font-medium self-start mt-[1px]">
                +{selectedValues.length - 2} more
              </span>
            )}
          </div>
        )}
        <ChevronDown
          size={14}
          className={`text-ink-4 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-[calc(100%+4px)] left-0 w-full bg-white border border-stone-deep rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.12)] z-30 max-h-[300px] overflow-hidden flex flex-col">
          {searchable && (
            <div className="border-b border-stone-deep bg-stone-wash/30 sticky top-0 z-10 flex items-center shrink-0">
              <Search className="text-ink-4 ml-3" size={14} />
              <input
                type="text"
                className="flex-1 h-[40px] pl-2 pr-3 bg-transparent text-[13px] outline-none placeholder:text-ink-4/70 text-navy"
                placeholder="Search options..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}
          <div className="overflow-y-auto flex-1 p-1">
            {isLoading ? (
              <div className="px-3 py-6 flex flex-col items-center justify-center gap-2 text-ink-4">
                <Loader2 size={18} className="animate-spin text-navy/50" />
                <span className="text-[12px] font-ui">Loading data...</span>
              </div>
            ) : options.length === 0 ? (
              <div className="px-3 py-4 text-[13px] text-ink-4 text-center font-ui">No options available</div>
            ) : filteredOptions.length === 0 ? (
              <div className="px-3 py-4 text-[13px] text-ink-4 text-center font-ui">No matches found</div>
            ) : (
              filteredOptions.map(opt => {
                const isChecked = selectedValues.includes(String(opt.value));
                return (
                  <label
                    key={opt.value}
                    className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer font-ui text-[13px] rounded-lg transition-colors
                      ${isChecked ? 'bg-navy-wash/30 text-navy font-medium' : 'hover:bg-stone-wash text-ink-2'}
                    `}
                >
                  <input
                    type="checkbox"
                    className="w-3.5 h-3.5 rounded border-stone-deep accent-navy cursor-pointer"
                    checked={isChecked}
                    onChange={() => toggle(opt.value)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  {opt.label}
                </label>
              );
            })
          )}
        </div>
      </div>
      )}
    </div>
  );
}

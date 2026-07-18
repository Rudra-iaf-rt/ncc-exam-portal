import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, XCircle } from 'lucide-react';

export default function MultiSelect({ options, selectedValues, onChange, placeholder }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
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

  return (
    <div className="relative" ref={containerRef}>
      {/* Trigger */}
      <div
        className={`w-full min-h-[38px] px-3 py-1.5 border rounded-md font-ui text-[14px] bg-white flex flex-wrap gap-1 items-center cursor-pointer transition-all
          ${open ? 'border-navy-soft ring-[3px] ring-navy-wash' : 'border-stone-deep'}
        `}
        onClick={() => setOpen(!open)}
      >
        {!hasSelections ? (
          <span className="text-ink-4 flex-1 select-none">{placeholder}</span>
        ) : (
          <div className="flex flex-wrap gap-1 flex-1">
            {selectedValues.map(val => {
              const opt = options.find(o => String(o.value) === val);
              return (
                <span
                  key={val}
                  className="bg-navy/10 text-navy border border-navy/20 px-2 py-0.5 rounded text-[12px] flex items-center gap-1 font-medium"
                >
                  {opt?.label || val}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onChange(selectedValues.filter(v => v !== val)); }}
                    className="text-navy/50 hover:text-crimson transition-colors"
                  >
                    <XCircle size={11} />
                  </button>
                </span>
              );
            })}
          </div>
        )}
        <ChevronDown
          size={14}
          className={`text-ink-4 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-[calc(100%+4px)] left-0 w-full bg-white border border-stone-deep rounded-md shadow-[0_10px_30px_rgba(0,0,0,0.12)] z-30 max-h-[220px] overflow-y-auto">
          {options.length === 0 ? (
            <div className="px-3 py-4 text-[12px] text-ink-4 text-center font-ui">Loading...</div>
          ) : (
            options.map(opt => {
              const isChecked = selectedValues.includes(String(opt.value));
              return (
                <label
                  key={opt.value}
                  className={`flex items-center gap-2.5 px-3 py-2.5 cursor-pointer font-ui text-[13px] border-b border-stone-mid last:border-0 transition-colors
                    ${isChecked ? 'bg-navy/5 text-navy font-medium' : 'hover:bg-stone-wash text-ink-2'}
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
      )}
    </div>
  );
}

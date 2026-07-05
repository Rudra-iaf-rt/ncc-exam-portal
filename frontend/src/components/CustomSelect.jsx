import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Search } from 'lucide-react';

const CustomSelect = ({ 
  label, 
  options = [], 
  value, 
  onChange, 
  placeholder = "Select...", 
  searchable = false,
  className = "",
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Format options to handle both string array and object array [{value, label}]
  const formattedOptions = options.map(opt => {
    if (typeof opt === 'object' && opt !== null) {
      return { value: opt.value, label: opt.label };
    }
    return { value: opt, label: String(opt) };
  });

  const filteredOptions = formattedOptions.filter(opt => 
    opt.label.toLowerCase().includes(search.toLowerCase())
  );

  const selectedOption = formattedOptions.find(opt => opt.value === value);
  const displayValue = selectedOption ? selectedOption.label : placeholder;

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && <label className="block font-mono text-[10px] tracking-[0.1em] uppercase text-ink-3 mb-1.5">{label}</label>}
      <div 
        className={`flex items-center justify-between w-full h-[46px] px-4 border rounded-xl font-ui text-[14px] bg-white transition-all 
          ${disabled ? 'opacity-60 cursor-not-allowed bg-stone-wash' : 'cursor-pointer'}
          ${isOpen ? 'border-navy-soft ring-[3px] ring-navy-wash' : 'border-stone-deep hover:border-navy-soft/50 shadow-sm'}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <span className={value ? 'text-ink font-medium' : 'text-ink-4 truncate'}>
          {displayValue}
        </span>
        <ChevronDown size={14} className={`transition-transform duration-200 shrink-0 text-ink-4 ${isOpen ? 'rotate-180 text-navy' : ''}`} />
      </div>

      {isOpen && !disabled && (
        <div className="absolute z-[1100] top-[100%] left-0 w-full mt-2 bg-white border border-stone-deep rounded-xl shadow-lg overflow-hidden">
          {searchable && (
            <div className="p-2 border-b border-stone bg-stone-wash/50">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-4" size={14} />
                <input 
                  autoFocus
                  type="text" 
                  className="w-full h-[36px] pl-9 pr-3 bg-white border border-stone-deep rounded-lg text-[13px] outline-none focus:border-navy-soft focus:ring-[3px] focus:ring-navy-wash transition-all"
                  placeholder="Search..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  onClick={e => e.stopPropagation()}
                />
              </div>
            </div>
          )}
          <div className="max-h-[200px] overflow-y-auto py-1">
            <div 
              className="px-4 py-2.5 text-[13px] text-navy font-semibold hover:bg-navy-wash/50 cursor-pointer border-b border-stone transition-colors"
              onClick={() => { onChange(""); setSearch(""); setIsOpen(false); }}
            >
              Clear Selection (All)
            </div>
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-4 text-center text-ink-4 text-[13px] italic">No results match your search</div>
            ) : (
              filteredOptions.map(opt => (
                <div 
                  key={opt.value}
                  className={`px-4 py-2.5 text-[13px] hover:bg-navy hover:text-white cursor-pointer transition-colors ${value === opt.value ? 'bg-navy-wash/50 text-navy font-bold hover:text-navy hover:bg-navy-wash/50' : 'text-ink font-medium'}`}
                  onClick={() => { onChange(opt.value); setSearch(""); setIsOpen(false); }}
                >
                  {opt.label}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomSelect;

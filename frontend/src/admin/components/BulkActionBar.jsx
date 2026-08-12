import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Trash2, X } from 'lucide-react';

export function BulkActionBar({ 
  selectedCount, 
  onClearSelection, 
  isProcessing,
  children 
}) {
  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          initial={{ y: 100, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 100, opacity: 0, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 500, damping: 30, mass: 1 }}
          className="fixed bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 sm:gap-4 bg-white/90 backdrop-blur-xl border border-stone-deep shadow-2xl px-3 py-2 sm:px-5 sm:py-3 rounded-2xl w-auto max-w-fit"
        >
          <div className="flex items-center gap-1.5 sm:gap-2 pr-2 sm:pr-4 border-r border-stone-deep shrink-0">
            <div className="bg-navy text-white text-[11px] font-mono px-2 py-0.5 rounded-full">
              {selectedCount}
            </div>
            <span className="hidden sm:inline-block text-[13.5px] font-medium text-ink-2">selected</span>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {children}
          </div>

          <button
            onClick={onClearSelection}
            disabled={isProcessing}
            className="ml-1 sm:ml-2 p-1 sm:p-1.5 rounded-full text-ink-4 hover:bg-stone-wash hover:text-ink-2 transition-colors disabled:opacity-50 shrink-0"
            aria-label="Clear selection"
          >
            <X size={16} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function BulkActionButton({ icon: Icon, label, onClick, disabled, variant = "default" }) {
  const baseClasses = "flex items-center gap-1.5 sm:gap-2 px-2 py-1.5 sm:px-3 rounded-lg text-[12px] sm:text-[13px] font-medium transition-colors disabled:opacity-50 whitespace-nowrap";
  const variants = {
    default: "text-ink-2 hover:bg-stone-wash hover:text-navy",
    danger: "text-crimson hover:bg-rose-50"
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variants[variant]}`}
    >
      <Icon size={16} className="shrink-0" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

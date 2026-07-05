/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useCallback } from 'react';
import { AlertTriangle, XCircle, Check } from 'lucide-react';

const ConfirmContext = createContext();

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context;
};

export const ConfirmProvider = ({ children }) => {
  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    isDanger: false,
    resolve: null
  });

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      setConfirmState({
        isOpen: true,
        title: options.title || 'Are you sure?',
        message: options.message || 'Do you want to proceed with this action?',
        confirmText: options.confirmText || 'Confirm',
        cancelText: options.cancelText || 'Cancel',
        isDanger: options.isDanger || false,
        resolve
      });
    });
  }, []);

  const handleClose = useCallback(() => {
    setConfirmState(prev => {
      if (prev.resolve) prev.resolve(false);
      return { ...prev, isOpen: false };
    });
  }, []);

  const handleConfirm = useCallback(() => {
    setConfirmState(prev => {
      if (prev.resolve) prev.resolve(true);
      return { ...prev, isOpen: false };
    });
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {confirmState.isOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-[#0E1929]/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div 
            className="bg-[#FDFCF8] border border-stone-deep rounded-2xl w-full max-w-[450px] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.15)] animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="bg-stone border-b border-stone-mid px-6 py-5 flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                {confirmState.isDanger ? (
                  <AlertTriangle size={20} className="text-crimson" />
                ) : (
                  <Check size={20} className="text-navy" />
                )}
                <h2 className={`m-0 font-ui text-[18px] font-semibold ${confirmState.isDanger ? 'text-navy' : 'text-navy'}`}>
                  {confirmState.title}
                </h2>
              </div>
              <button 
                className="text-ink-4 hover:bg-stone-mid hover:text-ink p-1.5 rounded-full transition-colors" 
                onClick={handleClose}
              >
                <XCircle size={20} strokeWidth={1.5} />
              </button>
            </div>
            
            <div className="p-6">
              <p className="text-ink-3 text-[14px] leading-relaxed font-ui">
                {confirmState.message}
              </p>
              
              <div className="mt-8 flex items-center justify-end gap-4">
                <button
                  onClick={handleClose}
                  className="px-6 py-2.5 bg-white border border-stone-deep rounded-md font-ui text-[13px] font-medium text-ink-2 hover:bg-stone transition-all"
                >
                  {confirmState.cancelText}
                </button>
                <button
                  onClick={handleConfirm}
                  className={`px-6 py-2.5 rounded-md font-ui text-[13px] font-medium transition-all ${
                    confirmState.isDanger 
                      ? 'bg-crimson text-[#F4F0E4] hover:bg-crimson-deep' 
                      : 'bg-navy text-[#F4F0E4] hover:bg-navy-mid'
                  }`}
                >
                  {confirmState.confirmText}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
};

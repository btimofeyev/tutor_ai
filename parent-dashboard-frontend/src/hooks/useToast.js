// parent-dashboard-frontend/src/hooks/useToast.js
'use client';

import { createContext, useContext, useState, useCallback } from 'react';
import Toast from '../components/ui/Toast';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'success', duration = 3000) => {
    const id = Date.now();
    setToast({ id, message, type });
    setTimeout(() => {
      setToast(currentToast => (currentToast?.id === id ? null : currentToast));
    }, duration);
  }, []);

  const value = { showToast };

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

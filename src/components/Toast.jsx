import React, { createContext, useContext, useCallback, useState } from 'react';

// Global toast notifications. Wrap the app in <ToastProvider> and call
// useToast() → { success, error, info } anywhere.
const ToastContext = createContext(null);

let idSeq = 0;

const STYLES = {
  success: 'bg-emerald-600',
  error: 'bg-rose-600',
  info: 'bg-slate-800',
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback(id => {
    setToasts(t => t.filter(x => x.id !== id));
  }, []);

  const push = useCallback(
    (type, message) => {
      const id = ++idSeq;
      setToasts(t => [...t, { id, type, message }]);
      setTimeout(() => remove(id), 4000);
    },
    [remove],
  );

  const api = {
    success: m => push('success', m),
    error: m => push('error', m),
    info: m => push('info', m),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-80 max-w-[90vw]">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`${STYLES[t.type] || STYLES.info} text-white text-sm rounded-lg shadow-lg px-4 py-3 flex items-start gap-2 animate-[fadeIn_.15s_ease]`}
            role="alert"
          >
            <span className="flex-1">{t.message}</span>
            <button onClick={() => remove(t.id)} className="opacity-70 hover:opacity-100">✕</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}

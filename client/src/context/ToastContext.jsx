import { createContext, useContext, useState, useCallback, useRef } from 'react';

const ToastContext = createContext(null);

let counter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((message, type = 'success', duration = 4000) => {
    counter += 1;
    const id = counter;
    setToasts((list) => [...list, { id, message, type }]);
    if (duration) setTimeout(() => remove(id), duration);
    return id;
  }, [remove]);

  const toast = useCallback((message, type = 'success') => push(message, type), [push]);
  const success = useCallback((m) => push(m, 'success'), [push]);
  const error = useCallback((m) => push(m, 'error', 6000), [push]);
  const info = useCallback((m) => push(m, 'info', 4500), [push]);

  return (
    <ToastContext.Provider value={{ toast, success, error, info, remove }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col-reverse gap-2 items-end pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            onClick={() => remove(t.id)}
            className={`pointer-events-auto flex items-center gap-3 pl-4 pr-3 py-3 rounded-lg shadow-lg text-sm text-white min-w-[260px] max-w-sm cursor-pointer ${
              t.type === 'error' ? 'bg-red-600' : t.type === 'info' ? 'bg-slate-700' : 'bg-emerald-600'
            }`}
          >
            <span className="flex-1">{t.message}</span>
            <span className="text-white/70 font-bold">&times;</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

export default ToastContext;
// MACCAN RMS - Toast Notification System
import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

const ToastContext = createContext(null);

let toastId = 0;

const TOAST_DURATION = 5000; // 5 seconds default

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timerRef = useRef({});

  const addToast = useCallback(({ type = 'info', title, message, duration = TOAST_DURATION, icon }) => {
    const id = ++toastId;
    const toast = { id, type, title, message, icon, createdAt: Date.now() };
    setToasts(prev => [...prev, toast]);

    if (duration > 0) {
      timerRef.current[id] = setTimeout(() => {
        removeToast(id);
      }, duration);
    }

    return id;
  }, []);

  const removeToast = useCallback((id) => {
    if (timerRef.current[id]) {
      clearTimeout(timerRef.current[id]);
      delete timerRef.current[id];
    }
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Convenience methods
  const success = useCallback((title, message) => addToast({ type: 'success', title, message, icon: '✅' }), [addToast]);
  const error = useCallback((title, message) => addToast({ type: 'error', title, message, icon: '❌', duration: 8000 }), [addToast]);
  const warning = useCallback((title, message) => addToast({ type: 'warning', title, message, icon: '⚠️', duration: 7000 }), [addToast]);
  const info = useCallback((title, message) => addToast({ type: 'info', title, message, icon: 'ℹ️' }), [addToast]);

  // Domain-specific shortcuts
  const orderPlaced = useCallback((table, items) => {
    success(
      'سفارش ثبت شد 🍽️',
      `میز ${table} — ${items} آیتم ثبت شد`
    );
  }, [success]);

  const orderReady = useCallback((table) => {
    info(
      'سفارش آماده شد ✅',
      `میز ${table} — غذا آماده سرو است`
    );
  }, [info]);

  const inventoryAlert = useCallback((item, detail) => {
    warning(
      'هشدار انبار ⚠️',
      `${item}: ${detail}`
    );
  }, [warning]);

  const stockReceived = useCallback((itemName, qty) => {
    success(
      'کالا دریافت شد 📦',
      `${itemName} — ${qty} واحد ثبت شد`
    );
  }, [success]);

  const systemEvent = useCallback((title, detail) => {
    info(title, detail);
  }, [info]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      Object.values(timerRef.current).forEach(clearTimeout);
    };
  }, []);

  return (
    <ToastContext.Provider value={{
      toasts, addToast, removeToast,
      success, error, warning, info,
      orderPlaced, orderReady, inventoryAlert, stockReceived, systemEvent,
    }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

// Toast display component
function ToastContainer({ toasts, removeToast }) {
  if (toasts.length === 0) return null;

  const typeStyles = {
    success: 'bg-green-800 border-green-600',
    error: 'bg-red-800 border-red-600',
    warning: 'bg-yellow-800 border-yellow-600',
    info: 'bg-blue-800 border-blue-600',
  };

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 max-w-sm">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`${typeStyles[toast.type] || typeStyles.info} text-white rounded-lg shadow-2xl border-l-4 p-4 pr-10 animate-slide-in cursor-pointer relative transition-all duration-300 hover:scale-[1.02]`}
          onClick={() => removeToast(toast.id)}
        >
          {/* Progress bar */}
          <div className="absolute bottom-0 left-0 h-0.5 bg-white/30 rounded-b-lg animate-shrink" style={{ animationDuration: `${toast.duration || TOAST_DURATION}ms` }} />

          <div className="flex items-start gap-3">
            <span className="text-xl flex-shrink-0 mt-0.5">{toast.icon}</span>
            <div className="min-w-0">
              <div className="font-bold text-sm">{toast.title}</div>
              {toast.message && (
                <div className="text-xs opacity-90 mt-1 leading-relaxed">{toast.message}</div>
              )}
            </div>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); removeToast(toast.id); }}
            className="absolute top-2 left-2 text-white/60 hover:text-white text-sm"
          >
            ✕
          </button>
        </div>
      ))}

      <style>{`
        @keyframes slide-in {
          from { opacity: 0; transform: translateX(100%); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
        .animate-slide-in { animation: slide-in 0.3s ease-out; }
        .animate-shrink { animation: shrink linear forwards; }
      `}</style>
    </div>
  );
}

export const useToast = () => useContext(ToastContext);

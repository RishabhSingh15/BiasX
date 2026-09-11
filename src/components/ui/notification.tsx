'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { 
  Check, 
  AlertTriangle, 
  AlertOctagon, 
  Info, 
  Sparkles, 
  X, 
  Trash2,
  HelpCircle 
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'destructive' | 'primary';
}

interface NotificationContextValue {
  toast: (options: Omit<ToastItem, 'id'>) => string;
  success: (title: string, message?: string, duration?: number) => string;
  error: (title: string, message?: string, duration?: number) => string;
  warning: (title: string, message?: string, duration?: number) => string;
  info: (title: string, message?: string, duration?: number) => string;
  dismiss: (id: string) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

// Global event bus so non-hook code can also trigger notifications
type Listener = (val: any) => void;
const toastListeners = new Set<Listener>();
const confirmListeners = new Set<Listener>();

export const notify = {
  success: (title: string, message?: string, duration?: number) => {
    toastListeners.forEach(fn => fn({ type: 'success', title, message, duration }));
  },
  error: (title: string, message?: string, duration?: number) => {
    toastListeners.forEach(fn => fn({ type: 'error', title, message, duration }));
  },
  warning: (title: string, message?: string, duration?: number) => {
    toastListeners.forEach(fn => fn({ type: 'warning', title, message, duration }));
  },
  info: (title: string, message?: string, duration?: number) => {
    toastListeners.forEach(fn => fn({ type: 'info', title, message, duration }));
  },
  confirm: (options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      confirmListeners.forEach(fn => fn({ ...options, resolve }));
    });
  }
};

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<(ConfirmOptions & { resolve: (val: boolean) => void }) | null>(null);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((options: Omit<ToastItem, 'id'>) => {
    const id = 'toast-' + Math.random().toString(36).substring(2, 9) + '-' + Date.now();
    const item: ToastItem = {
      ...options,
      id,
      duration: options.duration ?? 4500,
    };
    setToasts(prev => [item, ...prev].slice(0, 4));
    return id;
  }, []);

  const success = useCallback((title: string, message?: string, duration?: number) => {
    return addToast({ type: 'success', title, message, duration });
  }, [addToast]);

  const error = useCallback((title: string, message?: string, duration?: number) => {
    return addToast({ type: 'error', title, message, duration });
  }, [addToast]);

  const warning = useCallback((title: string, message?: string, duration?: number) => {
    return addToast({ type: 'warning', title, message, duration });
  }, [addToast]);

  const info = useCallback((title: string, message?: string, duration?: number) => {
    return addToast({ type: 'info', title, message, duration });
  }, [addToast]);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise(resolve => {
      setConfirmDialog({ ...options, resolve });
    });
  }, []);

  // Wire listener subscriptions
  useEffect(() => {
    const onToast = (item: any) => addToast(item);
    const onConfirm = (item: any) => setConfirmDialog(item);

    toastListeners.add(onToast);
    confirmListeners.add(onConfirm);

    return () => {
      toastListeners.delete(onToast);
      confirmListeners.delete(onConfirm);
    };
  }, [addToast]);

  return (
    <NotificationContext.Provider value={{
      toast: addToast,
      success,
      error,
      warning,
      info,
      dismiss,
      confirm
    }}>
      {children}

      {/* Floating Animated Toast Container */}
      <div 
        aria-live="polite"
        className="fixed top-5 right-5 z-[9999] flex flex-col gap-3.5 max-w-sm sm:max-w-md w-full pointer-events-none select-none px-3 sm:px-0"
      >
        {toasts.map(t => (
          <ToastCard key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>

      {/* Animated Neumorphic Confirmation Modal */}
      {confirmDialog && (
        <div className="fixed inset-0 z-[10000] p-4 bg-[#2D3748]/35 backdrop-blur-md flex items-center justify-center animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#E0E5EC] neu-raised rounded-[32px] border border-[#A0AEC0]/30 shadow-2xl p-6 sm:p-7 space-y-4.5 animate-in zoom-in-95 duration-200">
            {/* Top Icon */}
            <div className="flex justify-center">
              <div className={cn(
                "w-14 h-14 rounded-[22px] neu-inset flex items-center justify-center shadow-inner",
                confirmDialog.variant === 'destructive' ? "text-[#FF6B6B]" : "text-[#6C63FF]"
              )}>
                {confirmDialog.variant === 'destructive' ? (
                  <Trash2 className="w-7 h-7" />
                ) : (
                  <HelpCircle className="w-7 h-7" />
                )}
              </div>
            </div>

            {/* Content */}
            <div className="text-center space-y-1.5">
              <h3 className="text-lg font-bold font-heading text-[#2D3748]">
                {confirmDialog.title}
              </h3>
              <p className="text-xs sm:text-sm text-[#4A5568] font-body leading-relaxed max-w-sm mx-auto">
                {confirmDialog.message}
              </p>
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  confirmDialog.resolve(false);
                  setConfirmDialog(null);
                }}
                className="flex-1 bg-[#E0E5EC] neu-raised-sm hover:neu-inset-sm text-[#4A5568] hover:text-[#2D3748] font-heading font-semibold py-2.5 rounded-[20px] text-xs transition-all cursor-pointer border border-[#A0AEC0]/20"
              >
                {confirmDialog.cancelText || 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => {
                  confirmDialog.resolve(true);
                  setConfirmDialog(null);
                }}
                className={cn(
                  "flex-1 font-heading font-bold py-2.5 rounded-[20px] text-xs transition-all cursor-pointer shadow-md text-white flex items-center justify-center gap-1.5",
                  confirmDialog.variant === 'destructive'
                    ? "bg-[#FF6B6B] hover:bg-[#FF6B6B]/90"
                    : "neu-btn-primary"
                )}
              >
                {confirmDialog.confirmText || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    return {
      toast: notify.info,
      success: notify.success,
      error: notify.error,
      warning: notify.warning,
      info: notify.info,
      dismiss: () => {},
      confirm: notify.confirm
    };
  }
  return context;
}

// ─── INDIVIDUAL TOAST CARD COMPONENT ──────────────────────────────────────────

function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(100);
  const duration = toast.duration || 4500;
  const elapsedRef = useRef(0);

  useEffect(() => {
    if (duration <= 0) return;

    const interval = setInterval(() => {
      if (!isPaused) {
        elapsedRef.current += 50;
        const remaining = Math.max(0, 100 - (elapsedRef.current / duration) * 100);
        setProgress(remaining);
        if (elapsedRef.current >= duration) {
          clearInterval(interval);
          onDismiss();
        }
      }
    }, 50);

    return () => clearInterval(interval);
  }, [duration, isPaused, onDismiss]);

  const isSuccess = toast.type === 'success';
  const isError = toast.type === 'error';
  const isWarning = toast.type === 'warning';

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      role="alert"
      className={cn(
        "pointer-events-auto relative overflow-hidden rounded-[24px] bg-[#E0E5EC] neu-raised border shadow-2xl p-4 sm:p-4.5 transition-all duration-300 transform animate-in slide-in-from-top-4 fade-in-80",
        isSuccess ? "border-[#38B2AC]/40" : isError ? "border-[#FF6B6B]/40" : isWarning ? "border-[#D69E2E]/40" : "border-[#6C63FF]/40"
      )}
    >
      <div className="flex items-start gap-3.5">
        {/* Animated Icon */}
        <div className={cn(
          "w-10 h-10 rounded-[16px] neu-inset-sm flex items-center justify-center shrink-0 transition-transform duration-300",
          isSuccess ? "text-[#38B2AC]" : isError ? "text-[#FF6B6B]" : isWarning ? "text-[#D69E2E]" : "text-[#6C63FF]"
        )}>
          {isSuccess && <Check className="w-5 h-5 animate-in zoom-in-75 duration-200" />}
          {isError && <AlertOctagon className="w-5 h-5 animate-bounce duration-700" />}
          {isWarning && <AlertTriangle className="w-5 h-5 animate-pulse" />}
          {toast.type === 'info' && <Sparkles className="w-5 h-5 animate-spin duration-1000" />}
        </div>

        {/* Text Details */}
        <div className="flex-1 min-w-0 pr-1">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-bold font-heading text-[#2D3748] tracking-tight">
              {toast.title}
            </h4>
            <button
              onClick={onDismiss}
              aria-label="Close notification"
              className="w-6 h-6 rounded-full flex items-center justify-center neu-raised-sm hover:neu-inset-sm text-[#718096] hover:text-[#2D3748] transition-all cursor-pointer text-xs shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {toast.message && (
            <p className="text-xs text-[#4A5568] font-body mt-1 leading-relaxed">
              {toast.message}
            </p>
          )}

          {toast.action && (
            <button
              onClick={() => {
                toast.action?.onClick();
                onDismiss();
              }}
              className="mt-2.5 text-xs font-heading font-bold text-[#6C63FF] hover:underline cursor-pointer flex items-center gap-1"
            >
              <span>{toast.action.label}</span>
              <span>&rarr;</span>
            </button>
          )}
        </div>
      </div>

      {/* Countdown Progress Bar */}
      {duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#A0AEC0]/20 overflow-hidden">
          <div 
            className={cn(
              "h-full transition-all duration-75 ease-linear",
              isSuccess ? "bg-[#38B2AC]" : isError ? "bg-[#FF6B6B]" : isWarning ? "bg-[#D69E2E]" : "bg-[#6C63FF]"
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}
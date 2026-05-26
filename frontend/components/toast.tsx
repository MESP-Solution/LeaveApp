"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { CheckCircle2, XCircle, AlertCircle, Info, X } from "lucide-react";

export type ToastTone = "success" | "error" | "warning" | "info";

interface ToastItem {
  id: number;
  tone: ToastTone;
  message: string;
}

interface ToastApi {
  show: (tone: ToastTone, message: string) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastApi | undefined>(undefined);
const TOAST_DURATION_MS = 4500;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);
  const timersRef = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback(
    (tone: ToastTone, message: string) => {
      if (!message) return;
      idRef.current += 1;
      const id = idRef.current;
      setToasts((current) => [...current, { id, tone, message }]);
      const timer = setTimeout(() => dismiss(id), TOAST_DURATION_MS);
      timersRef.current.set(id, timer);
    },
    [dismiss],
  );

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      show,
      success: (message) => show("success", message),
      error: (message) => show("error", message),
      warning: (message) => show("warning", message),
      info: (message) => show("info", message),
      dismiss,
    }),
    [dismiss, show],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastViewport onDismiss={dismiss} toasts={toasts} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
}

function ToastViewport({
  onDismiss,
  toasts,
}: {
  onDismiss: (id: number) => void;
  toasts: ToastItem[];
}) {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed top-4 left-4 right-4 md:left-auto md:right-4 z-[100] flex flex-col gap-2.5 w-auto md:w-full md:max-w-sm"
      role="region"
    >
      {/* Inject premium hardware-accelerated cubic-bezier animations */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes toastEnter {
          from {
            transform: translateY(-16px) scale(0.95);
            opacity: 0;
          }
          to {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }
        @keyframes toastProgress {
          from { width: 100%; }
          to { width: 0%; }
        }
        .animate-toast-enter {
          animation: toastEnter 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-toast-progress {
          animation: toastProgress ${TOAST_DURATION_MS}ms linear forwards;
        }
      `}} />

      {toasts.map((toast) => (
        <ToastCard
          key={toast.id}
          message={toast.message}
          onDismiss={() => onDismiss(toast.id)}
          tone={toast.tone}
        />
      ))}
    </div>
  );
}

function ToastCard({
  message,
  onDismiss,
  tone,
}: {
  message: string;
  onDismiss: () => void;
  tone: ToastTone;
}) {
  const palette = tonePalette[tone];

  return (
    <div
      className={`pointer-events-auto relative overflow-hidden flex items-start gap-3.5 rounded-2xl border px-4.5 py-4 shadow-[0_10px_30px_-5px_rgba(8,13,25,0.06),0_4px_12px_-2px_rgba(8,13,25,0.03),0_0_0_1px_rgba(8,13,25,0.01)] transition-all duration-300 hover:shadow-[0_20px_40px_-5px_rgba(8,13,25,0.1)] active:scale-[0.99] animate-toast-enter ${palette.card}`}
      role="status"
    >
      {/* Tone Specific Icon Container */}
      <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${palette.iconBg} ${palette.iconText}`}>
        <ToneIcon tone={tone} />
      </div>

      {/* Message Label */}
      <p className="flex-1 text-sm font-medium text-slate-800 leading-snug mt-1.5 pr-2">
        {message}
      </p>

      {/* Modern Compact Dismiss Button */}
      <button
        aria-label="Đóng thông báo"
        className="flex-shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100/80 hover:text-slate-700 active:scale-95 transition-all duration-150 mt-0.5"
        onClick={onDismiss}
        type="button"
      >
        <X className="h-4 w-4 stroke-[2.5]" />
      </button>

      {/* Depleting Live Countdown Progress Bar */}
      <div className={`absolute bottom-0 left-0 h-1 animate-toast-progress ${palette.bar}`} />
    </div>
  );
}

function ToneIcon({ tone }: { tone: ToastTone }) {
  const props = { "aria-hidden": true, className: "h-5 w-5 stroke-[2.25]" };

  switch (tone) {
    case "success":
      return <CheckCircle2 {...props} />;
    case "error":
      return <XCircle {...props} />;
    case "warning":
      return <AlertCircle {...props} />;
    case "info":
    default:
      return <Info {...props} />;
  }
}

const tonePalette: Record<ToastTone, { card: string; iconBg: string; iconText: string; bar: string }> = {
  success: {
    card: "border-emerald-100/60 bg-white/95 backdrop-blur-md",
    iconBg: "bg-emerald-50/70 border border-emerald-100/20",
    iconText: "text-[var(--success-color)]",
    bar: "bg-[var(--success-color)]",
  },
  error: {
    card: "border-rose-100/60 bg-white/95 backdrop-blur-md",
    iconBg: "border-indigo-100/90 border border-rose-100/20",
    iconText: "text-[var(--error-color)]",
    bar: "bg-[var(--error-color)]",
  },
  warning: {
    card: "border-amber-100/60 bg-white/95 backdrop-blur-md",
    iconBg: "bg-amber-50/70 border border-amber-100/20",
    iconText: "text-amber-600",
    bar: "bg-amber-500",
  },
  info: {
    card: "border-sky-100/60 bg-white/95 backdrop-blur-md",
    iconBg: "bg-sky-50/70 border border-sky-100/20",
    iconText: "text-sky-600",
    bar: "bg-[var(--pending-color)]",
  },
};

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

  // Clean up any pending timers when the provider unmounts.
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
  if (toasts.length === 0) {
    return null;
  }

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed top-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2"
      role="region"
    >
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
      className={`pointer-events-auto flex items-start gap-3 rounded-md border bg-white p-3 shadow-md ${palette.border}`}
      role="status"
    >
      <span className={`mt-0.5 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full ${palette.iconBg}`}>
        <ToneIcon tone={tone} />
      </span>
      <p className={`flex-1 text-sm leading-snug ${palette.text}`}>{message}</p>
      <button
        aria-label="Đóng thông báo"
        className="flex-shrink-0 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        onClick={onDismiss}
        type="button"
      >
        <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path d="M6 6l12 12M6 18L18 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}

function ToneIcon({ tone }: { tone: ToastTone }) {
  const stroke = "white";
  const props = {
    "aria-hidden": true,
    className: "h-3 w-3",
    fill: "none",
    stroke,
    strokeWidth: 3,
    viewBox: "0 0 24 24",
  } as const;

  if (tone === "success") {
    return (
      <svg {...props}>
        <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (tone === "error") {
    return (
      <svg {...props}>
        <path d="M6 6l12 12M6 18L18 6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (tone === "warning") {
    return (
      <svg {...props}>
        <path d="M12 9v4m0 4h.01" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg {...props}>
      <path d="M12 8v4m0 4h.01" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const tonePalette: Record<ToastTone, { border: string; text: string; iconBg: string }> = {
  success: {
    border: "border-emerald-200",
    text: "text-emerald-900",
    iconBg: "bg-emerald-600",
  },
  error: {
    border: "border-rose-200",
    text: "text-rose-900",
    iconBg: "bg-rose-600",
  },
  warning: {
    border: "border-amber-200",
    text: "text-amber-900",
    iconBg: "bg-amber-500",
  },
  info: {
    border: "border-sky-200",
    text: "text-sky-900",
    iconBg: "bg-sky-600",
  },
};

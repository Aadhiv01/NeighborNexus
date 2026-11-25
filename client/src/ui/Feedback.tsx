import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CheckIcon, XIcon } from "./Icons";

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`nn-motion block rounded-ui ${className}`}
      style={{
        background: "linear-gradient(90deg, var(--surface-2) 25%, var(--line) 50%, var(--surface-2) 75%)",
        backgroundSize: "200% 100%",
        animation: "nn-shimmer 1.6s linear infinite",
      }}
    />
  );
}

export function PageLoading({ label = "Loading" }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="mx-auto max-w-[1080px] px-5 py-16">
      <span className="sr-only">{label}</span>
      <Skeleton className="mb-4 h-9 w-1/3" />
      <Skeleton className="mb-3 h-5 w-2/3" />
      <Skeleton className="h-5 w-1/2" />
    </div>
  );
}

export function EmptyState({
  title, children, action,
}: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-card border border-dashed border-line bg-surface p-8 text-center">
      <p className="m-0 font-display text-xl font-semibold">{title}</p>
      {children && <p className="mx-auto mb-0 mt-2 max-w-md text-ink-soft">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="m-0 rounded-ui border border-warn bg-warn/10 px-3 py-2 text-sm font-semibold text-ink">
      {children}
    </p>
  );
}

/* ── Toasts ─────────────────────────────────────────────── */

type Tone = "success" | "error" | "info";
interface ToastItem { id: number; tone: Tone; title: string; detail?: string }

const ToastContext = createContext<(t: Omit<ToastItem, "id">) => void>(() => {});
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const next = useRef(1);

  const dismiss = useCallback((id: number) => setItems((l) => l.filter((t) => t.id !== id)), []);
  const push = useCallback(
    (t: Omit<ToastItem, "id">) => {
      const id = next.current++;
      setItems((l) => [...l.slice(-3), { ...t, id }]);
    },
    []
  );

  const value = useMemo(() => push, [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        role="region"
        aria-label="Notifications"
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 right-4 z-[200] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2"
      >
        <AnimatePresence>
          {items.map((t) => (
            <ToastView key={t.id} item={t} onDone={() => dismiss(t.id)} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

function ToastView({ item, onDone }: { item: ToastItem; onDone: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDone, item.tone === "error" ? 6000 : 3500);
    return () => clearTimeout(timer);
  }, [item, onDone]);

  const tone = item.tone === "error" ? "border-warn" : item.tone === "success" ? "border-good" : "border-line";
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ type: "spring", stiffness: 420, damping: 32 }}
      className={`pointer-events-auto flex items-start gap-3 rounded-card border bg-surface p-4 shadow-lg ${tone}`}
    >
      <span className={`mt-0.5 ${item.tone === "error" ? "text-warn" : "text-good"}`}>
        {item.tone === "error" ? <XIcon /> : <CheckIcon />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="m-0 text-sm font-semibold">{item.title}</p>
        {item.detail && <p className="m-0 mt-0.5 text-sm text-ink-soft">{item.detail}</p>}
      </div>
      <button
        onClick={onDone}
        aria-label="Dismiss notification"
        className="rounded-ui p-1 text-ink-soft hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
      >
        <XIcon width={16} height={16} />
      </button>
    </motion.div>
  );
}

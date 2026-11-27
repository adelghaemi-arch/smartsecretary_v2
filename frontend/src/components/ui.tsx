import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../utils/cn";
import type { Priority } from "../lib/types";

/* ---------------- Surface / Card ---------------- */
export function Card({
  className,
  children,
  hover = false,
}: {
  className?: string;
  children: ReactNode;
  hover?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200/80 bg-white/90 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)]",
        "dark:border-white/8 dark:bg-white/[0.035] dark:shadow-[0_1px_0_rgba(255,255,255,0.03)_inset]",
        hover &&
          "transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-300/70 hover:shadow-[0_18px_40px_-18px_rgba(79,70,229,0.35)] dark:hover:border-brand-400/40",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SectionTitle({
  icon,
  title,
  action,
}: {
  icon?: ReactNode;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-1">
      <div className="flex items-center gap-2">
        {icon && <span className="text-brand-500 dark:text-brand-400">{icon}</span>}
        <h3 className="text-[15px] font-bold tracking-tight text-slate-800 dark:text-slate-100">{title}</h3>
      </div>
      {action}
    </div>
  );
}

/* ---------------- Button ---------------- */
type BtnVariant = "primary" | "ghost" | "soft" | "outline" | "danger";
export function Button({
  children,
  onClick,
  variant = "soft",
  className,
  size = "md",
  type = "button",
  disabled,
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: BtnVariant;
  className?: string;
  size?: "sm" | "md" | "lg" | "icon";
  type?: "button" | "submit";
  disabled?: boolean;
  title?: string;
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 select-none";
  const sizes = {
    sm: "h-8 px-3 text-xs",
    md: "h-10 px-4 text-[13px]",
    lg: "h-12 px-6 text-sm",
    icon: "h-9 w-9 text-sm",
  } as const;
  const variants: Record<BtnVariant, string> = {
    primary:
      "bg-gradient-to-br from-brand-500 to-violet-600 text-white shadow-lg shadow-brand-600/25 hover:shadow-brand-600/40 hover:brightness-110",
    soft:
      "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-white/[0.06] dark:text-slate-200 dark:hover:bg-white/[0.11]",
    ghost:
      "text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-white/[0.07] dark:hover:text-white",
    outline:
      "border border-slate-200 text-slate-700 hover:border-brand-400 hover:text-brand-600 dark:border-white/10 dark:text-slate-200 dark:hover:border-brand-400/60",
    danger: "bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 dark:text-rose-400",
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} title={title} className={cn(base, sizes[size], variants[variant], className)}>
      {children}
    </button>
  );
}

/* ---------------- Badge ---------------- */
export function Badge({ children, className, tone = "slate" }: { children: ReactNode; className?: string; tone?: string }) {
  const tones: Record<string, string> = {
    slate: "bg-slate-100 text-slate-600 dark:bg-white/[0.07] dark:text-slate-300",
    brand: "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300",
    rose: "bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300",
    amber: "bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300",
    emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300",
    sky: "bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300",
    violet: "bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300",
  };
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap", tones[tone] ?? tones.slate, className)}>
      {children}
    </span>
  );
}

export const priorityTone: Record<Priority, string> = {
  urgent: "rose",
  high: "amber",
  medium: "sky",
  low: "slate",
};

export const priorityDot: Record<Priority, string> = {
  urgent: "bg-rose-500",
  high: "bg-amber-500",
  medium: "bg-sky-500",
  low: "bg-slate-400",
};

/* ---------------- Avatar ---------------- */
export function Avatar({
  initials,
  color,
  size = 36,
  ring = false,
  className,
}: {
  initials: string;
  color: string;
  size?: number;
  ring?: boolean;
  className?: string;
}) {
  return (
    <div
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-bold text-white shadow-sm",
        color,
        ring && "ring-2 ring-white dark:ring-ink-900",
        className,
      )}
    >
      {initials}
    </div>
  );
}

/* ---------------- Modal ---------------- */
export function Modal({
  open,
  onClose,
  title,
  children,
  width = "max-w-lg",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: string;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm dark:bg-black/70" onClick={onClose} />
          <motion.div
            initial={{ y: 32, scale: 0.97, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 20, scale: 0.98, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className={cn(
              "relative w-full rounded-t-3xl border border-slate-200 bg-white p-5 shadow-2xl sm:rounded-3xl dark:border-white/10 dark:bg-ink-900",
              width,
            )}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">{title}</h3>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X size={16} />
              </Button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ---------------- Inputs ---------------- */
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold text-slate-500 dark:text-slate-400">{label}</span>
      {children}
    </label>
  );
}

export const inputCls =
  "w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-[13px] text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:bg-white focus:ring-4 focus:ring-brand-500/10 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-brand-400/60 dark:focus:bg-white/[0.07]";

/* ---------------- Progress ring ---------------- */
export function ProgressRing({
  value,
  size = 76,
  stroke = 8,
  label,
}: {
  value: number;
  size?: number;
  stroke?: number;
  label?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} className="fill-none stroke-slate-200 dark:stroke-white/10" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          strokeLinecap="round"
          className="fill-none"
          stroke="url(#ringGrad)"
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.1, ease: "easeOut" }}
          strokeDasharray={c}
        />
        <defs>
          <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-base font-extrabold text-slate-800 dark:text-white">{label}</span>
      </div>
    </div>
  );
}

/* ---------------- Empty state ---------------- */
export function Empty({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-white/[0.05] dark:text-slate-500">
        {icon}
      </div>
      <p className="text-[13px] text-slate-500 dark:text-slate-400">{text}</p>
    </div>
  );
}

/* ---------------- Tooltip-ish chip row ---------------- */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-white/[0.06]">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "relative rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors",
            value === o.value ? "text-white" : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white",
          )}
        >
          {value === o.value && (
            <motion.span
              layoutId={`seg-${options.map((x) => x.value).join("")}`}
              className="absolute inset-0 rounded-lg bg-gradient-to-br from-brand-500 to-violet-600 shadow"
              transition={{ type: "spring", stiffness: 420, damping: 34 }}
            />
          )}
          <span className="relative z-10">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

import {
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
  useEffect,
} from "react";
import type { InvoiceStatus } from "../domain/types";
import { XIcon } from "./icons";

// ------------------------------------------------------------------ button

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger" | "quiet";
  size?: "sm" | "md" | "lg";
  full?: boolean;
};

const btnVariant = {
  primary: "bg-brand text-white hover:bg-brand-deep",
  ghost: "border border-line bg-card text-ink hover:border-ink-faint",
  danger: "border border-line bg-card text-clay hover:border-clay",
  quiet: "text-ink-soft hover:text-ink",
};
const btnSize = {
  sm: "h-9 px-3 text-sm rounded-sm",
  md: "h-11 px-4 text-[15px] rounded-md",
  lg: "h-12 px-5 text-base rounded-md",
};

export function Button({
  variant = "ghost",
  size = "md",
  full,
  className = "",
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 font-semibold transition-colors active:scale-[0.99] disabled:opacity-40 disabled:pointer-events-none ${btnVariant[variant]} ${btnSize[size]} ${full ? "w-full" : ""} ${className}`}
      {...rest}
    />
  );
}

// ------------------------------------------------------------------ fields

const fieldCls =
  "h-11 w-full rounded-md border border-line bg-card px-3 text-[16px] text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className = "", ...rest } = props;
  return <input className={`${fieldCls} ${className}`} {...rest} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  const { className = "", ...rest } = props;
  return <select className={`${fieldCls} appearance-none ${className}`} {...rest} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className = "", ...rest } = props;
  return (
    <textarea
      className={`w-full rounded-md border border-line bg-card px-3 py-2.5 text-[16px] text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none ${className}`}
      rows={2}
      {...rest}
    />
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="small-caps-label">{label}</span>
      <div className="mt-1.5">{children}</div>
      {hint ? <p className="mt-1 text-[13px] text-ink-faint">{hint}</p> : null}
    </label>
  );
}

// ------------------------------------------------------------------- sheet

/**
 * Bottom sheet on phones, centered panel on desktop. Used only for quick
 * side-tasks (record a payment, add a customer) — primary flows get pages.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        aria-label="Close"
        className="anim-fade absolute inset-0 bg-ink/35"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="anim-rise relative w-full max-w-md rounded-t-lg bg-paper p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-lg sm:pb-5"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-sm p-1.5 text-ink-faint hover:text-ink"
          >
            <XIcon width={20} height={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------- chips

const chipStyle: Record<InvoiceStatus, { label: string; glyph: string; cls: string }> = {
  paid: { label: "Paid", glyph: "●", cls: "bg-brand-tint text-brand-deep" },
  partial: { label: "Part-paid", glyph: "◐", cls: "bg-amber-tint text-amber" },
  unpaid: { label: "Unpaid", glyph: "○", cls: "border border-line bg-card text-ink-soft" },
  void: { label: "Void", glyph: "✕", cls: "bg-clay-tint text-clay" },
};

export function StatusChip({ status }: { status: InvoiceStatus }) {
  const s = chipStyle[status];
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${s.cls}`}
    >
      <span aria-hidden="true" className="text-[9px]">{s.glyph}</span>
      {s.label}
    </span>
  );
}

// ------------------------------------------------------------------- misc

/** Money always wears the receipt face. */
export function Amount({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span className={`money ${className}`}>{children}</span>;
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <h2 className="small-caps-label mb-2">{children}</h2>;
}

export function Empty({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="border-t border-line py-10">
      <p className="font-display text-lg font-bold">{title}</p>
      <p className="mt-1 max-w-[42ch] text-[15px] leading-relaxed text-ink-soft">{body}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function PageTitle({ children, sub }: { children: ReactNode; sub?: string }) {
  return (
    <header className="mb-5">
      <h1 className="font-display text-[26px] font-bold leading-tight">{children}</h1>
      {sub ? <p className="mt-0.5 text-[14px] text-ink-soft">{sub}</p> : null}
    </header>
  );
}

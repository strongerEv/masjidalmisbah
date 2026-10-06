"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Camera, Check, ImageIcon, X } from "lucide-react";
import { parseNominal, ribuan } from "@/lib/format";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

type Variant = "primary" | "secondary" | "ghost" | "danger" | "dark";
const variants: Record<Variant, string> = {
  primary: "bg-brand text-white hover:bg-brand-600 shadow-sm",
  dark: "bg-ink text-white hover:bg-ink-2 shadow-sm",
  secondary: "bg-surface text-ink border border-line-2 hover:bg-canvas",
  ghost: "text-ink-2 hover:bg-black/[0.04]",
  danger: "bg-surface text-keluar border border-keluar/30 hover:bg-keluar-soft",
};

interface BtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "md" | "lg" | "sm";
  href?: string;
}

export function Button({ variant = "primary", size = "md", className, href, children, ...rest }: BtnProps) {
  const cls = cx(
    "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition disabled:opacity-50 disabled:pointer-events-none select-none",
    size === "lg" && "h-14 px-6 text-[1.05rem]",
    size === "md" && "h-12 px-5",
    size === "sm" && "h-9 px-3 text-sm rounded-lg",
    variants[variant],
    className,
  );
  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button className={cls} {...rest}>
      {children}
    </button>
  );
}

export function Card({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cx("rounded-2xl border border-line bg-surface", className)} {...rest}>
      {children}
    </div>
  );
}

export function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <h2 className="text-[0.8rem] font-semibold uppercase tracking-[0.08em] text-muted">{children}</h2>
      {action}
    </div>
  );
}

export function PageHeader({ title, subtitle, action, back }: { title: string; subtitle?: React.ReactNode; action?: React.ReactNode; back?: string }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {back && (
          <Link href={back} className="mb-2 inline-flex text-sm font-medium text-muted hover:text-ink">
            ← Kembali
          </Link>
        )}
        <h1 className="text-[1.65rem] font-bold leading-tight tracking-tight">{title}</h1>
        {subtitle && <div className="mt-1 text-muted">{subtitle}</div>}
      </div>
      {action && <div className="flex flex-wrap gap-2">{action}</div>}
    </div>
  );
}

type Tone = "neutral" | "green" | "red" | "amber" | "blue" | "gold";
const tones: Record<Tone, string> = {
  neutral: "bg-black/[0.05] text-ink-2",
  green: "bg-brand-soft text-brand",
  red: "bg-keluar-soft text-keluar",
  amber: "bg-warn-soft text-warn",
  blue: "bg-info-soft text-info",
  gold: "bg-gold-soft text-gold",
};

export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: React.ReactNode; className?: string }) {
  return <span className={cx("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[0.78rem] font-semibold", tones[tone], className)}>{children}</span>;
}

export function Field({ label, hint, error, children, className }: { label: string; hint?: React.ReactNode; error?: string | null; children: React.ReactNode; className?: string }) {
  return (
    <label className={cx("block", className)}>
      <span className="mb-1.5 block font-semibold text-ink-2">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-sm text-muted">{hint}</span>}
      {error && <span className="mt-1 block text-sm font-medium text-keluar">{error}</span>}
    </label>
  );
}

export const inputCls =
  "w-full h-12 rounded-xl border border-line-2 bg-surface px-4 text-ink placeholder:text-muted/70 outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/10";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(inputCls, props.className)} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={3} {...props} className={cx(inputCls, "h-auto py-3", props.className)} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cx(inputCls, "appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%236e7571%22 stroke-width=%222.5%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-[right_1rem_center] bg-no-repeat pr-10", props.className)} />;
}

/** Input nominal dengan pemisah ribuan otomatis. */
export function NominalInput({ value, onChange, autoFocus, placeholder = "0" }: { value: number; onChange: (n: number) => void; autoFocus?: boolean; placeholder?: string }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-semibold text-muted">Rp</span>
      <input
        inputMode="numeric"
        autoFocus={autoFocus}
        className={cx(inputCls, "num h-14 pl-12 text-xl font-bold")}
        value={value ? ribuan(value) : ""}
        placeholder={placeholder}
        onChange={(e) => onChange(parseNominal(e.target.value))}
      />
    </div>
  );
}

export function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="flex w-full items-start gap-3 text-left">
      <span className={cx("mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition", checked ? "border-brand bg-brand text-white" : "border-line-2 bg-surface")}>
        {checked && <Check size={16} strokeWidth={3} />}
      </span>
      <span>
        <span className="block font-semibold text-ink-2">{label}</span>
        {hint && <span className="block text-sm text-muted">{hint}</span>}
      </span>
    </button>
  );
}

export function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: React.ReactNode }[] }) {
  return (
    <div className="inline-flex w-full rounded-xl bg-black/[0.05] p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cx("h-10 flex-1 rounded-lg px-3 text-[0.95rem] font-semibold transition", value === o.value ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Empty({ icon, title, children }: { icon?: React.ReactNode; title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      {icon && <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-black/[0.04] text-muted">{icon}</div>}
      <div className="font-semibold">{title}</div>
      {children && <div className="mt-1 max-w-sm text-muted">{children}</div>}
    </div>
  );
}

export function Modal({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; footer?: React.ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <div className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]" onClick={onClose} />
      <div role="dialog" aria-modal className="relative flex max-h-[92dvh] w-full flex-col rounded-t-3xl bg-surface shadow-2xl sm:max-w-lg sm:rounded-3xl">
        <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
          <h3 className="text-lg font-bold">{title}</h3>
          <button onClick={onClose} className="-mr-2 flex h-10 w-10 items-center justify-center rounded-full text-muted hover:bg-black/[0.05]" aria-label="Tutup">
            <X size={20} />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-5">{children}</div>
        {footer && <div className="flex gap-3 border-t border-line px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">{footer}</div>}
      </div>
    </div>
  );
}

/** Kompres foto (nota/bukti) agar ringan disimpan. */
export async function kompresGambar(file: File, maxSisi = 1000, kualitas = 0.72): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const skala = Math.min(1, maxSisi / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * skala);
    c.height = Math.round(img.height * skala);
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", kualitas);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function FotoInput({ value, onChange, label = "Ambil / pilih foto" }: { value: string | null; onChange: (v: string | null) => void; label?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  return (
    <div>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          setLoading(true);
          try {
            onChange(await kompresGambar(f));
          } finally {
            setLoading(false);
            e.target.value = "";
          }
        }}
      />
      {value ? (
        <div className="relative overflow-hidden rounded-xl border border-line-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="Foto bukti" className="max-h-64 w-full bg-canvas object-contain" />
          <div className="absolute right-2 top-2 flex gap-2">
            <Button type="button" size="sm" variant="secondary" onClick={() => ref.current?.click()}>
              Ganti
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={() => onChange(null)}>
              Hapus
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => ref.current?.click()}
          className="flex h-28 w-full flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-line-2 bg-canvas text-muted transition hover:border-brand/40 hover:text-ink"
        >
          {loading ? <ImageIcon className="animate-pulse" /> : <Camera />}
          <span className="font-semibold">{loading ? "Memproses foto…" : label}</span>
        </button>
      )}
    </div>
  );
}

/* ---------- Toast ---------- */
const ToastCtx = createContext<(msg: string, tone?: "ok" | "err") => void>(() => {});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<{ id: number; msg: string; tone: "ok" | "err" }[]>([]);
  const push = useCallback((msg: string, tone: "ok" | "err" = "ok") => {
    const id = Date.now() + Math.random();
    setItems((x) => [...x, { id, msg, tone }]);
    setTimeout(() => setItems((x) => x.filter((i) => i.id !== id)), 3500);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-8">
        {items.map((t) => (
          <div key={t.id} className={cx("pointer-events-auto flex max-w-md items-center gap-2 rounded-xl px-4 py-3 font-medium text-white shadow-lg", t.tone === "ok" ? "bg-ink" : "bg-keluar")}>
            {t.tone === "ok" ? <Check size={18} /> : <X size={18} />}
            {t.msg}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  return useContext(ToastCtx);
}

export function Stat({ label, value, sub, tone }: { label: string; value: React.ReactNode; sub?: React.ReactNode; tone?: "masuk" | "keluar" }) {
  return (
    <div>
      <div className="text-sm font-medium text-muted">{label}</div>
      <div className={cx("num mt-0.5 text-xl font-bold tracking-tight", tone === "masuk" && "text-masuk", tone === "keluar" && "text-keluar")}>{value}</div>
      {sub && <div className="text-sm text-muted">{sub}</div>}
    </div>
  );
}

export function Spinner() {
  return <div className="h-6 w-6 animate-spin rounded-full border-2 border-line-2 border-t-brand" />;
}

"use client";

import { useRef, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { errorText, previewUrl, uploadImage } from "@/lib/api";

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger"; size?: "sm" | "md" }) {
  return (
    <button
      type="button"
      {...props}
      className={cx(
        "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
        size === "sm" ? "px-2.5 py-1.5 text-sm" : "px-4 py-2 text-sm",
        variant === "primary" && "bg-[#ff5e00] text-white hover:bg-[#e65400]",
        variant === "secondary" && "border border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-50",
        variant === "ghost" && "text-neutral-600 hover:bg-neutral-100",
        variant === "danger" && "text-red-600 hover:bg-red-50",
        className,
      )}
    />
  );
}

export const inputClass =
  "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-[#ff5e00] focus:ring-2 focus:ring-[#ff5e00]/20";

export function Field({ label, hint, children, className }: { label?: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={cx("block space-y-1", className)}>
      {label && <span className="block text-sm font-medium text-neutral-700">{label}</span>}
      {children}
      {hint && <span className="block text-xs text-neutral-500">{hint}</span>}
    </label>
  );
}

export function Text({
  label,
  hint,
  value,
  onChange,
  placeholder,
  multiline,
  rows = 3,
  className,
  type = "text",
}: {
  label?: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
  className?: string;
  type?: string;
}) {
  return (
    <Field label={label} hint={hint} className={className}>
      {multiline ? (
        <textarea rows={rows} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={inputClass} />
      ) : (
        <input type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={inputClass} />
      )}
    </Field>
  );
}

export function NumberInput({ label, hint, value, onChange, className }: { label?: string; hint?: string; value: number | null; onChange: (v: number | null) => void; className?: string }) {
  return (
    <Field label={label} hint={hint} className={className}>
      <input
        type="number"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        className={inputClass}
      />
    </Field>
  );
}

export function Select<T extends string>({
  label,
  hint,
  value,
  onChange,
  options,
  className,
}: {
  label?: string;
  hint?: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  className?: string;
}) {
  return (
    <Field label={label} hint={hint} className={className}>
      <select value={value} onChange={(e) => onChange(e.target.value as T)} className={inputClass}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-neutral-200 bg-white p-3">
      <div>
        <p className="text-sm font-medium text-neutral-800">{label}</p>
        {hint && <p className="text-xs text-neutral-500">{hint}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cx("relative h-6 w-11 shrink-0 rounded-full transition", checked ? "bg-[#ff5e00]" : "bg-neutral-300")}
      >
        <span className={cx("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition", checked ? "left-[22px]" : "left-0.5")} />
      </button>
    </div>
  );
}

export function Card({ title, description, actions, children, className }: { title?: string; description?: string; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cx("rounded-xl border border-neutral-200 bg-white p-5 shadow-sm", className)}>
      {(title || actions) && (
        <header className="mb-4 flex items-start justify-between gap-3">
          <div>
            {title && <h2 className="text-base font-semibold text-neutral-900">{title}</h2>}
            {description && <p className="mt-0.5 text-sm text-neutral-500">{description}</p>}
          </div>
          {actions}
        </header>
      )}
      <div className="space-y-4">{children}</div>
    </section>
  );
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "brand" | "green" | "amber" | "red" | "blue" }) {
  const tones = {
    neutral: "bg-neutral-100 text-neutral-700",
    brand: "bg-orange-100 text-orange-800",
    green: "bg-green-100 text-green-800",
    amber: "bg-amber-100 text-amber-800",
    red: "bg-red-100 text-red-700",
    blue: "bg-blue-100 text-blue-800",
  };
  return <span className={cx("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", tones[tone])}>{children}</span>;
}

const move = <T,>(arr: T[], i: number, d: -1 | 1): T[] => {
  const next = [...arr];
  const [x] = next.splice(i, 1);
  next.splice(i + d, 0, x!);
  return next;
};

function RowControls({ i, n, onMove, onRemove }: { i: number; n: number; onMove: (d: -1 | 1) => void; onRemove: () => void }) {
  return (
    <div className="flex shrink-0 items-center">
      <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => onMove(-1)} className="rounded px-1.5 py-1 text-neutral-500 hover:bg-neutral-100 disabled:opacity-30">↑</button>
      <button type="button" aria-label="Move down" disabled={i === n - 1} onClick={() => onMove(1)} className="rounded px-1.5 py-1 text-neutral-500 hover:bg-neutral-100 disabled:opacity-30">↓</button>
      <button type="button" aria-label="Remove" onClick={onRemove} className="rounded px-1.5 py-1 text-red-500 hover:bg-red-50">✕</button>
    </div>
  );
}

/** Editable list of short strings, with add, remove and reorder. */
export function StringList({ label, hint, items, onChange, addLabel = "Add", placeholder }: { label?: string; hint?: string; items: string[]; onChange: (v: string[]) => void; addLabel?: string; placeholder?: string }) {
  return (
    <div className="space-y-2">
      {label && <p className="text-sm font-medium text-neutral-700">{label}</p>}
      {hint && <p className="-mt-1 text-xs text-neutral-500">{hint}</p>}
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-1">
          <input value={item} placeholder={placeholder} onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)))} className={inputClass} />
          <RowControls i={i} n={items.length} onMove={(d) => onChange(move(items, i, d))} onRemove={() => onChange(items.filter((_, j) => j !== i))} />
        </div>
      ))}
      <Button variant="secondary" size="sm" onClick={() => onChange([...items, ""])}>+ {addLabel}</Button>
    </div>
  );
}

/** Editable list of objects with a fixed set of text fields. */
export function ObjectList<T extends Record<string, unknown>>({
  label,
  hint,
  items,
  onChange,
  fields,
  blank,
  addLabel = "Add",
}: {
  label?: string;
  hint?: string;
  items: T[];
  onChange: (v: T[]) => void;
  fields: { key: keyof T & string; label: string; multiline?: boolean; number?: boolean; width?: string }[];
  blank: T;
  addLabel?: string;
}) {
  return (
    <div className="space-y-2">
      {label && <p className="text-sm font-medium text-neutral-700">{label}</p>}
      {hint && <p className="-mt-1 text-xs text-neutral-500">{hint}</p>}
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-2 rounded-lg border border-neutral-200 bg-neutral-50 p-2">
          <div className="grid flex-1 gap-2 sm:grid-cols-[repeat(auto-fit,minmax(140px,1fr))]">
            {fields.map((f) =>
              f.number ? (
                <NumberInput key={f.key} label={i === 0 ? f.label : undefined} value={(item[f.key] as number | null) ?? null} onChange={(v) => onChange(items.map((x, j) => (j === i ? { ...x, [f.key]: v ?? 0 } : x)))} className={f.width} />
              ) : (
                <Text key={f.key} label={i === 0 ? f.label : undefined} multiline={f.multiline} rows={2} value={String(item[f.key] ?? "")} onChange={(v) => onChange(items.map((x, j) => (j === i ? { ...x, [f.key]: v } : x)))} className={f.width} />
              ),
            )}
          </div>
          <div className={i === 0 ? "pt-6" : ""}>
            <RowControls i={i} n={items.length} onMove={(d) => onChange(move(items, i, d))} onRemove={() => onChange(items.filter((_, j) => j !== i))} />
          </div>
        </div>
      ))}
      <Button variant="secondary" size="sm" onClick={() => onChange([...items, { ...blank }])}>+ {addLabel}</Button>
    </div>
  );
}

/** Upload an image (or paste a URL) with a preview. */
export function ImageInput({ label, hint, value, onChange }: { label: string; hint?: string; value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium text-neutral-700">{label}</p>
      <div className="flex items-start gap-3">
        <div className="flex h-24 w-36 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {value ? <img src={previewUrl(value)} alt="" className="h-full w-full object-cover" /> : <span className="text-xs text-neutral-400">No image</span>}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <input value={value} placeholder="Upload, or paste an image URL" onChange={(e) => onChange(e.target.value)} className={inputClass} />
          <div className="flex gap-2">
            <input
              ref={ref}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                setBusy(true);
                setError("");
                try {
                  onChange(await uploadImage(file));
                } catch (err) {
                  setError(errorText(err));
                } finally {
                  setBusy(false);
                }
              }}
            />
            <Button variant="secondary" size="sm" disabled={busy} onClick={() => ref.current?.click()}>
              {busy ? "Uploading…" : "Upload image"}
            </Button>
            {value && <Button variant="ghost" size="sm" onClick={() => onChange("")}>Remove</Button>}
          </div>
          {hint && <p className="text-xs text-neutral-500">{hint}</p>}
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      </div>
    </div>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "error" | "success"; children: ReactNode }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cx(
        "rounded-lg px-3 py-2 text-sm",
        tone === "info" && "bg-blue-50 text-blue-800",
        tone === "error" && "bg-red-50 text-red-700",
        tone === "success" && "bg-green-50 text-green-800",
      )}
    >
      {children}
    </div>
  );
}

export function Spinner({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-neutral-500">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-300 border-t-[#ff5e00]" />
      {label}
    </div>
  );
}

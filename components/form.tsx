"use client";

import { ReactNode } from "react";

export function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-muted">
        {label} {required && <span className="text-accent">*</span>}
      </span>
      {children}
    </label>
  );
}

const inputCls =
  "w-full rounded-xl border border-border bg-elevated px-4 py-3 text-[15px] text-text placeholder:text-muted outline-none transition focus:border-accent focus:ring-2 focus:ring-[var(--focus-ring)]";

const selectCls =
  inputCls +
  " appearance-none bg-no-repeat pr-10 [background-position:right_0.9rem_center] [background-size:1.1rem]";

const chevron =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%238A9DB2' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")";

export function TextInput(props: { value: string; onChange: (v: string) => void; type?: string; placeholder?: string; inputMode?: "text" | "numeric" | "email" | "tel" }) {
  return (
    <input
      type={props.type ?? "text"}
      value={props.value}
      placeholder={props.placeholder}
      inputMode={props.inputMode}
      onChange={(e) => props.onChange(e.target.value)}
      className={inputCls}
    />
  );
}

export function TextArea(props: { value: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <textarea
      rows={props.rows ?? 3}
      value={props.value}
      onChange={(e) => props.onChange(e.target.value)}
      className={inputCls + " resize-y leading-relaxed"}
    />
  );
}

export function NumberInput(props: { value: number | ""; onChange: (v: number | "") => void; min?: number }) {
  return (
    <input
      type="number"
      min={props.min ?? 0}
      value={props.value}
      onChange={(e) => props.onChange(e.target.value === "" ? "" : Number(e.target.value))}
      className={inputCls}
    />
  );
}

export function Select(props: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <select
      value={props.value}
      onChange={(e) => props.onChange(e.target.value)}
      className={selectCls}
      style={{ backgroundImage: chevron }}
    >
      {props.options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function Checkbox(props: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 select-none">
      <input
        type="checkbox"
        checked={props.checked}
        onChange={(e) => props.onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span
        className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-[7px] border transition peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--focus-ring)] ${
          props.checked ? "border-accent bg-gradient-to-br from-accent to-accent-bright" : "border-border bg-elevated"
        }`}
        aria-hidden
      >
        {props.checked && (
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-accent-ink" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </span>
      <span className="text-sm leading-snug text-text">{props.label}</span>
    </label>
  );
}

export function PrimaryButton(props: { onClick?: () => void; disabled?: boolean; children: ReactNode; type?: "button" | "submit" }) {
  return (
    <button
      type={props.type ?? "button"}
      onClick={props.onClick}
      disabled={props.disabled}
      className="w-full rounded-xl bg-gradient-to-br from-accent to-accent-bright px-4 py-3.5 text-[15px] font-semibold text-accent-ink shadow-glow transition hover:brightness-105 active:scale-[0.99] disabled:opacity-50 disabled:shadow-none"
    >
      {props.children}
    </button>
  );
}

export const EVENT_TYPE_OPTIONS = [
  { value: "arshatid", label: "Árshátíð" },
  { value: "golfmot", label: "Golfmót" },
  { value: "vorukynning", label: "Vörukynning" },
  { value: "fraedslufundur", label: "Fræðslufundur" },
  { value: "opid_hus", label: "Opið hús" },
  { value: "vidskiptavinavidburdur", label: "Viðskiptavinaviðburður" },
  { value: "starfsmannavidburdur", label: "Starfsmannaviðburður" },
  { value: "sersnidinn", label: "Sérsniðinn viðburður" },
];

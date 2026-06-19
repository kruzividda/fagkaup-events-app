"use client";

import { ReactNode } from "react";

export function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted">
        {label} {required && <span className="text-accent">*</span>}
      </span>
      {children}
    </label>
  );
}

const inputCls =
  "w-full rounded-lg border border-border bg-elevated px-3 py-2.5 text-sm text-text outline-none transition focus:border-accent";

export function TextInput(props: {
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <input
      type={props.type ?? "text"}
      value={props.value}
      placeholder={props.placeholder}
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
      className={inputCls}
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

export function Select(props: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select value={props.value} onChange={(e) => props.onChange(e.target.value)} className={inputCls}>
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
    <label className="flex cursor-pointer items-start gap-2.5">
      <input
        type="checkbox"
        checked={props.checked}
        onChange={(e) => props.onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 accent-[var(--accent)]"
      />
      <span className="text-sm text-text">{props.label}</span>
    </label>
  );
}

export function PrimaryButton(props: { onClick?: () => void; disabled?: boolean; children: ReactNode; type?: "button" | "submit" }) {
  return (
    <button
      type={props.type ?? "button"}
      onClick={props.onClick}
      disabled={props.disabled}
      className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-[#0B121C] transition hover:brightness-110 disabled:opacity-50"
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

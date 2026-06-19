import { ReactNode } from "react";

export function Card({
  children,
  className = "",
  accent = false,
}: {
  children: ReactNode;
  className?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-border bg-surface p-6 shadow-card ${className}`}
    >
      {accent && (
        <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent to-transparent opacity-60" />
      )}
      {children}
    </div>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-accent">
      <span className="inline-block h-px w-5 bg-[rgba(200,164,92,0.7)]" aria-hidden />
      {children}
    </p>
  );
}

export function PageTitle({ children }: { children: ReactNode }) {
  return <h1 className="font-display text-[28px] font-semibold leading-tight text-text">{children}</h1>;
}

export function Stub({ title, note }: { title: string; note?: string }) {
  return (
    <Card accent>
      <Eyebrow>Í vinnslu</Eyebrow>
      <h2 className="font-display text-xl text-text">{title}</h2>
      {note && <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted">{note}</p>}
    </Card>
  );
}

export function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-surface p-5 shadow-card">
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="mt-2 font-display text-[30px] leading-none text-accent">{value}</p>
      {sub && <p className="mt-1.5 text-[12px] text-muted">{sub}</p>}
    </div>
  );
}

export function BarRow({
  label,
  value,
  total,
  caption,
}: {
  label: string;
  value: number;
  total: number;
  caption?: string;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm">
        <span className="text-text">{label}</span>
        <span className="text-muted">{caption ?? `${value} / ${total}`}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-elevated">
        <div
          className="h-full rounded-full bg-gradient-to-r from-accent to-accent-bright transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

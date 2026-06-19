import { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-border bg-surface p-5 ${className}`}>
      {children}
    </div>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-accent">
      {children}
    </p>
  );
}

export function PageTitle({ children }: { children: ReactNode }) {
  return (
    <h1 className="font-display text-2xl font-semibold text-text">{children}</h1>
  );
}

export function Stub({ title, note }: { title: string; note?: string }) {
  return (
    <Card>
      <Eyebrow>Í vinnslu</Eyebrow>
      <h2 className="font-display text-xl text-text">{title}</h2>
      {note && <p className="mt-2 max-w-prose text-sm text-muted">{note}</p>}
    </Card>
  );
}

export function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 font-display text-2xl text-text">{value}</p>
      {sub && <p className="text-[11px] text-muted">{sub}</p>}
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
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-text">{label}</span>
        <span className="text-muted">{caption ?? `${value} / ${total}`}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-elevated">
        <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

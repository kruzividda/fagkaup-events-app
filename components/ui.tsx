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

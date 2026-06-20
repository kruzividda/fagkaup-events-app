"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export function MobileNav({ items }: { items: { href: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false); // loka við leiðsögn
  }, [pathname]);

  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Valmynd"
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-text"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          {open ? (
            <>
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </>
          ) : (
            <>
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </>
          )}
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 top-16 z-30 bg-black/50" onClick={() => setOpen(false)} />
          <nav className="fixed inset-x-0 top-16 z-40 border-b border-border bg-surface p-3 shadow-card">
            {items.map((it) => {
              const active = it.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(it.href);
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  className={`block rounded-lg px-3 py-3 text-sm transition ${
                    active ? "bg-elevated text-text" : "text-muted hover:bg-elevated hover:text-text"
                  }`}
                >
                  {it.label}
                </Link>
              );
            })}
          </nav>
        </>
      )}
    </div>
  );
}

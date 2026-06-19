"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLinks({ items }: { items: { href: string; label: string }[] }) {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 px-3 pb-3 md:flex-col md:gap-0.5">
      {items.map((item) => {
        const active =
          item.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`relative rounded-lg px-3 py-2 text-sm transition ${
              active ? "bg-elevated text-text" : "text-muted hover:bg-elevated hover:text-text"
            }`}
          >
            {active && (
              <span className="absolute left-0 top-1/2 hidden h-4 w-0.5 -translate-y-1/2 rounded-full bg-accent md:block" />
            )}
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

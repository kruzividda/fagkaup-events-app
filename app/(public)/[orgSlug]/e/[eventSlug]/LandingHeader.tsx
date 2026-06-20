"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function LandingHeader({
  eventName,
  isOpen,
  skraHref,
}: {
  eventName: string;
  isOpen: boolean;
  skraHref: string;
}) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 160);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={`sticky top-0 z-30 transition-colors duration-200 ${
        scrolled ? "border-b border-border bg-[var(--bar-bg)] backdrop-blur-xl" : "border-b border-transparent"
      }`}
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-5">
        <span
          className={`truncate font-display text-[15px] font-semibold text-text transition-opacity duration-200 ${
            scrolled ? "opacity-100" : "opacity-0"
          }`}
        >
          {eventName}
        </span>
        {isOpen && (
          <Link
            href={skraHref}
            className={`hidden shrink-0 rounded-full bg-gradient-to-br from-accent to-accent-bright px-4 py-2 text-[13px] font-semibold text-accent-ink shadow-glow transition-opacity duration-200 sm:inline-block ${
              scrolled ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          >
            Skrá mig
          </Link>
        )}
      </div>
    </div>
  );
}

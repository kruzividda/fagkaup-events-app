"use client";

import { useRouter } from "next/navigation";

export function DashboardThemeToggle({ current }: { current: string }) {
  const router = useRouter();

  function setTheme(theme: string) {
    document.cookie = `dashboard-theme=${theme}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }

  const isLight = current === "fagkaup";

  return (
    <button
      onClick={() => setTheme(isLight ? "glamour" : "fagkaup")}
      title={isLight ? "Skipta í dökkt þema" : "Skipta í ljóst þema"}
      aria-label="Skipta um þema"
      className="flex h-9 items-center gap-2 rounded-lg border border-border px-3 text-sm text-muted transition hover:text-text"
    >
      {isLight ? (
        // tungl — fer í dökkt
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      ) : (
        // sól — fer í ljóst
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      )}
      <span className="hidden sm:inline">{isLight ? "Dökkt" : "Ljóst"}</span>
    </button>
  );
}

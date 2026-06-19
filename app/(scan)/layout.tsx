import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth";

export default async function ScanLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile();
  if (!profile) redirect("/login");

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b border-border px-5 py-3">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Fagkaup</span>
        <div className="flex items-center gap-3">
          <span className="text-[11px] uppercase tracking-wide text-muted">{profile.role}</span>
          <form action="/auth/signout" method="post">
            <button className="text-xs text-muted transition hover:text-text">Útskrá</button>
          </form>
        </div>
      </header>
      {children}
    </div>
  );
}

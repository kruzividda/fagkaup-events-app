import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth";
import { InstallPrompt } from "./InstallPrompt";

export default async function ScanLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile();
  if (!profile) redirect("/login");

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b border-border px-5 py-3">
        <img src="/fagkaup-logo-white.png" alt="Fagkaup" className="h-4 w-auto" />
        <div className="flex items-center gap-3">
          <span className="text-[11px] uppercase tracking-wide text-muted">{profile.role}</span>
          <form action="/auth/signout" method="post">
            <button className="text-xs text-muted transition hover:text-text">Útskrá</button>
          </form>
        </div>
      </header>
      <InstallPrompt />
      {children}
    </div>
  );
}

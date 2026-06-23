import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getProfile } from "@/lib/auth";
import { NavLinks } from "@/components/NavLinks";
import { MobileNav } from "@/components/MobileNav";
import { DashboardThemeToggle } from "@/components/DashboardThemeToggle";

const NAV = [
  { href: "/dashboard/events", label: "Viðburðir" },
  { href: "/dashboard/users", label: "Notendur" },
  { href: "/dashboard/personuvernd", label: "Persónuvernd" },
  { href: "/dashboard/units", label: "Rekstrareiningar" },
  { href: "/door", label: "Innritun (dyr)" },
  { href: "/bar", label: "Bar" },
];

function Brand({ theme }: { theme: string }) {
  const src = theme === "fagkaup" ? "/fagkaup-logo.png" : "/fagkaup-logo-white.png";
  return (
    <div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="Fagkaup" className="h-6 w-auto" />
      <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-accent">Events</p>
    </div>
  );
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile();
  if (!profile) redirect("/login");

  // Þema stjórnborðs úr vafraköku — ljóst (fagkaup) er sjálfgefið
  const theme = cookies().get("dashboard-theme")?.value === "glamour" ? "glamour" : "fagkaup";

  // Notendastjórnun aðeins fyrir owner/admin
  const accountAdmin = profile.role === "owner" || profile.role === "admin";
  const nav = NAV.filter((n) => n.href !== "/dashboard/users" || accountAdmin);

  return (
    <div data-theme={theme} className={`min-h-[100dvh] ${theme === "fagkaup" ? "bg-bg text-text" : ""}`}>
      {/* Föst hliðarstika (tölvuskjár) */}
      <aside className="hidden md:fixed md:inset-y-0 md:left-0 md:z-20 md:flex md:w-60 md:flex-col md:border-r md:border-border md:bg-surface">
        <div className="p-5">
          <Brand theme={theme} />
        </div>
        <div className="flex-1 overflow-y-auto">
          <NavLinks items={nav} />
        </div>
      </aside>

      {/* Aðalsvæði */}
      <div className="md:pl-60">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-[var(--bar-bg)] px-4 backdrop-blur md:px-6">
          <div className="flex items-center gap-3">
            <MobileNav items={nav} />
            <span className="hidden text-[13px] uppercase tracking-[0.14em] text-muted md:inline">Stjórnborð</span>
            <img src={theme === "fagkaup" ? "/fagkaup-logo.png" : "/fagkaup-logo-white.png"} alt="Fagkaup" className="h-5 w-auto md:hidden" />
          </div>
          <div className="flex items-center gap-3">
            <DashboardThemeToggle current={theme} />
            <span className="hidden text-sm text-text sm:inline">{profile.full_name}</span>
            <span className="rounded-full border border-accent px-2.5 py-0.5 text-[11px] uppercase tracking-wide text-accent">
              {profile.role}
            </span>
            <form action="/auth/signout" method="post">
              <button className="text-sm text-muted transition hover:text-text">Útskrá</button>
            </form>
          </div>
        </header>
        <main className="mx-auto max-w-5xl p-5 sm:p-6">{children}</main>
      </div>
    </div>
  );
}

import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth";
import { NavLinks } from "@/components/NavLinks";

const NAV = [
  { href: "/dashboard", label: "Yfirlit" },
  { href: "/dashboard/events", label: "Viðburðir" },
  { href: "/dashboard/users", label: "Notendur" },
  { href: "/dashboard/units", label: "Rekstrareiningar" },
  { href: "/door", label: "Innritun (dyr)" },
  { href: "/bar", label: "Bar" },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile();
  if (!profile) redirect("/login");

  return (
    <div className="min-h-[100dvh] md:flex">
      {/* Hliðarstika */}
      <aside className="border-b border-border bg-surface md:sticky md:top-0 md:h-[100dvh] md:w-60 md:border-b-0 md:border-r">
        <div className="flex items-center gap-3 p-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[rgba(200,164,92,0.4)] bg-gradient-to-br from-[rgba(200,164,92,0.18)] to-transparent">
            <span className="font-display text-base font-semibold text-accent">F</span>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-accent">Fagkaup</p>
            <p className="-mt-0.5 font-display text-lg text-text">Events</p>
          </div>
        </div>
        <NavLinks items={NAV} />
      </aside>

      {/* Aðalsvæði */}
      <div className="flex-1">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-[rgba(10,17,27,0.8)] px-6 py-4 backdrop-blur">
          <span className="text-[13px] uppercase tracking-[0.14em] text-muted">Stjórnborð</span>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-text sm:inline">{profile.full_name}</span>
            <span className="rounded-full border border-[rgba(200,164,92,0.4)] px-2.5 py-0.5 text-[11px] uppercase tracking-wide text-accent">
              {profile.role}
            </span>
            <form action="/auth/signout" method="post">
              <button className="text-sm text-muted transition hover:text-text">Útskrá</button>
            </form>
          </div>
        </header>
        <main className="mx-auto max-w-5xl p-6">{children}</main>
      </div>
    </div>
  );
}

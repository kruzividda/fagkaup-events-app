import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth";
import { NavLinks } from "@/components/NavLinks";
import { MobileNav } from "@/components/MobileNav";

const NAV = [
  { href: "/dashboard", label: "Yfirlit" },
  { href: "/dashboard/events", label: "Viðburðir" },
  { href: "/dashboard/users", label: "Notendur" },
  { href: "/dashboard/units", label: "Rekstrareiningar" },
  { href: "/door", label: "Innritun (dyr)" },
  { href: "/bar", label: "Bar" },
];

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[rgba(200,164,92,0.4)] bg-gradient-to-br from-[rgba(200,164,92,0.18)] to-transparent">
        <span className="font-display text-base font-semibold text-accent">F</span>
      </div>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-accent">Fagkaup</p>
        <p className="-mt-0.5 font-display text-lg text-text">Events</p>
      </div>
    </div>
  );
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile();
  if (!profile) redirect("/login");

  return (
    <div className="min-h-[100dvh]">
      {/* Föst hliðarstika (tölvuskjár) */}
      <aside className="hidden md:fixed md:inset-y-0 md:left-0 md:z-20 md:flex md:w-60 md:flex-col md:border-r md:border-border md:bg-surface">
        <div className="p-5">
          <Brand />
        </div>
        <div className="flex-1 overflow-y-auto">
          <NavLinks items={NAV} />
        </div>
      </aside>

      {/* Aðalsvæði */}
      <div className="md:pl-60">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-[rgba(10,17,27,0.85)] px-4 backdrop-blur md:px-6">
          <div className="flex items-center gap-3">
            <MobileNav items={NAV} />
            <span className="hidden text-[13px] uppercase tracking-[0.14em] text-muted md:inline">Stjórnborð</span>
            <span className="font-display text-base text-text md:hidden">Events</span>
          </div>
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
        <main className="mx-auto max-w-5xl p-5 sm:p-6">{children}</main>
      </div>
    </div>
  );
}

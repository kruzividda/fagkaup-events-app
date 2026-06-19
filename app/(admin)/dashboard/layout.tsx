import Link from "next/link";
import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth";

const NAV = [
  { href: "/dashboard", label: "Yfirlit" },
  { href: "/dashboard/events", label: "Viðburðir" },
  { href: "/dashboard/users", label: "Notendur" },
  { href: "/door", label: "Innritun (dyr)" },
  { href: "/bar", label: "Bar" },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getProfile();
  if (!profile) redirect("/login");

  return (
    <div className="min-h-screen md:flex">
      {/* Hliðarstika */}
      <aside className="border-b border-border bg-surface md:w-60 md:border-b-0 md:border-r">
        <div className="flex items-center justify-between p-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">
              Fagkaup
            </p>
            <p className="font-display text-lg text-text">Events</p>
          </div>
        </div>
        <nav className="flex gap-1 px-3 pb-3 md:flex-col md:gap-0.5">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-sm text-muted transition hover:bg-elevated hover:text-text"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Aðalsvæði */}
      <div className="flex-1">
        <header className="flex items-center justify-between border-b border-border px-6 py-4">
          <span className="text-sm text-muted">Stjórnborð</span>
          <div className="flex items-center gap-3">
            <span className="text-sm text-text">{profile.full_name}</span>
            <span className="rounded-full border border-border px-2 py-0.5 text-[11px] uppercase tracking-wide text-accent">
              {profile.role}
            </span>
            <form action="/auth/signout" method="post">
              <button className="text-sm text-muted transition hover:text-text">
                Útskrá
              </button>
            </form>
          </div>
        </header>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}

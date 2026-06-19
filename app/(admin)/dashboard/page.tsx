import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, Eyebrow, PageTitle } from "@/components/ui";

export default async function DashboardHome() {
  const profile = await getProfile();
  const supabase = createClient();

  const [events, regs, checkins, drinks] = await Promise.all([
    supabase.from("events").select("id", { count: "exact", head: true }).eq("status", "published"),
    supabase.from("registrations").select("id", { count: "exact", head: true }).eq("status", "registered"),
    supabase.from("check_ins").select("id", { count: "exact", head: true }),
    supabase.from("drink_redemptions").select("id", { count: "exact", head: true }),
  ]);

  const stats = [
    { k: "Birtir viðburðir", v: events.count ?? 0 },
    { k: "Skráningar", v: regs.count ?? 0 },
    { k: "Innritanir", v: checkins.count ?? 0 },
    { k: "Drykkjaafgreiðslur", v: drinks.count ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <Eyebrow>Stjórnborð</Eyebrow>
        <PageTitle>Velkomin{profile ? `, ${profile.full_name}` : ""}</PageTitle>
        <p className="mt-2 text-sm text-muted">Yfirlit yfir alla viðburði.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.k}>
            <p className="text-xs text-muted">{s.k}</p>
            <p className="mt-2 font-display text-2xl text-text">{s.v}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}

import { getProfile } from "@/lib/auth";
import { Card, Eyebrow, PageTitle } from "@/components/ui";

export default async function DashboardHome() {
  const profile = await getProfile();

  return (
    <div className="space-y-6">
      <div>
        <Eyebrow>Stjórnborð</Eyebrow>
        <PageTitle>Velkomin{profile ? `, ${profile.full_name}` : ""}</PageTitle>
        <p className="mt-2 text-sm text-muted">
          Innskráning, auth og hlutverkastýring virka. Næstu skref byggja
          viðburði, skráningar og tölfræði ofan á þennan grunn.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { k: "Virkir viðburðir", v: "—" },
          { k: "Skráningar", v: "—" },
          { k: "Mæting", v: "—" },
          { k: "Drykkir nýttir", v: "—" },
        ].map((s) => (
          <Card key={s.k}>
            <p className="text-xs text-muted">{s.k}</p>
            <p className="mt-2 font-display text-2xl text-text">{s.v}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}

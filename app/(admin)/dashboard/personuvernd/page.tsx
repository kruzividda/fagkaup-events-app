import { redirect } from "next/navigation";
import { Card, Eyebrow, PageTitle } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import { PersonuverndManager } from "./PersonuverndManager";

export const dynamic = "force-dynamic";

const ACTION_LABELS: Record<string, string> = {
  "registration.anonymize": "Nafnleynd skráningar",
  "registration.delete": "Eyðing skráningar",
};

export default async function PersonuverndPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "owner" && profile.role !== "admin" && profile.role !== "staff") redirect("/dashboard");

  const supabase = createClient();
  const { data: logs } = await supabase
    .from("audit_logs")
    .select("id, action, created_at, events(name), profiles(full_name)")
    .order("created_at", { ascending: false })
    .limit(50);

  const auditRows = ((logs ?? []) as any[]).map((l) => ({
    id: l.id as string,
    action: ACTION_LABELS[l.action] ?? (l.action as string),
    when: new Date(l.created_at).toLocaleString("is-IS", {
      dateStyle: "short",
      timeStyle: "short",
      timeZone: "Atlantic/Reykjavik",
    }),
    who: l.profiles?.full_name ?? "—",
    event: l.events?.name ?? "—",
  }));

  return (
    <div className="space-y-6">
      <div>
        <Eyebrow>Persónuvernd</Eyebrow>
        <PageTitle>Persónuvernd (GDPR)</PageTitle>
        <p className="mt-1 text-sm text-muted">
          Meðhöndlaðu beiðnir um eyðingu eða nafnleynd persónuupplýsinga. Allar aðgerðir eru skráðar í audit-log hér að neðan.
        </p>
      </div>

      <Card className="space-y-2">
        <p className="text-sm font-medium text-text">Tvær leiðir til að meðhöndla gögn</p>
        <p className="text-xs text-muted">
          <strong className="text-text">Nafnleynd</strong> fjarlægir persónuupplýsingar (nafn, netfang, síma, kennitölu, fæðuóþol,
          athugasemdir) en heldur tölfræði (mæting, drykkir, fyrirtæki/eining/staðsetning). Hentar þegar þið viljið halda
          tölfræði eftir viðburð án þess að geyma persónugögn.
        </p>
        <p className="text-xs text-muted">
          <strong className="text-text">Eyða</strong> fjarlægir skráninguna að fullu — engin gögn verða eftir. Hentar fyrir beiðni
          einstaklings um að gögnum sé eytt.
        </p>
      </Card>

      <PersonuverndManager />

      <Card className="space-y-3">
        <div>
          <p className="text-sm font-medium text-text">Audit-log</p>
          <p className="mt-0.5 text-xs text-muted">Síðustu 50 persónuverndar-aðgerðir.</p>
        </div>
        {auditRows.length === 0 ? (
          <p className="text-sm text-muted">Engar aðgerðir skráðar enn.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted">
                  <th className="py-2 pr-4 font-medium">Tími</th>
                  <th className="py-2 pr-4 font-medium">Aðgerð</th>
                  <th className="py-2 pr-4 font-medium">Viðburður</th>
                  <th className="py-2 font-medium">Framkvæmt af</th>
                </tr>
              </thead>
              <tbody>
                {auditRows.map((a) => (
                  <tr key={a.id} className="border-b border-border">
                    <td className="py-2 pr-4 text-muted">{a.when}</td>
                    <td className="py-2 pr-4 text-text">{a.action}</td>
                    <td className="py-2 pr-4 text-muted">{a.event}</td>
                    <td className="py-2 text-muted">{a.who}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

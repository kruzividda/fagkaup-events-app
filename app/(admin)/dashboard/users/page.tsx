import { redirect } from "next/navigation";
import { Eyebrow, PageTitle } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import { UsersManager, type OrgUser } from "./UsersManager";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  const accountAdmin = profile.role === "owner" || profile.role === "admin";
  if (!accountAdmin) redirect("/dashboard");

  const supabase = createClient();
  const { data } = await supabase.rpc("list_org_users");
  const res = data as { ok: boolean; users?: OrgUser[] } | null;
  const users = res?.ok ? res.users ?? [] : [];

  return (
    <div className="space-y-6">
      <div>
        <Eyebrow>Notendur</Eyebrow>
        <PageTitle>Starfsfólk</PageTitle>
        <p className="mt-1 text-sm text-muted">
          Bjóddu inn starfsfólki og úthlutaðu hlutverki. <strong>Stjórnandi</strong> hefur fullan aðgang (þ.m.t.
          notendastjórnun); <strong>notandi</strong> getur unnið með viðburði og skráningar en ekki stýrt notendum.
        </p>
      </div>
      <UsersManager initial={users} />
    </div>
  );
}

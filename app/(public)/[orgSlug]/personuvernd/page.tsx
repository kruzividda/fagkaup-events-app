import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function PrivacyPolicyPage({ params }: { params: { orgSlug: string } }) {
  const admin = createAdminClient();
  const { data: org } = await admin
    .from("organizations")
    .select("name, privacy_policy")
    .eq("slug", params.orgSlug)
    .single();

  if (!org) notFound();

  return (
    <main className="fk-rise mx-auto max-w-2xl px-5 py-12 space-y-6">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">Persónuvernd</p>
        <h1 className="mt-1 font-display text-2xl font-semibold text-text">Persónuverndarstefna</h1>
        <p className="mt-1 text-sm text-muted">{org.name}</p>
      </div>

      {org.privacy_policy ? (
        <div className="whitespace-pre-wrap text-[15px] leading-relaxed text-text/90">{org.privacy_policy}</div>
      ) : (
        <p className="text-sm text-muted">
          Persónuverndarstefna hefur ekki verið birt enn. Hafðu samband við viðburðarhaldara fyrir nánari upplýsingar um hvernig
          unnið er með upplýsingar þínar.
        </p>
      )}
    </main>
  );
}

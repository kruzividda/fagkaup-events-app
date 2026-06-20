export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { Eyebrow } from "@/components/ui";
import { MyBookingClient } from "./MyBookingClient";

export default async function MyRegistrationPage({
  params,
}: {
  params: { orgSlug: string; eventSlug: string };
}) {
  const admin = createAdminClient();
  const { data: org } = await admin.from("organizations").select("id").eq("slug", params.orgSlug).single();
  if (!org) notFound();
  const { data: event } = await admin
    .from("events")
    .select("id, name")
    .eq("org_id", org.id)
    .eq("slug", params.eventSlug)
    .single();
  if (!event) notFound();

  return (
    <main className="mx-auto max-w-lg px-5 py-8 sm:py-12">
      <div className="fk-rise space-y-6">
        <header className="space-y-2">
          <Eyebrow>Mín skráning</Eyebrow>
          <h1 className="font-display text-[28px] font-semibold leading-[1.1] text-text">{event.name}</h1>
        </header>

        <MyBookingClient eventId={event.id} eventName={event.name} />

        <p className="text-center">
          <Link href={`/${params.orgSlug}/e/${params.eventSlug}`} className="text-[13px] text-muted underline-offset-4 hover:underline">
            ← Til baka á viðburðinn
          </Link>
        </p>
      </div>
    </main>
  );
}

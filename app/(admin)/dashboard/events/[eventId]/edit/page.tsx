import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Eyebrow, PageTitle } from "@/components/ui";
import { EditEventForm } from "./EditEventForm";

export const dynamic = "force-dynamic";

export default async function EditEventPage({ params }: { params: { eventId: string } }) {
  const supabase = createClient();
  const { data: event } = await supabase
    .from("events")
    .select(
      "name, description, event_type, starts_at, location, max_guests, drinks_enabled, drinks_per_person, spouse_gets_drinks, drinks_per_spouse, drinks_alcoholic, uses_seating, qr_enabled, sender_name, sender_email, theme, registration_opens_at, registration_closes_at, cover_image_path, cover_image_path_mobile"
    )
    .eq("id", params.eventId)
    .single();
  if (!event) notFound();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Eyebrow>Viðburðir</Eyebrow>
        <PageTitle>Breyta viðburði</PageTitle>
      </div>
      <EditEventForm
        eventId={params.eventId}
        initial={event}
        initialCoverPath={event.cover_image_path ?? null}
        initialCoverPathMobile={event.cover_image_path_mobile ?? null}
      />
    </div>
  );
}

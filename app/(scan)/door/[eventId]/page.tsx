import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Eyebrow } from "@/components/ui";
import { ScanScreen } from "../../ScanScreen";

export default async function DoorScan({ params }: { params: { eventId: string } }) {
  const supabase = createClient();
  const { data: event } = await supabase
    .from("events")
    .select("name")
    .eq("id", params.eventId)
    .single();
  if (!event) notFound();

  return (
    <main className="mx-auto max-w-md p-5 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <Eyebrow>Innritun</Eyebrow>
          <h1 className="font-display text-2xl font-semibold text-text">Skanna miða</h1>
        </div>
        <Link href="/door" className="text-xs text-muted hover:text-text">
          ← Til baka
        </Link>
      </div>
      <ScanScreen mode="door" eventId={params.eventId} eventName={event.name} />
    </main>
  );
}

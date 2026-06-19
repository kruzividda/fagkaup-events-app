import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Eyebrow, PageTitle, Card } from "@/components/ui";

export async function EventPicker({ base, eyebrow }: { base: "door" | "bar"; eyebrow: string }) {
  const supabase = createClient();
  const { data: events } = await supabase
    .from("events")
    .select("id, name, starts_at, status")
    .eq("status", "published")
    .order("starts_at", { ascending: true });

  return (
    <main className="mx-auto max-w-md p-5 space-y-5">
      <div>
        <Eyebrow>{eyebrow}</Eyebrow>
        <PageTitle>Veldu viðburð</PageTitle>
      </div>

      {!events || events.length === 0 ? (
        <Card>
          <p className="text-sm text-muted">Engir birtir viðburðir. Admin þarf að birta viðburð fyrst.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {events.map((e) => (
            <Link key={e.id} href={`/${base}/${e.id}`}>
              <Card className="transition hover:border-accent">
                <p className="font-display text-lg text-text">{e.name}</p>
                <p className="text-xs text-muted">
                  {new Date(e.starts_at).toLocaleString("is-IS", { dateStyle: "medium", timeStyle: "short" })}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}

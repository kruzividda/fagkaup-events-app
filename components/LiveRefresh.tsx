"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Hlustar á rauntímabreytingar á tilteknum töflum fyrir þennan viðburð og
 * endurhleður server-gögnin (router.refresh) þegar eitthvað breytist.
 * Birtir lítinn "Lifandi" vísi.
 */
export function LiveRefresh({ eventId, tables }: { eventId: string; tables: string[] }) {
  const router = useRouter();
  const [live, setLive] = useState(false);
  const tablesKey = tables.join(",");

  useEffect(() => {
    const supabase = createClient();
    let timer: ReturnType<typeof setTimeout> | null = null;
    const schedule = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), 400); // safna breytingum í örstutta stund
    };

    const channel = supabase.channel(`live-${eventId}`);
    for (const table of tablesKey.split(",")) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter: `event_id=eq.${eventId}` },
        schedule
      );
    }
    channel.subscribe((status) => setLive(status === "SUBSCRIBED"));

    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [eventId, tablesKey, router]);

  return (
    <span
      className="inline-flex items-center gap-1.5 text-[12px] text-muted"
      title={live ? "Uppfærist sjálfkrafa" : "Tengist…"}
    >
      <span className={`h-2 w-2 rounded-full ${live ? "bg-success" : "bg-muted"}`} />
      {live ? "Lifandi" : "Tengist…"}
    </span>
  );
}

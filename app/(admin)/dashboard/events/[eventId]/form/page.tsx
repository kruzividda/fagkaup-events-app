import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Eyebrow, PageTitle } from "@/components/ui";
import { FormBuilder, type BuilderField } from "./FormBuilder";

export default async function FormPage({ params }: { params: { eventId: string } }) {
  const supabase = createClient();

  const { data: event } = await supabase.from("events").select("name").eq("id", params.eventId).single();
  if (!event) notFound();

  const { data: fields } = await supabase
    .from("event_form_fields")
    .select("id, field_key, label, field_type, requirement, is_custom, visible_if")
    .eq("event_id", params.eventId)
    .order("sort_order", { ascending: true });

  const ids = (fields ?? []).map((f) => f.id);
  const { data: options } = ids.length
    ? await supabase.from("event_field_options").select("field_id, value, label, sort_order").in("field_id", ids).order("sort_order")
    : { data: [] as { field_id: string; value: string; label: string; sort_order: number }[] };

  const optsByField = new Map<string, { value: string; label: string }[]>();
  for (const o of options ?? []) {
    const arr = optsByField.get(o.field_id) ?? [];
    arr.push({ value: o.value, label: o.label });
    optsByField.set(o.field_id, arr);
  }

  const builderFields: BuilderField[] = (fields ?? []).map((f) => ({
    id: f.id,
    field_key: f.field_key,
    label: f.label,
    field_type: f.field_type,
    requirement: f.requirement,
    is_custom: f.is_custom,
    options: optsByField.get(f.id) ?? [],
    visible_if: (f.visible_if as BuilderField["visible_if"]) ?? null,
  }));

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Eyebrow>Skráningarform</Eyebrow>
        <PageTitle>{event.name}</PageTitle>
        <p className="mt-2 text-sm text-muted">
          Veldu hvaða upplýsingar eru sóttar, búðu til eigin spurningar og settu upp skilyrtar undirspurningar.
        </p>
      </div>
      <FormBuilder eventId={params.eventId} initialFields={builderFields} />
    </div>
  );
}

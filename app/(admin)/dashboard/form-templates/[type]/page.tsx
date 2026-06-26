export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Eyebrow, PageTitle, Card } from "@/components/ui";
import { EVENT_TYPE_OPTIONS } from "@/components/form";
import { FormBuilder, type BuilderField } from "../../events/[eventId]/form/FormBuilder";
import { getOrCreateTemplate } from "../actions";

export default async function FormTemplateEditPage({ params }: { params: { type: string } }) {
  const opt = EVENT_TYPE_OPTIONS.find((o) => o.value === params.type);
  if (!opt) notFound();

  const res = await getOrCreateTemplate(params.type);
  if (!res.ok || !res.id) {
    return (
      <div className="max-w-3xl space-y-4">
        <Eyebrow>Form sniðmát</Eyebrow>
        <PageTitle>{opt.label}</PageTitle>
        <Card accent>
          <p className="text-sm text-danger">{res.error ?? "Tókst ekki að opna sniðmát."}</p>
        </Card>
        <Link href="/dashboard/form-templates" className="text-sm text-muted underline-offset-4 hover:underline">
          ← Til baka í sniðmát
        </Link>
      </div>
    );
  }

  const templateId = res.id;
  const supabase = createClient();

  const { data: fields } = await supabase
    .from("event_form_fields")
    .select("id, field_key, label, field_type, requirement, is_custom, visible_if")
    .eq("event_id", templateId)
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
        <Eyebrow>Form sniðmát</Eyebrow>
        <PageTitle>{opt.label}</PageTitle>
        <p className="mt-2 text-sm text-muted">
          Þetta er sjálfgefna formið fyrir <span className="text-text">{opt.label.toLowerCase()}</span>. Nýir viðburðir
          af þessari tegund fá afrit af því. Breytingar hér hafa ekki áhrif á viðburði sem þegar eru til.
        </p>
        <p className="mt-1">
          <Link href="/dashboard/form-templates" className="text-[13px] text-muted underline-offset-4 hover:underline">
            ← Öll sniðmát
          </Link>
        </p>
      </div>
      <FormBuilder eventId={templateId} initialFields={builderFields} />
    </div>
  );
}

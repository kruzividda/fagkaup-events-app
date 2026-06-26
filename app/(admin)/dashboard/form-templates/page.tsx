export const dynamic = "force-dynamic";

import { Eyebrow, PageTitle } from "@/components/ui";
import { listFormTemplates } from "./actions";
import { TemplatesManager } from "./TemplatesManager";

export default async function FormTemplatesPage() {
  const { templates } = await listFormTemplates();

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Eyebrow>Skráningarform</Eyebrow>
        <PageTitle>Form sniðmát</PageTitle>
        <p className="mt-2 text-sm text-muted">
          Búðu til, endurnefndu eða eyddu skráningarformum. Þegar þú stofnar viðburð velurðu eitt af þessum formum og
          viðburðurinn fær afrit af því — sem þú getur svo breytt frekar fyrir hvern viðburð. Breytingar á formi hér
          hafa ekki áhrif á viðburði sem þegar eru til.
        </p>
      </div>
      <TemplatesManager initial={templates} />
    </div>
  );
}

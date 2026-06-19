import { Eyebrow, PageTitle, Stub } from "@/components/ui";

export default function EventDetailPage({ params }: { params: { eventId: string } }) {
  return (
    <div className="space-y-6">
      <div>
        <Eyebrow>Viðburður</Eyebrow>
        <PageTitle>Yfirlit viðburðar</PageTitle>
        <p className="mt-1 text-xs text-muted">ID: {params.eventId}</p>
      </div>
      <Stub title="Skráningar, boðslisti, borðaskipan, tölfræði" note="Undirsíður viðburðar koma hér." />
    </div>
  );
}

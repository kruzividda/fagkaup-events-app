import { Eyebrow, PageTitle, Stub } from "@/components/ui";

export default function UsersPage() {
  return (
    <div className="space-y-6">
      <div>
        <Eyebrow>Notendur</Eyebrow>
        <PageTitle>Starfsfólk</PageTitle>
      </div>
      <Stub title="Notendastýring" note="Bjóða inn starfsfólki og úthluta hlutverkum: admin, dyravörður, barþjónn." />
    </div>
  );
}

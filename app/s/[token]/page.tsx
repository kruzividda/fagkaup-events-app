import { ScannerGate } from "./ScannerGate";

export const metadata = {
  title: "Skanni — Fagkaup Events",
};

export default function ScannerPage({ params }: { params: { token: string } }) {
  return <ScannerGate token={params.token} />;
}

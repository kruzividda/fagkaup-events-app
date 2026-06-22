import { redirect } from "next/navigation";

// Viðburðir er forsíða stjórnborðsins.
export default function DashboardHome() {
  redirect("/dashboard/events");
}

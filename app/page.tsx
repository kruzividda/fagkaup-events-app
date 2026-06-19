import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth";

export default async function Home() {
  const profile = await getProfile();
  if (!profile) redirect("/login");

  if (profile.role === "owner" || profile.role === "admin") redirect("/dashboard");
  if (profile.role === "door") redirect("/door");
  if (profile.role === "bartender") redirect("/bar");
  redirect("/login");
}

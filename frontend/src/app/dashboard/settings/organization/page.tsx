import { redirect } from "next/navigation";

/** Legacy URL — workspace settings live under `/dashboard/settings/workspace`. */
export default function OrganizationSettingsRedirectPage() {
  redirect("/dashboard/settings/workspace");
}

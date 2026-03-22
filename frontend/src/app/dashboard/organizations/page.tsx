import { redirect } from "next/navigation";

/** Legacy URL — workspaces are the primary concept in the UI. */
export default function OrganizationsPageRedirect() {
  redirect("/dashboard/workspaces");
}

import { redirect } from "next/navigation";

/** Customer app no longer lists feedback; submissions go to super-admin. */
export default function DashboardFeedbacksRedirectPage() {
  redirect("/dashboard");
}

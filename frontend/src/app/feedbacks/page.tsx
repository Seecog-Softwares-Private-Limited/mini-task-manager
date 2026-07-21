import { redirect } from "next/navigation";

/** Short alias for the dashboard feedbacks list. */
export default function FeedbacksAliasPage() {
  redirect("/dashboard/feedbacks");
}

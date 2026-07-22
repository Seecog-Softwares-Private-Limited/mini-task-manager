import { redirect } from "next/navigation";

/** Feedback list moved to the super-admin portal. */
export default function FeedbacksAliasPage() {
  redirect("/dashboard");
}

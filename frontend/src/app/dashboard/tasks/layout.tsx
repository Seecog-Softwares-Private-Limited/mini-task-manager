/** Dashboard tasks use client-only DOM APIs; skip static prerender at build time. */
export const dynamic = "force-dynamic";

export default function TasksLayout({ children }: { children: React.ReactNode }) {
  return children;
}

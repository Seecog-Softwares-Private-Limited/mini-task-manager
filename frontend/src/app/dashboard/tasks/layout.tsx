export const dynamic = 'force-dynamic';

export default function TasksLayout({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-0 flex-1 flex-col">{children}</div>;
}

"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { fetchProject } from "@/services/api/projects.api";
import { fetchProjectMembers } from "@/services/api/members.api";
import { fetchTasksByProject } from "@/services/api/tasks.api";
import { useTenant } from "@/context/tenant-context";
import { Button } from "@/components/ui/button";
import { ProjectHeader } from "@/components/projects/project-header";
import { Skeleton } from "@/components/ui/skeleton";
import { NetworkFallback } from "@/components/network-fallback";
import { ArrowLeft, Building2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { id: string };
}) {
  const { id } = params;
  const { orgId } = useTenant();

  const { data: project, isLoading, error, isError, refetch } = useQuery({
    queryKey: ["project", id],
    queryFn: () => fetchProject(id),
    enabled: !!id && !!orgId,
  });

  const { data: projectMembers = [] } = useQuery({
    queryKey: ["project-members", id],
    queryFn: () => fetchProjectMembers(id),
    enabled: !!id && !!project,
  });

  const { data: tasksData } = useQuery({
    queryKey: ["tasks", id],
    queryFn: () => fetchTasksByProject(id, 1, 500),
    enabled: !!id && !!project,
  });

  const taskCount = tasksData?.data?.length ?? 0;

  if (!orgId) {
    return (
      <Card className="max-w-md border-dashed border-2 mx-auto mt-12">
        <CardContent className="flex items-center gap-4 py-8 px-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 shrink-0">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="font-semibold">Workspace required</p>
            <p className="mt-0.5 text-sm text-muted-foreground">Select a workspace to view this project.</p>
            <Button asChild size="sm" className="mt-3">
              <Link href="/dashboard/workspaces">Workspaces</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading || !project) {
    return (
      <div className="space-y-4 animate-fade-in">
        <Skeleton className="h-10 w-48 rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <NetworkFallback error={error ?? null} retry={() => refetch()}>
      <div className="space-y-6 animate-slide-up">
        {isError && error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3">
            <p className="text-sm text-destructive">{(error as Error).message}</p>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground">
            <Link href="/dashboard/projects" className="flex items-center gap-1">
              <ArrowLeft className="h-4 w-4" /> Projects
            </Link>
          </Button>
        </div>
        <ProjectHeader
          project={project}
          projectId={id}
          members={projectMembers}
          taskCount={taskCount}
        />
        {children}
      </div>
    </NetworkFallback>
  );
}

"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useTenant } from "@/context/tenant-context";
import { fetchProjects } from "@/services/api/projects.api";
import { useNotificationSeed } from "@/hooks/use-notification-seed";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { WhatsNewBanner } from "@/components/feature-tour/whats-new-banner";
import { SystemStatusWidget } from "@/components/observability/system-status-widget";
import { FolderKanban, Users, CheckCircle2, TrendingUp, ArrowRight, Plus, Building2 } from "lucide-react";

export default function DashboardPage() {
  const { user, canManageBilling } = useAuth();
  const { orgId } = useTenant();
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects", orgId ?? ""],
    queryFn: fetchProjects,
    enabled: !!orgId,
  });
  useNotificationSeed(projects.length);

  const firstName = user?.email?.split("@")[0] ?? "there";

  return (
    <div className="space-y-8" data-cy="dashboard-page">
      {/* Hero greeting */}
      <div className="relative overflow-hidden rounded-2xl gradient-bg p-8 text-white shadow-lg shadow-primary/20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.15),transparent)]" />
        <div className="relative z-10">
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome back, {firstName}
          </h1>
          <p className="mt-2 text-white/70 max-w-lg">
            Here&apos;s an overview of your workspace. Manage projects, track tasks, and keep your team aligned.
          </p>
          {!orgId && (
            <Button asChild variant="secondary" className="mt-4 bg-white/20 hover:bg-white/30 text-white border-0 shadow-none">
              <Link href="/dashboard/organizations">
                <Building2 className="mr-2 h-4 w-4" />
                Select an organization to get started
              </Link>
            </Button>
          )}
        </div>
      </div>

      <WhatsNewBanner className="max-w-2xl" />

      {orgId && (
        <>
          {/* Stats cards */}
          {canManageBilling && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {isLoading ? (
                <>
                  {[1, 2, 3, 4].map((i) => (
                    <Card key={i} className="hover:shadow-premium-lg">
                      <CardContent className="p-6">
                        <Skeleton className="h-20 w-full" />
                      </CardContent>
                    </Card>
                  ))}
                </>
              ) : (
                <>
                  <Card className="group relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                          <FolderKanban className="h-6 w-6 text-primary" />
                        </div>
                        <TrendingUp className="h-4 w-4 text-emerald-500" />
                      </div>
                      <p className="mt-4 text-3xl font-bold">{projects.length}</p>
                      <p className="mt-1 text-sm text-muted-foreground">Active Projects</p>
                    </CardContent>
                  </Card>

                  <Card className="group relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10">
                          <CheckCircle2 className="h-6 w-6 text-blue-500" />
                        </div>
                      </div>
                      <p className="mt-4 text-3xl font-bold">&mdash;</p>
                      <p className="mt-1 text-sm text-muted-foreground">Active Tasks</p>
                    </CardContent>
                  </Card>

                  <Card className="group relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10">
                          <Users className="h-6 w-6 text-purple-500" />
                        </div>
                      </div>
                      <p className="mt-4 text-3xl font-bold">&mdash;</p>
                      <p className="mt-1 text-sm text-muted-foreground">Team Members</p>
                    </CardContent>
                  </Card>

                  <Card className="group relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10">
                          <TrendingUp className="h-6 w-6 text-emerald-500" />
                        </div>
                      </div>
                      <p className="mt-4 text-3xl font-bold">&mdash;</p>
                      <p className="mt-1 text-sm text-muted-foreground">Completion Rate</p>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          )}

          {/* Recent projects */}
          {projects.length > 0 && (
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle className="text-lg">Recent Projects</CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/dashboard/projects" className="text-primary">
                    View all <ArrowRight className="ml-1 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {projects.slice(0, 5).map((p) => (
                    <Link
                      key={p.id}
                      href={`/dashboard/projects/${p.id}`}
                      className="flex items-center gap-3 rounded-lg border border-transparent p-3 transition-all hover:border-border hover:bg-muted/30 hover:shadow-sm"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <FolderKanban className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{p.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {p.description || "No description"}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick actions */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Link href="/dashboard/projects" className="group">
              <Card className="h-full border-dashed border-2 hover:border-primary/30 transition-colors">
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <Plus className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">New Project</p>
                    <p className="text-xs text-muted-foreground">Create and organize work</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link href="/dashboard/tasks" className="group">
              <Card className="h-full border-dashed border-2 hover:border-blue-500/30 transition-colors">
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
                    <CheckCircle2 className="h-6 w-6 text-blue-500" />
                  </div>
                  <div>
                    <p className="font-semibold">View Tasks</p>
                    <p className="text-xs text-muted-foreground">Track and manage tasks</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link href="/dashboard/settings" className="group">
              <Card className="h-full border-dashed border-2 hover:border-purple-500/30 transition-colors">
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10 group-hover:bg-purple-500/20 transition-colors">
                    <Users className="h-6 w-6 text-purple-500" />
                  </div>
                  <div>
                    <p className="font-semibold">Settings</p>
                    <p className="text-xs text-muted-foreground">Configure workspace</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </>
      )}

      {canManageBilling && (
        <div className="max-w-xs" data-cy="system-status-widget">
          <SystemStatusWidget />
        </div>
      )}
    </div>
  );
}

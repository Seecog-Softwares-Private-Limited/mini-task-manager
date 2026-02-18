"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchOrganizations, createOrganization } from "@/services/api/organizations.api";
import { useTenant } from "@/context/tenant-context";
import { parseApiError, isRateLimited } from "@/services/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Plus, Check, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const schema = z.object({
  name: z.string().min(1).max(150),
  slug: z.string().min(1).max(150).regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers, and hyphens only"),
});

type FormData = z.infer<typeof schema>;

export default function OrganizationsPage() {
  const queryClient = useQueryClient();
  const { orgId, setOrgId } = useTenant();
  const { data: organizations = [], isLoading } = useQuery({
    queryKey: ["organizations"],
    queryFn: fetchOrganizations,
  });
  const mutation = useMutation({
    mutationFn: createOrganization,
    onSuccess: (org) => {
      setOrgId(org.id);
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      reset();
    },
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", slug: "" },
  });

  function onSubmit(values: FormData) {
    mutation.mutate(values);
  }

  return (
    <div className="space-y-8 animate-slide-up">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Organizations</h1>
        <p className="mt-1 text-muted-foreground">
          Select an organization to work in, or create a new one.
        </p>
      </div>

      {/* Organization list */}
      {organizations.length > 0 && (
        <div>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Your Organizations
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : (
              organizations.map((org) => {
                const isCurrent = orgId === org.id;
                return (
                  <Card
                    key={org.id}
                    className={cn(
                      "cursor-pointer transition-all duration-200",
                      isCurrent && "ring-2 ring-primary/30 border-primary/30 shadow-glow"
                    )}
                    onClick={() => setOrgId(org.id)}
                  >
                    <CardContent className="flex items-center gap-4 p-5">
                      <div className={cn(
                        "flex h-12 w-12 items-center justify-center rounded-xl transition-colors",
                        isCurrent ? "gradient-bg text-white shadow-md shadow-primary/20" : "bg-muted"
                      )}>
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{org.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {isCurrent ? "Currently active" : "Click to switch"}
                        </p>
                      </div>
                      {isCurrent && (
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
                          <Check className="h-4 w-4 text-primary" />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Create organization form */}
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Plus className="h-5 w-5 text-primary" />
            Create Organization
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Organization Name
              </Label>
              <Input id="name" {...register("name")} placeholder="Acme Inc" />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                URL Slug
              </Label>
              <Input id="slug" {...register("slug")} placeholder="acme-inc" />
              {errors.slug && <p className="text-xs text-destructive">{errors.slug.message}</p>}
            </div>
            <Button type="submit" disabled={mutation.isPending} className="w-full">
              {mutation.isPending ? "Creating..." : (
                <span className="flex items-center gap-2">Create Organization <ArrowRight className="h-4 w-4" /></span>
              )}
            </Button>
            {mutation.error && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3">
                <p className="text-sm text-destructive">
                  {isRateLimited(mutation.error) ? "Too many requests." : parseApiError(mutation.error)}
                </p>
              </div>
            )}
            {mutation.isSuccess && (
              <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-3">
                <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                  Organization created and set as current.
                </p>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

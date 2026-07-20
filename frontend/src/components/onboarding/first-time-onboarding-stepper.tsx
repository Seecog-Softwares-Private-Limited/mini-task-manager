"use client";

import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createOrganization } from "@/services/api/organizations.api";
import {
  createProject,
  fetchProjectTemplates,
  seedDemoTasks,
} from "@/services/api/projects.api";
import { createInvitation } from "@/services/api/invitations.api";
import { useFirstTimeOnboarding } from "@/context/first-time-onboarding-context";
import { useTenant } from "@/context/tenant-context";
import { parseApiError, isRateLimited } from "@/services/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  Building2,
  Users,
  FolderKanban,
  ListTodo,
  Rocket,
  X,
  Check,
  ArrowRight,
  ImagePlus,
  Loader2,
} from "lucide-react";
import { WorkspaceAvatarPresetsPicker } from "@/components/workspaces/workspace-avatar-presets-picker";
import {
  DEFAULT_WORKSPACE_AVATAR,
  resolveWorkspaceLogoUrl,
} from "@/lib/workspace-avatar-presets";

const STEP_1_SCHEMA = z.object({
  name: z.string().min(1, "Name is required").max(150),
});

type Step1Form = z.infer<typeof STEP_1_SCHEMA>;

const STEPS = [
  { id: "org", title: "Create workspace", icon: Building2 },
  { id: "invite", title: "Invite Members", icon: Users },
  { id: "project", title: "Create First Project", icon: FolderKanban },
  { id: "tasks", title: "Add Demo Tasks", icon: ListTodo },
] as const;

export function FirstTimeOnboardingStepper() {
  const queryClient = useQueryClient();
  const { completeOnboarding, trigger } = useFirstTimeOnboarding();
  const { orgId, setOrgId } = useTenant();
  const [step, setStep] = useState(0);
  const [logoPreview, setLogoPreview] = useState<string | null>(
    DEFAULT_WORKSPACE_AVATAR.dataUrl
  );
  const logoFileInputRef = useRef<HTMLInputElement>(null);
  const [inviteEmails, setInviteEmails] = useState<string[]>([]);
  const [currentEmail, setCurrentEmail] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const { data: templates = [] } = useQuery({
    queryKey: ["project-templates"],
    queryFn: fetchProjectTemplates,
    enabled: step === 2,
  });

  useEffect(() => {
    if (step === 2 && templates.length > 0 && !selectedTemplateId) {
      setSelectedTemplateId(templates[0].id);
    }
  }, [step, templates, selectedTemplateId]);

  const step1Form = useForm<Step1Form>({
    resolver: zodResolver(STEP_1_SCHEMA),
    defaultValues: { name: "" },
  });

  const createOrgMutation = useMutation({
    mutationFn: (payload: { name: string; logoUrl?: string }) =>
      createOrganization(payload),
    onSuccess: (org) => {
      setOrgId(org.id);
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      trigger();
      setStep(1);
    },
  });

  const inviteMutation = useMutation({
    mutationFn: ({ orgId, email }: { orgId: string; email: string }) =>
      createInvitation(orgId, { email, role: "member" }),
  });

  const createProjectMutation = useMutation({
    mutationFn: (payload: { name: string; description?: string }) =>
      createProject(payload),
    onSuccess: (project) => {
      setCreatedProjectId(project.id);
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setStep(3);
    },
  });

  const seedTasksMutation = useMutation({
    mutationFn: seedDemoTasks,
    onSuccess: async () => {
      await completeOnboarding();
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  const handleStep1Submit = (values: Step1Form) => {
    createOrgMutation.mutate({
      name: values.name.trim(),
      logoUrl: resolveWorkspaceLogoUrl(logoPreview),
    });
  };

  const handleSkipInvites = () => {
    setStep(2);
  };

  const handleAddInvite = () => {
    const email = currentEmail.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    if (inviteEmails.includes(email)) return;
    setInviteEmails((prev) => [...prev, email]);
    setCurrentEmail("");
  };

  const handleSendInvites = async () => {
    if (!orgId) return;
    for (const email of inviteEmails) {
      try {
        await inviteMutation.mutateAsync({ orgId, email });
      } catch {
        // Continue with others
      }
    }
    setStep(2);
  };

  const handleCreateProject = () => {
    const template = templates.find((t) => t.id === selectedTemplateId) ?? templates[0];
    const name = template?.name ?? "My First Project";
    const description = template?.description ?? undefined;
    createProjectMutation.mutate({ name, description });
  };

  const handleSeedTasks = () => {
    if (createdProjectId) {
      seedTasksMutation.mutate(createdProjectId);
    } else {
      completeOnboarding();
    }
  };

  const handleSkip = () => {
    completeOnboarding();
  };

  const currentStepData = STEPS[step];
  const Icon = currentStepData?.icon ?? Rocket;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
      data-cy="first-time-onboarding"
    >
      <div className="w-full max-w-lg rounded-2xl border bg-card shadow-xl overflow-hidden">
        {/* Header */}
        <div className="gradient-bg p-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                <Icon className="h-5 w-5" />
              </div>
              <h2 id="onboarding-title" className="text-lg font-bold">
                {currentStepData?.title ?? "Get Started"}
              </h2>
            </div>
            <Button
              ref={closeRef}
              variant="ghost"
              size="sm"
              className="text-white/70 hover:text-white hover:bg-white/10"
              onClick={handleSkip}
            >
              Skip
            </Button>
          </div>
          <div className="mt-3 flex gap-1">
            {STEPS.map((s, i) => (
              <div
                key={s.id}
                className={cn(
                  "h-1 flex-1 rounded-full transition-colors",
                  i < step ? "bg-white" : i === step ? "bg-white/80" : "bg-white/30"
                )}
              />
            ))}
          </div>
        </div>

        <div className="p-6">
          {/* Step 1: Create workspace */}
          {step === 0 && (
            <form
              onSubmit={step1Form.handleSubmit(handleStep1Submit)}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label>Workspace name</Label>
                <Input
                  {...step1Form.register("name")}
                  placeholder="Acme Inc"
                  autoFocus
                />
                {step1Form.formState.errors.name && (
                  <p className="text-xs text-destructive">
                    {step1Form.formState.errors.name.message}
                  </p>
                )}
              </div>
              <div className="space-y-3">
                <Label>Workspace icon</Label>
                <div className="flex items-center gap-4">
                  <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-muted">
                    <img
                      src={resolveWorkspaceLogoUrl(logoPreview)}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setLogoPreview(DEFAULT_WORKSPACE_AVATAR.dataUrl);
                        if (logoFileInputRef.current) logoFileInputRef.current.value = "";
                      }}
                      className="absolute inset-0 flex items-center justify-center bg-black/50 text-[10px] font-medium text-white opacity-0 transition-opacity hover:opacity-100"
                      aria-label="Reset to default logo"
                    >
                      Reset
                    </button>
                  </div>
                  <div className="flex-1 space-y-1">
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                      <input
                        ref={logoFileInputRef}
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file?.type.startsWith("image/")) return;
                          const maxSize = 100 * 1024;
                          if (file.size > maxSize) return;
                          const r = new FileReader();
                          r.onload = () =>
                            typeof r.result === "string" && setLogoPreview(r.result);
                          r.readAsDataURL(file);
                        }}
                      />
                      <ImagePlus className="h-4 w-4" />
                      Upload image
                    </label>
                    <p className="text-xs text-muted-foreground/80">PNG, JPG up to 100KB.</p>
                  </div>
                </div>
                <WorkspaceAvatarPresetsPicker
                  value={resolveWorkspaceLogoUrl(logoPreview)}
                  onSelectPreset={(dataUrl) => {
                    setLogoPreview(dataUrl);
                    if (logoFileInputRef.current) logoFileInputRef.current.value = "";
                  }}
                />
              </div>
              {createOrgMutation.error && (
                <p className="text-xs text-destructive">
                  {isRateLimited(createOrgMutation.error)
                    ? "Too many requests."
                    : parseApiError(createOrgMutation.error)}
                </p>
              )}
              <Button
                type="submit"
                className="w-full"
                disabled={createOrgMutation.isPending}
              >
                {createOrgMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Create & continue <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          )}

          {/* Step 2: Invite Members */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Invite team members by email. You can skip and do this later.
              </p>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="colleague@example.com"
                  value={currentEmail}
                  onChange={(e) => setCurrentEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddInvite())}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddInvite}
                  disabled={!currentEmail.trim()}
                >
                  Add
                </Button>
              </div>
              {inviteEmails.length > 0 && (
                <ul className="space-y-1">
                  {inviteEmails.map((email) => (
                    <li
                      key={email}
                      className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                    >
                      {email}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-muted-foreground"
                        onClick={() =>
                          setInviteEmails((prev) => prev.filter((e) => e !== email))
                        }
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleSkipInvites}
                >
                  Skip for now
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleSendInvites}
                  disabled={inviteEmails.length === 0 || inviteMutation.isPending}
                >
                  {inviteMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>Send {inviteEmails.length} invite(s)</>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Create Project */}
          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Choose a template for your first project.
              </p>
              <div className="grid gap-2">
                {templates.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedTemplateId(t.id)}
                    className={cn(
                      "flex items-start gap-3 rounded-xl border p-4 text-left transition-all",
                      selectedTemplateId === t.id
                        ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                        : "hover:border-muted-foreground/30"
                    )}
                  >
                    <FolderKanban className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <div>
                      <p className="font-semibold">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.description}</p>
                    </div>
                    {selectedTemplateId === t.id && (
                      <Check className="ml-auto h-5 w-5 text-primary" />
                    )}
                  </button>
                ))}
              </div>
              <Button
                className="w-full"
                onClick={handleCreateProject}
                disabled={createProjectMutation.isPending}
              >
                {createProjectMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Create project <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Step 4: Demo Tasks */}
          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Add 3 demo tasks to get you started, or finish without them.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => completeOnboarding()}
                >
                  Skip demo tasks
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleSeedTasks}
                  disabled={seedTasksMutation.isPending}
                >
                  {seedTasksMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>Add demo tasks & finish</>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

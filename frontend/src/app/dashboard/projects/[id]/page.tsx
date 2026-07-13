"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchProject } from "@/services/api/projects.api";
import { fetchWorkflowsByProject, fetchWorkflowStatuses } from "@/services/api/workflows.api";
import { fetchTasksByProject } from "@/services/api/tasks.api";
import { fetchProjectMembers } from "@/services/api/members.api";
import { useTenant } from "@/context/tenant-context";
import { Button } from "@/components/ui/button";
import { ProjectDashboard } from "@/components/projects/project-dashboard";
import { CreateTaskModal, type CreateTaskFormData } from "@/components/tasks/create-task-modal";
import { useTaskCreatedCelebration } from "@/components/tasks/task-create-celebration";
import { useToast } from "@/components/ui/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createTaskWithDescriptionImages } from "@/lib/upload-task-description-images";
import { createTask } from "@/services/api/tasks.api";
import { parseApiError, isRateLimited } from "@/services/api/client";
import { useRetentionTracking } from "@/hooks/use-retention-tracking";
import { useCreateProjectInvitation } from "@/hooks/use-project-invitations";
import { ProjectInviteMemberModal } from "@/components/projects/project-invite-member-modal";
import { Plus, UserPlus } from "lucide-react";

export default function ProjectOverviewPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { orgId } = useTenant();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { trackFirstTaskCreated } = useRetentionTracking();
  const { triggerTaskCreatedCelebration, celebrationLayer } = useTaskCreatedCelebration();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);

  const { data: project } = useQuery({
    queryKey: ["project", id],
    queryFn: () => fetchProject(id),
    enabled: !!id && !!orgId,
  });

  const { data: workflows = [] } = useQuery({
    queryKey: ["workflows", id],
    queryFn: () => fetchWorkflowsByProject(id),
    enabled: !!id && !!orgId,
  });

  const defaultWorkflow = workflows.find((w) => w.isDefault) ?? workflows[0];
  const { data: statuses = [] } = useQuery({
    queryKey: ["workflow-statuses", defaultWorkflow?.id],
    queryFn: () => fetchWorkflowStatuses(defaultWorkflow!.id),
    enabled: !!defaultWorkflow?.id,
  });

  const { data: tasksData } = useQuery({
    queryKey: ["tasks", id],
    queryFn: () => fetchTasksByProject(id, 1, 500),
    enabled: !!id && !!orgId,
  });

  const { data: projectMembers = [] } = useQuery({
    queryKey: ["project-members", id],
    queryFn: () => fetchProjectMembers(id),
    enabled: !!id,
  });

  const tasks = tasksData?.data ?? [];
  const { createInvite, isPending: invitePending, error: inviteError } = useCreateProjectInvitation(orgId);

  const createMutation = useMutation({
    mutationFn: ({
      payload,
      imageFiles,
      subtaskPendingAttachments,
      taskAttachmentFiles,
    }: {
      payload: Parameters<typeof createTask>[0];
      imageFiles?: File[];
      subtaskPendingAttachments?: import("@/lib/upload-subtask-attachments").SubtaskPendingUploadMap;
      taskAttachmentFiles?: File[];
    }) =>
      createTaskWithDescriptionImages(
        payload,
        imageFiles,
        subtaskPendingAttachments,
        taskAttachmentFiles
      ),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["tasks", id] });
      setCreateModalOpen(false);
      const uploadWarning =
        result.subtaskUploadWarning ??
        result.taskAttachmentWarning ??
        result.imageUploadWarning;
      if (uploadWarning) {
        toast({
          title: "Task created",
          description: uploadWarning,
          variant: "error",
        });
      } else {
        toast({ title: "Task created", variant: "success" });
      }
      trackFirstTaskCreated();
      triggerTaskCreatedCelebration();
    },
    onError: (err) => toast({ title: "Failed to create task", description: parseApiError(err), variant: "error" }),
  });

  const handleCreateTask = (
    data: CreateTaskFormData,
    descriptionImageFiles?: File[],
    subtaskPendingAttachments?: import("@/lib/upload-subtask-attachments").SubtaskPendingUploadMap,
    taskPendingAttachments?: import("@/components/tasks/subtasks/subtask-attachments-section").PendingSubtaskAttachment[]
  ) => {
    if (!orgId) return;
    createMutation.mutate({
      payload: {
        tags: data.labels?.length ? data.labels.map((l: { name: string; color: string }) => ({ name: l.name, color: l.color })) : undefined,
        projectId: id,
        organizationId: orgId,
        title: data.title,
        description: data.description,
        statusId: data.statusId ?? statuses[0]?.id,
        priority: data.priority ?? "MEDIUM",
        assigneeIds: data.assigneeIds?.length ? data.assigneeIds : undefined,
        assigneeId: data.assigneeIds?.[0] || undefined,
        storyPoints: data.storyPoints,
        dueDate: data.dueDate,
        dueTime: data.dueDate ? data.dueTime || undefined : undefined,
        subtasks: data.subtasks
          .map((s) => ({
            id: s.id,
            title: s.title.trim(),
            description: s.description?.trim() || undefined,
            completed: s.completed,
            assigneeId: s.assigneeId || undefined,
            dueDate: s.dueDate || undefined,
            status: s.status ?? (s.completed ? "DONE" : "TODO"),
            priority: s.priority || undefined,
          }))
          .filter((s) => s.title.length > 0),
        recurrence:
          data.recurrence?.repeat && data.recurrence.repeat !== "NONE"
            ? data.recurrence
            : undefined,
      },
      imageFiles: descriptionImageFiles,
      subtaskPendingAttachments,
      taskAttachmentFiles: taskPendingAttachments?.map((item) => item.file),
    });
  };

  function handleInviteSubmit(values: { email: string; role: string; message?: string }) {
    const orgRole = values.role === "ADMIN" ? "admin" : "member";
    createInvite(
      { email: values.email, role: orgRole },
      {
        onSuccess: () => {
          setInviteModalOpen(false);
          queryClient.invalidateQueries({ queryKey: ["org-members", orgId ?? ""] });
        },
      }
    );
  }

  if (!project) return null;

  return (
    <div className="space-y-6">
      {celebrationLayer}
      {/* Quick actions */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          onClick={() => setCreateModalOpen(true)}
          data-cy="overview-new-task"
          aria-label="Create new task"
        >
          <Plus className="mr-1.5 h-4 w-4" /> New Task
        </Button>
        <Button
          variant="outline"
          aria-label="Invite member to project"
          onClick={() => setInviteModalOpen(true)}
          disabled={!orgId || invitePending}
        >
          <UserPlus className="mr-1.5 h-4 w-4" /> Invite Member
        </Button>
      </div>

      <ProjectDashboard
        projectId={id}
        projectName={project.name}
        tasks={tasks}
        statuses={statuses}
        members={projectMembers}
      />

      <CreateTaskModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSubmit={handleCreateTask}
        isSubmitting={createMutation.isPending}
        error={createMutation.error ? (isRateLimited(createMutation.error) ? "Too many requests." : parseApiError(createMutation.error)) : null}
        projectId={id}
        projectName={project?.name}
        statuses={statuses}
        defaultStatusId={statuses[0]?.id}
      />

      <ProjectInviteMemberModal
        open={inviteModalOpen}
        onOpenChange={setInviteModalOpen}
        onSubmit={handleInviteSubmit}
        isSubmitting={invitePending}
        error={inviteError ? parseApiError(inviteError) : null}
      />
    </div>
  );
}

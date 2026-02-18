"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchProject } from "@/services/api/projects.api";
import { useTenant } from "@/context/tenant-context";
import { ProjectMembers } from "@/components/projects/project-members";

export default function ProjectMembersPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { orgId } = useTenant();

  const { data: project } = useQuery({
    queryKey: ["project", id],
    queryFn: () => fetchProject(id),
    enabled: !!id && !!orgId,
  });

  if (!project || !orgId) return null;

  return (
    <ProjectMembers
      projectId={id}
      organizationId={orgId}
      projectName={project.name}
    />
  );
}

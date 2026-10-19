import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_exception.dart';
import '../../core/messaging/app_messenger.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../data/models/organization.dart';
import '../../data/models/project.dart';
import '../../shared/widgets/app_widgets.dart';
import '../../shared/widgets/workspace_avatar.dart';
import '../auth/session_controller.dart';
import '../kanban/kanban_providers.dart';
import '../kanban/project_switcher.dart';
import '../projects/create_project_sheet.dart';
import '../projects/projects_providers.dart';
import '../workspaces/create_workspace_sheet.dart';
import '../workspaces/workspace_settings_sheet.dart';

/// Full CRUD list of workspaces; expand a row to manage that workspace's projects.
class ManageWorkspacesScreen extends ConsumerStatefulWidget {
  const ManageWorkspacesScreen({super.key});

  @override
  ConsumerState<ManageWorkspacesScreen> createState() =>
      _ManageWorkspacesScreenState();
}

class _ManageWorkspacesScreenState extends ConsumerState<ManageWorkspacesScreen> {
  bool _loading = false;
  String? _expandedOrgId;

  @override
  void initState() {
    super.initState();
    Future.microtask(_refresh);
  }

  Future<void> _refresh() async {
    setState(() => _loading = true);
    try {
      await ref.read(sessionControllerProvider.notifier).refreshOrganizations();
    } catch (_) {
      if (mounted) {
        showAppMessage('Could not refresh workspaces', isError: true);
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _createWorkspace() async {
    await showCreateWorkspaceSheet(
      context: context,
      ref: ref,
      onCreated: () {
        ref.invalidate(projectsProvider);
      },
    );
    if (mounted) await _refresh();
  }

  @override
  Widget build(BuildContext context) {
    final session = ref.watch(sessionControllerProvider);
    final organizations = session.organizations;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Workspaces'),
        actions: [
          IconButton(
            tooltip: 'Refresh',
            onPressed: _loading ? null : _refresh,
            icon: _loading
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.refresh_rounded),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _createWorkspace,
        icon: const Icon(Icons.add_rounded),
        label: const Text('New workspace'),
      ),
      body: organizations.isEmpty
          ? Center(
              child: Padding(
                padding: const EdgeInsets.all(AppSpacing.lg),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const EmptyState(
                      icon: Icons.apartment_outlined,
                      title: 'No workspaces yet',
                      message: 'Create a workspace to organize your projects.',
                    ),
                    const SizedBox(height: AppSpacing.lg),
                    PrimaryButton(
                      label: 'Create workspace',
                      onPressed: _createWorkspace,
                    ),
                  ],
                ),
              ),
            )
          : RefreshIndicator(
              onRefresh: _refresh,
              child: ListView.separated(
                padding: const EdgeInsets.fromLTRB(
                  AppSpacing.md,
                  AppSpacing.sm,
                  AppSpacing.md,
                  100,
                ),
                itemCount: organizations.length,
                separatorBuilder: (_, __) =>
                    const SizedBox(height: AppSpacing.sm),
                itemBuilder: (context, index) {
                  final org = organizations[index];
                  final expanded = _expandedOrgId == org.id;
                  return _WorkspaceManageCard(
                    organization: org,
                    expanded: expanded,
                    isDark: isDark,
                    onToggleExpand: () {
                      setState(() {
                        _expandedOrgId = expanded ? null : org.id;
                      });
                    },
                    onChanged: _refresh,
                  );
                },
              ),
            ),
    );
  }
}

class _WorkspaceManageCard extends ConsumerWidget {
  const _WorkspaceManageCard({
    required this.organization,
    required this.expanded,
    required this.isDark,
    required this.onToggleExpand,
    required this.onChanged,
  });

  final Organization organization;
  final bool expanded;
  final bool isDark;
  final VoidCallback onToggleExpand;
  final Future<void> Function() onChanged;

  bool get _canManage {
    final role = organization.myRole?.toLowerCase();
    return role == 'owner' || role == 'admin';
  }

  Future<void> _editWorkspace(BuildContext context, WidgetRef ref) async {
    final updated = await showWorkspaceSettingsSheet(
      context: context,
      ref: ref,
      organizationId: organization.id,
    );
    if (updated == true) await onChanged();
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final surface = isDark ? const Color(0xFF1E293B) : AppColors.surface;

    return Material(
      color: surface,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onToggleExpand,
        child: Ink(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: isDark
                  ? Colors.white.withValues(alpha: 0.08)
                  : AppColors.border.withValues(alpha: 0.75),
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(
                  AppSpacing.md,
                  AppSpacing.sm,
                  AppSpacing.xs,
                  AppSpacing.sm,
                ),
                child: Row(
                  children: [
                    WorkspaceAvatar(
                      logoUrl: organization.logoUrl,
                      name: organization.name,
                      size: 40,
                      borderRadius: 10,
                    ),
                    const SizedBox(width: AppSpacing.sm),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            organization.name,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: Theme.of(context)
                                .textTheme
                                .titleSmall
                                ?.copyWith(fontWeight: FontWeight.w700),
                          ),
                          if (organization.myRole != null)
                            Text(
                              organization.myRole!,
                              style: Theme.of(context)
                                  .textTheme
                                  .labelSmall
                                  ?.copyWith(color: AppColors.textMuted),
                            ),
                        ],
                      ),
                    ),
                    if (_canManage)
                      IconButton(
                        tooltip: 'Edit Workspace',
                        onPressed: () => _editWorkspace(context, ref),
                        icon: const Icon(Icons.edit_outlined, size: 20),
                        visualDensity: VisualDensity.compact,
                      ),
                    Icon(
                      expanded
                          ? Icons.expand_less_rounded
                          : Icons.expand_more_rounded,
                      color: AppColors.textMuted,
                    ),
                    const SizedBox(width: AppSpacing.xs),
                  ],
                ),
              ),
              if (expanded) ...[
                Divider(
                  height: 1,
                  color: AppColors.border.withValues(alpha: 0.6),
                ),
                _WorkspaceProjectsPanel(organization: organization),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _WorkspaceProjectsPanel extends ConsumerWidget {
  const _WorkspaceProjectsPanel({required this.organization});

  final Organization organization;

  Future<void> _createProject(BuildContext context, WidgetRef ref) async {
    await showCreateProjectSheet(
      context: context,
      ref: ref,
      organizationId: organization.id,
    );
    ref.invalidate(projectsForOrganizationProvider(organization.id));
  }

  Future<void> _editProject(
    BuildContext context,
    WidgetRef ref,
    Project project,
  ) async {
    await showEditProjectSheet(
      context: context,
      ref: ref,
      organizationId: organization.id,
      project: project,
    );
    ref.invalidate(projectsForOrganizationProvider(organization.id));
  }

  Future<void> _deleteProject(
    BuildContext context,
    WidgetRef ref,
    Project project,
  ) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete project?'),
        content: Text(
          'This will permanently delete "${project.name}" and all its tasks. '
          'This action cannot be undone.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            style: TextButton.styleFrom(foregroundColor: AppColors.danger),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;

    try {
      await ref
          .read(projectsRepositoryProvider)
          .deleteProject(projectId: project.id);
      ref.invalidate(projectsProvider);
      ref.invalidate(projectsForOrganizationProvider(organization.id));
      ref.invalidate(projectBoardProvider(project.id));
      showAppMessage('Project deleted');
    } on ApiException catch (e) {
      showAppMessage(e.message, isError: true);
    } catch (_) {
      showAppMessage('Could not delete project.', isError: true);
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final projectsAsync =
        ref.watch(projectsForOrganizationProvider(organization.id));

    return Padding(
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.md,
        AppSpacing.sm,
        AppSpacing.md,
        AppSpacing.md,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Text(
                'Projects',
                style: Theme.of(context).textTheme.labelLarge?.copyWith(
                      color: AppColors.textMuted,
                      fontWeight: FontWeight.w700,
                    ),
              ),
              const Spacer(),
              TextButton.icon(
                onPressed: () => _createProject(context, ref),
                icon: const Icon(Icons.add_rounded, size: 18),
                label: const Text('Add'),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.xs),
          projectsAsync.when(
            loading: () => const Padding(
              padding: EdgeInsets.symmetric(vertical: AppSpacing.md),
              child: Center(child: CircularProgressIndicator()),
            ),
            error: (error, _) => Text(
              error is ApiException
                  ? error.message
                  : 'Could not load projects.',
              style: Theme.of(context)
                  .textTheme
                  .bodySmall
                  ?.copyWith(color: AppColors.danger),
            ),
            data: (projects) {
              if (projects.isEmpty) {
                return Padding(
                  padding: const EdgeInsets.symmetric(vertical: AppSpacing.sm),
                  child: Text(
                    'No projects in this workspace yet.',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: AppColors.textMuted,
                        ),
                  ),
                );
              }
              return Column(
                children: [
                  for (var i = 0; i < projects.length; i++) ...[
                    if (i > 0)
                      Divider(
                        height: 1,
                        color: AppColors.border.withValues(alpha: 0.5),
                      ),
                    _ProjectManageRow(
                      project: projects[i],
                      onEdit: () => _editProject(context, ref, projects[i]),
                      onDelete: () => _deleteProject(context, ref, projects[i]),
                    ),
                  ],
                ],
              );
            },
          ),
        ],
      ),
    );
  }
}

class _ProjectManageRow extends StatelessWidget {
  const _ProjectManageRow({
    required this.project,
    required this.onEdit,
    required this.onDelete,
  });

  final Project project;
  final VoidCallback onEdit;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          ProjectThumb(project: project, size: 28, radius: 8),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Text(
              project.name,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
            ),
          ),
          IconButton(
            tooltip: 'Edit project',
            onPressed: onEdit,
            icon: const Icon(Icons.edit_outlined, size: 20),
            visualDensity: VisualDensity.compact,
          ),
          IconButton(
            tooltip: 'Delete project',
            onPressed: onDelete,
            icon: const Icon(Icons.delete_outline_rounded, size: 20),
            color: AppColors.danger,
            visualDensity: VisualDensity.compact,
          ),
        ],
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/api_exception.dart';
import '../../core/preferences/app_preferences.dart';
import '../../core/router/app_router.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/utils/html_plain_text.dart';
import '../../shared/widgets/app_widgets.dart';
import '../../data/models/project.dart';
import 'create_project_sheet.dart';
import 'project_actions.dart';
import 'project_settings_sheet.dart';
import 'projects_providers.dart';

class ProjectsScreen extends ConsumerWidget {
  const ProjectsScreen({super.key, required this.orgId});

  final String? orgId;

  void _openCreateProject(BuildContext context, WidgetRef ref) {
    final id = orgId;
    if (id == null || id.isEmpty) return;
    showCreateProjectSheet(context: context, ref: ref, organizationId: id);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (orgId == null || orgId!.isEmpty) {
      return const EmptyState(
        title: 'No workspace selected',
        message: 'Choose a workspace to load projects.',
        icon: Icons.business_outlined,
      );
    }

    final projectsAsync = ref.watch(projectsProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return projectsAsync.when(
      loading: () => ListView.separated(
        padding: const EdgeInsets.all(AppSpacing.md),
        itemCount: 6,
        separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.sm),
        itemBuilder: (_, __) => const _ProjectCardSkeleton(),
      ),
      error: (error, _) {
        final message = error is ApiException
            ? error.message
            : 'Unable to load projects.';
        return EmptyState(
          title: 'Could not load projects',
          message: message,
          icon: Icons.error_outline,
        );
      },
      data: (projects) {
        if (projects.isEmpty) {
          return Center(
            child: Padding(
              padding: const EdgeInsets.all(AppSpacing.lg),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const EmptyState(
                    title: 'No projects yet',
                    message: 'Create your first project to start organizing tasks.',
                    icon: Icons.folder_open_outlined,
                  ),
                  const SizedBox(height: AppSpacing.lg),
                  PrimaryButton(
                    label: 'Create project',
                    onPressed: () => _openCreateProject(context, ref),
                  ),
                ],
              ),
            ),
          );
        }

        final canManage = canManageProjects(ref);
        final archivedAsync = ref.watch(archivedProjectsProvider);
        final archived = archivedAsync.valueOrNull ?? const <Project>[];

        return RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(projectsProvider);
            ref.invalidate(archivedProjectsProvider);
            await ref.read(projectsProvider.future);
          },
          child: ListView(
            padding: const EdgeInsets.fromLTRB(
                AppSpacing.md, AppSpacing.sm, AppSpacing.md, 88),
            children: [
              _CreateProjectBanner(
                onTap: () => _openCreateProject(context, ref),
              ),
              for (final project in projects) ...[
                const SizedBox(height: AppSpacing.sm),
                _PremiumProjectCard(
                  project: project,
                  isDark: isDark,
                  canManage: canManage,
                  onTap: () {
                    ref
                        .read(lastProjectIdProvider.notifier)
                        .setProjectId(project.id);
                    context.push(AppRoutes.projectBoard(project.id));
                  },
                  onEdit: () => showProjectSettingsSheet(
                    context: context,
                    ref: ref,
                    organizationId: orgId!,
                    project: project,
                  ),
                  onArchive: () => setProjectArchived(
                    context: context,
                    ref: ref,
                    organizationId: orgId!,
                    project: project,
                    archived: true,
                  ),
                  onDelete: () => confirmDeleteProject(
                    context: context,
                    ref: ref,
                    organizationId: orgId!,
                    project: project,
                  ),
                ),
              ],
              if (archived.isNotEmpty) ...[
                const SizedBox(height: AppSpacing.md),
                _ArchivedSection(
                  projects: archived,
                  canManage: canManage,
                  onUnarchive: (project) => setProjectArchived(
                    context: context,
                    ref: ref,
                    organizationId: orgId!,
                    project: project,
                    archived: false,
                  ),
                  onDelete: (project) => confirmDeleteProject(
                    context: context,
                    ref: ref,
                    organizationId: orgId!,
                    project: project,
                  ),
                ),
              ],
            ],
          ),
        );
      },
    );
  }
}

class _CreateProjectBanner extends StatelessWidget {
  const _CreateProjectBanner({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onTap,
        child: Ink(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: AppColors.primary.withValues(alpha: 0.45),
              width: 1.5,
            ),
            color: AppColors.primary.withValues(alpha: 0.06),
          ),
          child: Padding(
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.md,
              vertical: AppSpacing.md,
            ),
            child: Row(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [AppColors.primary, AppColors.primaryGradientEnd],
                    ),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.add_rounded, color: Colors.white),
                ),
                const SizedBox(width: AppSpacing.sm),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Create project',
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.w700,
                              color: AppColors.primary,
                            ),
                      ),
                      Text(
                        'Add a new project to this workspace',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: AppColors.textMuted,
                            ),
                      ),
                    ],
                  ),
                ),
                Icon(Icons.chevron_right_rounded, color: AppColors.primary.withValues(alpha: 0.7)),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _PremiumProjectCard extends StatelessWidget {
  const _PremiumProjectCard({
    required this.project,
    required this.isDark,
    required this.onTap,
    this.canManage = false,
    this.onEdit,
    this.onArchive,
    this.onDelete,
  });

  final Project project;
  final bool isDark;
  final VoidCallback onTap;
  final bool canManage;
  final VoidCallback? onEdit;
  final VoidCallback? onArchive;
  final VoidCallback? onDelete;

  @override
  Widget build(BuildContext context) {
    final description = stripHtmlToPlainText(project.description);
    final visibility = _visibilityMeta(project.visibility);
    final initial = project.name.trim().isEmpty
        ? '?'
        : project.name.characters.first.toUpperCase();

    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onTap,
        child: Ink(
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF1E293B) : AppColors.surface,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: isDark
                  ? Colors.white.withValues(alpha: 0.08)
                  : AppColors.border.withValues(alpha: 0.75),
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.05),
                blurRadius: 12,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Padding(
            padding: const EdgeInsets.all(AppSpacing.md),
            child: Row(
              children: [
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [
                        AppColors.primary.withValues(alpha: 0.85),
                        AppColors.violet.withValues(alpha: 0.9),
                      ],
                    ),
                    borderRadius: BorderRadius.circular(14),
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.primary.withValues(alpha: 0.25),
                        blurRadius: 8,
                        offset: const Offset(0, 3),
                      ),
                    ],
                  ),
                  alignment: Alignment.center,
                  child: Text(
                    initial,
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          color: Colors.white,
                          fontWeight: FontWeight.w700,
                        ),
                  ),
                ),
                const SizedBox(width: AppSpacing.sm),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        project.name,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.w700,
                            ),
                      ),
                      if (description.isNotEmpty) ...[
                        const SizedBox(height: 4),
                        Text(
                          description,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                height: 1.35,
                                color: AppColors.textMuted,
                              ),
                        ),
                      ],
                      const SizedBox(height: AppSpacing.sm),
                      _VisibilityPill(meta: visibility),
                    ],
                  ),
                ),
                const SizedBox(width: AppSpacing.xs),
                if (canManage)
                  _ProjectActionsMenu(
                    onOpen: onTap,
                    onEdit: onEdit,
                    onArchive: onArchive,
                    onDelete: onDelete,
                  )
                else
                  Icon(
                    Icons.chevron_right_rounded,
                    color: AppColors.textMuted.withValues(alpha: 0.7),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _ProjectActionsMenu extends StatelessWidget {
  const _ProjectActionsMenu({
    this.onOpen,
    this.onEdit,
    this.onArchive,
    this.onDelete,
  });

  final VoidCallback? onOpen;
  final VoidCallback? onEdit;
  final VoidCallback? onArchive;
  final VoidCallback? onDelete;

  @override
  Widget build(BuildContext context) {
    return PopupMenuButton<String>(
      icon: Icon(
        Icons.more_vert_rounded,
        color: AppColors.textMuted.withValues(alpha: 0.9),
      ),
      tooltip: 'Project actions',
      onSelected: (value) {
        switch (value) {
          case 'open':
            onOpen?.call();
          case 'edit':
            onEdit?.call();
          case 'archive':
            onArchive?.call();
          case 'delete':
            onDelete?.call();
        }
      },
      itemBuilder: (context) => [
        const PopupMenuItem(
          value: 'open',
          child: ListTile(
            contentPadding: EdgeInsets.zero,
            leading: Icon(Icons.open_in_new_rounded),
            title: Text('Open'),
          ),
        ),
        const PopupMenuItem(
          value: 'edit',
          child: ListTile(
            contentPadding: EdgeInsets.zero,
            leading: Icon(Icons.edit_outlined),
            title: Text('Edit'),
          ),
        ),
        const PopupMenuItem(
          value: 'archive',
          child: ListTile(
            contentPadding: EdgeInsets.zero,
            leading: Icon(Icons.archive_outlined),
            title: Text('Archive'),
          ),
        ),
        const PopupMenuItem(
          value: 'delete',
          child: ListTile(
            contentPadding: EdgeInsets.zero,
            leading: Icon(Icons.delete_outline_rounded, color: AppColors.danger),
            title: Text('Delete', style: TextStyle(color: AppColors.danger)),
          ),
        ),
      ],
    );
  }
}

class _ArchivedSection extends StatelessWidget {
  const _ArchivedSection({
    required this.projects,
    required this.canManage,
    required this.onUnarchive,
    required this.onDelete,
  });

  final List<Project> projects;
  final bool canManage;
  final ValueChanged<Project> onUnarchive;
  final ValueChanged<Project> onDelete;

  @override
  Widget build(BuildContext context) {
    return Theme(
      data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
      child: ExpansionTile(
        tilePadding: const EdgeInsets.symmetric(horizontal: AppSpacing.xs),
        childrenPadding: EdgeInsets.zero,
        leading: const Icon(Icons.inventory_2_outlined,
            color: AppColors.textMuted),
        title: Text(
          'Archived (${projects.length})',
          style: Theme.of(context)
              .textTheme
              .titleSmall
              ?.copyWith(color: AppColors.textSecondary),
        ),
        children: [
          for (final project in projects)
            ListTile(
              contentPadding:
                  const EdgeInsets.symmetric(horizontal: AppSpacing.xs),
              leading: const Icon(Icons.folder_off_outlined,
                  color: AppColors.textMuted),
              title: Text(
                project.name,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              trailing: canManage
                  ? Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        IconButton(
                          tooltip: 'Restore',
                          icon: const Icon(Icons.unarchive_outlined),
                          onPressed: () => onUnarchive(project),
                        ),
                        IconButton(
                          tooltip: 'Delete',
                          icon: const Icon(Icons.delete_outline_rounded,
                              color: AppColors.danger),
                          onPressed: () => onDelete(project),
                        ),
                      ],
                    )
                  : null,
            ),
        ],
      ),
    );
  }
}

class _VisibilityPill extends StatelessWidget {
  const _VisibilityPill({required this.meta});

  final _VisibilityMeta meta;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: meta.background,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(meta.icon, size: 12, color: meta.color),
          const SizedBox(width: 4),
          Text(
            meta.label,
            style: Theme.of(context).textTheme.labelMedium?.copyWith(
                  color: meta.color,
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                ),
          ),
        ],
      ),
    );
  }
}

class _ProjectCardSkeleton extends StatelessWidget {
  const _ProjectCardSkeleton();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: Theme.of(context).cardTheme.color,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border.withValues(alpha: 0.75)),
      ),
      child: const Row(
        children: [
          ShimmerBox(width: 48, height: 48, radius: 14),
          SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                ShimmerBox(width: 160, height: 18),
                SizedBox(height: AppSpacing.sm),
                ShimmerBox(height: 14),
                SizedBox(height: AppSpacing.sm),
                ShimmerBox(width: 72, height: 22, radius: 999),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _VisibilityMeta {
  const _VisibilityMeta({
    required this.label,
    required this.icon,
    required this.color,
    required this.background,
  });

  final String label;
  final IconData icon;
  final Color color;
  final Color background;
}

_VisibilityMeta _visibilityMeta(String visibility) {
  return switch (visibility.toLowerCase()) {
    'public' || 'team' => const _VisibilityMeta(
        label: 'Workspace',
        icon: Icons.public_rounded,
        color: AppColors.sky,
        background: Color(0xFFE0F2FE),
      ),
    'organization' || 'workspace' => const _VisibilityMeta(
        label: 'Workspace',
        icon: Icons.business_rounded,
        color: AppColors.violet,
        background: Color(0xFFEDE9FE),
      ),
    _ => const _VisibilityMeta(
        label: 'Private',
        icon: Icons.lock_rounded,
        color: AppColors.sky,
        background: Color(0xFFE0F2FE),
      ),
  };
}

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

        return RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(projectsProvider);
            await ref.read(projectsProvider.future);
          },
          child: ListView.separated(
            padding: const EdgeInsets.fromLTRB(AppSpacing.md, AppSpacing.sm, AppSpacing.md, 88),
            itemCount: projects.length,
            separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.sm),
            itemBuilder: (context, index) {
              final project = projects[index];
              return _PremiumProjectCard(
                project: project,
                isDark: isDark,
                onTap: () {
                  ref.read(lastProjectIdProvider.notifier).setProjectId(project.id);
                  context.push(AppRoutes.projectBoard(project.id));
                },
              );
            },
          ),
        );
      },
    );
  }
}

class _PremiumProjectCard extends ConsumerStatefulWidget {
  const _PremiumProjectCard({
    required this.project,
    required this.isDark,
    required this.onTap,
  });

  final Project project;
  final bool isDark;
  final VoidCallback onTap;

  @override
  ConsumerState<_PremiumProjectCard> createState() =>
      _PremiumProjectCardState();
}

class _PremiumProjectCardState extends ConsumerState<_PremiumProjectCard> {
  bool _deleting = false;

  Future<void> _confirmDelete(BuildContext context) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text('Delete project?'),
        content: Text(
          'This will permanently delete "${widget.project.name}" and all its tasks. '
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
    if (confirmed != true || !mounted) return;

    setState(() => _deleting = true);
    try {
      await ref
          .read(projectsRepositoryProvider)
          .deleteProject(projectId: widget.project.id);
      if (!mounted) return;
      ref.invalidate(projectsProvider);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            e is ApiException ? e.message : 'Failed to delete project.',
          ),
          backgroundColor: AppColors.danger,
        ),
      );
    } finally {
      if (mounted) setState(() => _deleting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final project = widget.project;
    final isDark = widget.isDark;
    final description = stripHtmlToPlainText(project.description);
    final visibility = _visibilityMeta(project.visibility);
    final initial = project.name.trim().isEmpty
        ? '?'
        : project.name.characters.first.toUpperCase();

    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: _deleting ? null : widget.onTap,
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
                if (_deleting)
                  const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                else
                  PopupMenuButton<String>(
                    icon: Icon(
                      Icons.more_vert_rounded,
                      color: AppColors.textMuted.withValues(alpha: 0.7),
                    ),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    onSelected: (value) {
                      if (value == 'delete') _confirmDelete(context);
                    },
                    itemBuilder: (_) => [
                      PopupMenuItem<String>(
                        value: 'delete',
                        child: Row(
                          children: [
                            Icon(Icons.delete_outline_rounded,
                                size: 18, color: AppColors.danger),
                            const SizedBox(width: 10),
                            Text(
                              'Delete project',
                              style: TextStyle(color: AppColors.danger),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
              ],
            ),
          ),
        ),
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

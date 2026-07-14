import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/preferences/app_preferences.dart';
import '../../core/router/app_router.dart';
import '../../core/theme/app_colors.dart';
import '../../data/models/project.dart';
import '../projects/projects_providers.dart';

const _projectSwatches = [
  (Color(0xFFEEF2FF), Color(0xFF312E81)),
  (Color(0xFFD1FAE5), Color(0xFF065F46)),
  (Color(0xFFFEF3C7), Color(0xFF92400E)),
  (Color(0xFFFFE4E6), Color(0xFF9F1239)),
  (Color(0xFFE0F2FE), Color(0xFF075985)),
  (Color(0xFFEDE9FE), Color(0xFF5B21B6)),
];

String projectInitials(String name) {
  final parts = name.trim().split(RegExp(r'\s+')).where((p) => p.isNotEmpty).toList();
  if (parts.length >= 2) {
    return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
  }
  final trimmed = name.trim();
  if (trimmed.length >= 2) return trimmed.substring(0, 2).toUpperCase();
  if (trimmed.isNotEmpty) return trimmed[0].toUpperCase();
  return '?';
}

(Color, Color) _projectSwatchColors(String id) {
  var hash = 0;
  for (final codeUnit in id.codeUnits) {
    hash = codeUnit + ((hash << 5) - hash);
  }
  return _projectSwatches[hash.abs() % _projectSwatches.length];
}

class ProjectThumb extends StatelessWidget {
  const ProjectThumb({
    super.key,
    required this.project,
    this.size = 22,
    this.radius = 8,
  });

  final Project project;
  final double size;
  final double radius;

  @override
  Widget build(BuildContext context) {
    final iconUrl = project.iconUrl?.trim();
    final (background, foreground) = _projectSwatchColors(project.id);

    if (iconUrl != null && iconUrl.isNotEmpty) {
      return ClipRRect(
        borderRadius: BorderRadius.circular(radius),
        child: Image.network(
          iconUrl,
          width: size,
          height: size,
          fit: BoxFit.cover,
          errorBuilder: (_, __, ___) => _InitialsThumb(
            initials: projectInitials(project.name),
            size: size,
            radius: radius,
            background: background,
            foreground: foreground,
          ),
        ),
      );
    }

    return _InitialsThumb(
      initials: projectInitials(project.name),
      size: size,
      radius: radius,
      background: background,
      foreground: foreground,
    );
  }
}

class _InitialsThumb extends StatelessWidget {
  const _InitialsThumb({
    required this.initials,
    required this.size,
    required this.radius,
    required this.background,
    required this.foreground,
  });

  final String initials;
  final double size;
  final double radius;
  final Color background;
  final Color foreground;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(radius),
        border: Border.all(color: AppColors.border.withValues(alpha: 0.7)),
      ),
      alignment: Alignment.center,
      child: Text(
        initials,
        style: TextStyle(
          color: foreground,
          fontSize: size * 0.34,
          fontWeight: FontWeight.w700,
          height: 1,
        ),
      ),
    );
  }
}

class ProjectSwitcher extends ConsumerWidget {
  const ProjectSwitcher({
    super.key,
    required this.selectedProjectId,
    this.taskCount,
    this.subtitle,
    this.showLabel = true,
  });

  final String selectedProjectId;
  final int? taskCount;
  final String? subtitle;
  final bool showLabel;

  Future<void> _openProjectMenu(
    BuildContext context,
    WidgetRef ref,
    List<Project> projects,
    Project? selected,
  ) async {
    if (projects.isEmpty) return;

    final box = context.findRenderObject() as RenderBox?;
    if (box == null || !context.mounted) return;

    final offset = box.localToGlobal(Offset.zero);
    final size = box.size;
    final selectedId = await showMenu<String>(
      context: context,
      elevation: 8,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      color: Theme.of(context).colorScheme.surface,
      constraints: BoxConstraints(
        minWidth: size.width.clamp(240, 380),
        maxWidth: 380,
      ),
      position: RelativeRect.fromLTRB(
        offset.dx,
        offset.dy + size.height + 6,
        offset.dx + size.width,
        offset.dy + size.height + 6,
      ),
      items: projects.map((project) {
        final isSelected = project.id == selected?.id;
        return PopupMenuItem<String>(
          value: project.id,
          padding: EdgeInsets.zero,
          child: Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            decoration: BoxDecoration(
              color: isSelected ? AppColors.primary : null,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Row(
              children: [
                if (isSelected) ...[
                  const Icon(Icons.check_rounded, size: 16, color: Colors.white),
                  const SizedBox(width: 8),
                ] else
                  const SizedBox(width: 24),
                ProjectThumb(project: project, size: 24, radius: 8),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    project.name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: isSelected ? Colors.white : AppColors.textPrimary,
                          fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                        ),
                  ),
                ),
              ],
            ),
          ),
        );
      }).toList(),
    );

    if (selectedId == null || selectedId == selectedProjectId || !context.mounted) {
      return;
    }

    ref.read(lastProjectIdProvider.notifier).setProjectId(selectedId);
    context.pushReplacement(AppRoutes.projectBoard(selectedId));
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final projectsAsync = ref.watch(projectsProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return projectsAsync.when(
      loading: () => _ProjectSwitcherTrigger(
        showLabel: showLabel,
        subtitle: subtitle,
        enabled: false,
        child: Row(
          children: [
            const SizedBox(
              width: 22,
              height: 22,
              child: CircularProgressIndicator(strokeWidth: 2),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                'Loading projects…',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
              ),
            ),
          ],
        ),
      ),
      error: (_, __) => _ProjectSwitcherTrigger(
        showLabel: showLabel,
        subtitle: subtitle,
        enabled: false,
        child: Text(
          'Project',
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontSize: 18,
                fontWeight: FontWeight.w700,
              ),
        ),
      ),
      data: (projects) {
        final activeProjects =
            projects.where((project) => !project.isArchived).toList();
        Project? selected;
        for (final project in activeProjects) {
          if (project.id == selectedProjectId) {
            selected = project;
            break;
          }
        }

        return _ProjectSwitcherTrigger(
          showLabel: showLabel,
          subtitle: subtitle,
          enabled: activeProjects.length > 1,
          onTap: activeProjects.length <= 1
              ? null
              : () => _openProjectMenu(context, ref, activeProjects, selected),
          child: Row(
            children: [
              if (selected != null)
                ProjectThumb(project: selected)
              else
                Icon(Icons.folder_open_rounded, size: 20, color: AppColors.textMuted),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  selected?.name ?? 'Select project',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                ),
              ),
              if (taskCount != null) ...[
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                  decoration: BoxDecoration(
                    color: isDark
                        ? Colors.white.withValues(alpha: 0.08)
                        : AppColors.border.withValues(alpha: 0.55),
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Text(
                    '$taskCount',
                    style: Theme.of(context).textTheme.labelSmall?.copyWith(
                          fontWeight: FontWeight.w600,
                          fontFeatures: const [FontFeature.tabularFigures()],
                        ),
                  ),
                ),
                const SizedBox(width: 6),
              ],
              Icon(
                Icons.keyboard_arrow_down_rounded,
                size: 20,
                color: AppColors.textMuted.withValues(alpha: 0.85),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _ProjectSwitcherTrigger extends StatelessWidget {
  const _ProjectSwitcherTrigger({
    required this.child,
    required this.showLabel,
    this.subtitle,
    this.enabled = true,
    this.onTap,
  });

  final Widget child;
  final bool showLabel;
  final String? subtitle;
  final bool enabled;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (showLabel) ...[
          Text(
            'PROJECT',
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
                  letterSpacing: 1.2,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textMuted,
                ),
          ),
          const SizedBox(height: 6),
        ],
        Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: enabled ? onTap : null,
            borderRadius: BorderRadius.circular(14),
            child: Ink(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF111827) : AppColors.surface,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(
                  color: isDark
                      ? Colors.white.withValues(alpha: 0.1)
                      : AppColors.border.withValues(alpha: 0.85),
                ),
                boxShadow: [
                  if (!isDark)
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.04),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                ],
              ),
              child: child,
            ),
          ),
        ),
        if (subtitle != null) ...[
          const SizedBox(height: 6),
          Text(
            subtitle!,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  fontSize: 13,
                  color: AppColors.textMuted,
                ),
          ),
        ],
      ],
    );
  }
}

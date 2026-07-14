import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/preferences/app_preferences.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../data/models/project.dart';
import '../../shared/widgets/app_widgets.dart';
import '../kanban/project_board_screen.dart';
import '../kanban/project_switcher.dart';
import '../projects/projects_providers.dart';
import 'my_work_providers.dart';

class MyWorkScreen extends ConsumerWidget {
  const MyWorkScreen({
    super.key,
    this.initialFilter = MyWorkFilter.open,
    this.embedded = false,
  });

  /// Kept for Home quick-links compatibility; filters are no longer shown.
  final MyWorkFilter initialFilter;

  /// When true, renders without its own [Scaffold]/[AppBar] (for shell tabs).
  final bool embedded;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final projectsAsync = ref.watch(projectsProvider);
    final projects = (projectsAsync.valueOrNull ?? const [])
        .where((p) => !p.isArchived)
        .toList();
    final selectedProjectId = ref.watch(tasksSelectedProjectIdProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final body = Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _ProjectPicker(
          projects: projects,
          selectedProjectId: selectedProjectId,
          loading: projectsAsync.isLoading,
          onSelected: (projectId) {
            ref.read(tasksProjectIdProvider.notifier).state = projectId;
            ref.read(lastProjectIdProvider.notifier).setProjectId(projectId);
          },
        ),
        Expanded(
          child: ColoredBox(
            color: isDark ? const Color(0xFF0B1220) : const Color(0xFFF1F5F9),
            child: projects.isEmpty && !projectsAsync.isLoading
                ? const EmptyState(
                    icon: Icons.folder_off_outlined,
                    title: 'No projects',
                    message:
                        'Create a project first, then open its board here.',
                  )
                : selectedProjectId == null
                    ? const Center(child: CircularProgressIndicator())
                    : ProjectBoardScreen(
                        key: ValueKey('tasks-board-$selectedProjectId'),
                        projectId: selectedProjectId,
                        embedded: true,
                      ),
          ),
        ),
      ],
    );

    if (embedded) return body;

    return Scaffold(
      appBar: AppBar(title: const Text('Tasks')),
      body: body,
    );
  }
}

class _ProjectPicker extends StatelessWidget {
  const _ProjectPicker({
    required this.projects,
    required this.selectedProjectId,
    required this.loading,
    required this.onSelected,
  });

  final List<Project> projects;
  final String? selectedProjectId;
  final bool loading;
  final ValueChanged<String> onSelected;

  @override
  Widget build(BuildContext context) {
    if (loading && projects.isEmpty) {
      return const Padding(
        padding: EdgeInsets.all(AppSpacing.md),
        child: LinearProgressIndicator(),
      );
    }
    if (projects.isEmpty) return const SizedBox.shrink();

    final effectiveId = selectedProjectId != null &&
            projects.any((p) => p.id == selectedProjectId)
        ? selectedProjectId!
        : projects.first.id;
    final selected =
        projects.firstWhere((p) => p.id == effectiveId, orElse: () => projects.first);

    return Material(
      color: Theme.of(context).colorScheme.surface,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(
          AppSpacing.md,
          AppSpacing.sm,
          AppSpacing.md,
          AppSpacing.sm,
        ),
        child: DropdownButtonFormField<String>(
          key: ValueKey('project-picker-$effectiveId'),
          initialValue: effectiveId,
          isExpanded: true,
          borderRadius: BorderRadius.circular(14),
          decoration: InputDecoration(
            labelText: 'Project',
            filled: true,
            fillColor: Theme.of(context).brightness == Brightness.dark
                ? const Color(0xFF1E293B)
                : const Color(0xFFF8FAFC),
            contentPadding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.sm,
              vertical: AppSpacing.sm,
            ),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: BorderSide(color: AppColors.border.withValues(alpha: 0.7)),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: BorderSide(color: AppColors.border.withValues(alpha: 0.7)),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: const BorderSide(color: AppColors.primary, width: 1.4),
            ),
          ),
          selectedItemBuilder: (context) {
            return [
              for (final project in projects)
                Row(
                  children: [
                    ProjectThumb(project: project, size: 28, radius: 8),
                    const SizedBox(width: AppSpacing.sm),
                    Expanded(
                      child: Text(
                        project.name,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.titleSmall?.copyWith(
                              fontWeight: FontWeight.w600,
                            ),
                      ),
                    ),
                  ],
                ),
            ];
          },
          items: [
            for (final project in projects)
              DropdownMenuItem(
                value: project.id,
                child: Row(
                  children: [
                    ProjectThumb(project: project, size: 26, radius: 7),
                    const SizedBox(width: AppSpacing.sm),
                    Expanded(
                      child: Text(
                        project.name,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    if (project.id == selected.id)
                      const Icon(Icons.check_rounded,
                          size: 18, color: AppColors.primary),
                  ],
                ),
              ),
          ],
          onChanged: (value) {
            if (value == null || value.isEmpty) return;
            onSelected(value);
          },
        ),
      ),
    );
  }
}

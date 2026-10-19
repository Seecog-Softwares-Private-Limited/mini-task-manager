import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/preferences/app_preferences.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../data/models/project.dart';
import '../../shared/widgets/app_widgets.dart';
import '../../shared/widgets/workspace_avatar.dart';
import '../auth/session_controller.dart';
import '../kanban/kanban_providers.dart';
import '../kanban/project_board_screen.dart';
import '../kanban/project_switcher.dart';
import '../projects/projects_providers.dart';
import '../recurring/recurring_providers.dart';
import '../recurring/recurring_screen.dart';
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
    final contentTab = ref.watch(tasksContentTabProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final body = Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _TasksFilterBar(
          projects: projects,
          selectedProjectId: selectedProjectId,
          loading: projectsAsync.isLoading,
          onProjectSelected: (projectId) {
            ref.read(tasksProjectIdProvider.notifier).state = projectId;
            if (!isAllProjectsSelection(projectId)) {
              ref.read(lastProjectIdProvider.notifier).setProjectId(projectId);
              ref.read(recurringProjectIdProvider.notifier).state = projectId;
              ref.invalidate(recurringSummaryProvider);
              ref.invalidate(recurringTemplatesProvider);
              ref.invalidate(recurringBoardTasksProvider);
            }
            ref.read(tasksMemberFilterProvider.notifier).state = null;
          },
        ),
        const _TasksContentTabBar(),
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
                    : switch (contentTab) {
                        TasksContentTab.tasks => ProjectBoardScreen(
                            key: ValueKey('tasks-board-$selectedProjectId'),
                            projectId: selectedProjectId,
                            embedded: true,
                          ),
                        TasksContentTab.recurring => const RecurringScreen(
                            key: ValueKey('tasks-recurring'),
                            hideProjectDropdown: true,
                          ),
                        TasksContentTab.notes => const EmptyState(
                            icon: Icons.sticky_note_2_outlined,
                            title: 'Notes',
                            message: 'Coming soon.',
                          ),
                      },
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

class _TasksContentTabBar extends ConsumerWidget {
  const _TasksContentTabBar();

  static const _tabs = <(TasksContentTab, String)>[
    (TasksContentTab.tasks, 'Tasks'),
    (TasksContentTab.recurring, 'Recurring'),
    (TasksContentTab.notes, 'Notes'),
  ];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final selected = ref.watch(tasksContentTabProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final trackColor =
        isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9);

    return Material(
      color: Theme.of(context).colorScheme.surface,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(
          AppSpacing.md,
          0,
          AppSpacing.md,
          AppSpacing.sm,
        ),
        child: DecoratedBox(
          decoration: BoxDecoration(
            color: trackColor,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Padding(
            padding: const EdgeInsets.all(3),
            child: Row(
              children: [
                for (final (tab, label) in _tabs)
                  Expanded(
                    child: _TasksContentTabChip(
                      label: label,
                      selected: selected == tab,
                      onTap: () {
                        if (selected == tab) return;
                        HapticFeedback.selectionClick();
                        ref.read(tasksContentTabProvider.notifier).state = tab;
                        if (tab == TasksContentTab.recurring) {
                          final projectId =
                              ref.read(tasksSelectedProjectIdProvider);
                          if (projectId != null &&
                              !isAllProjectsSelection(projectId)) {
                            ref
                                .read(recurringProjectIdProvider.notifier)
                                .state = projectId;
                          }
                          ref.invalidate(recurringBoardTasksProvider);
                          ref.invalidate(recurringSummaryProvider);
                          ref.invalidate(recurringTemplatesProvider);
                        } else if (selected == TasksContentTab.recurring) {
                          ref.read(recurringFabHiddenProvider.notifier).state =
                              false;
                        }
                      },
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _TasksContentTabChip extends StatelessWidget {
  const _TasksContentTabChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: selected ? AppColors.primary : Colors.transparent,
      borderRadius: BorderRadius.circular(10),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(10),
        child: SizedBox(
          height: 36,
          child: Center(
            child: Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: Theme.of(context).textTheme.labelMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                    color: selected ? Colors.white : AppColors.textMuted,
                  ),
            ),
          ),
        ),
      ),
    );
  }
}

class _TasksFilterBar extends ConsumerWidget {
  const _TasksFilterBar({
    required this.projects,
    required this.selectedProjectId,
    required this.loading,
    required this.onProjectSelected,
  });

  final List<Project> projects;
  final String? selectedProjectId;
  final bool loading;
  final ValueChanged<String> onProjectSelected;

  Future<void> _refresh(WidgetRef ref) async {
    HapticFeedback.selectionClick();
    final id = selectedProjectId;
    if (id != null && id.isNotEmpty) {
      ref.invalidate(projectBoardProvider(id));
    }
    ref.invalidate(projectsProvider);
    final tab = ref.read(tasksContentTabProvider);
    if (tab == TasksContentTab.recurring) {
      ref.invalidate(recurringSummaryProvider);
      ref.invalidate(recurringTemplatesProvider);
      ref.invalidate(recurringBoardTasksProvider);
    }
    if (id != null && id.isNotEmpty) {
      try {
        await ref.read(projectBoardProvider(id).future);
      } catch (_) {
        // Board may be unavailable for the current selection; still refreshed providers.
      }
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (loading && projects.isEmpty) {
      return const Padding(
        padding: EdgeInsets.all(AppSpacing.md),
        child: LinearProgressIndicator(),
      );
    }
    if (projects.isEmpty) return const SizedBox.shrink();

    final allProjects = isAllProjectsSelection(selectedProjectId);
    final effectiveId = allProjects
        ? kAllProjectsId
        : (selectedProjectId != null &&
                projects.any((p) => p.id == selectedProjectId)
            ? selectedProjectId!
            : projects.first.id);
    final boardFilters = ref.watch(tasksBoardFiltersProvider);
    final session = ref.watch(sessionControllerProvider);
    final organizations = session.organizations;
    final selectedOrgId = session.orgId;
    final effectiveOrgId =
        (selectedOrgId != null &&
                selectedOrgId.isNotEmpty &&
                organizations.any((o) => o.id == selectedOrgId))
            ? selectedOrgId!
            : (organizations.isNotEmpty ? organizations.first.id : '');

    const fieldHeight = 48.0;
    final labelStyle = Theme.of(context).textTheme.labelMedium?.copyWith(
          color: AppColors.textMuted,
          fontWeight: FontWeight.w600,
        );

    return Material(
      color: Theme.of(context).colorScheme.surface,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(
          AppSpacing.md,
          AppSpacing.sm,
          AppSpacing.md,
          AppSpacing.sm,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Labels + compact refresh on one text-height row (no extra strip).
            // Order: Select Workspace | Select Project | refresh.
            Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                Expanded(
                    child: Text('Select Workspace', style: labelStyle)),
                const SizedBox(width: AppSpacing.sm),
                Expanded(child: Text('Select Project', style: labelStyle)),
                const SizedBox(width: AppSpacing.sm),
                SizedBox(
                  width: fieldHeight,
                  child: Align(
                    alignment: Alignment.center,
                    child: Tooltip(
                      message: 'Refresh',
                      child: InkWell(
                        onTap: () => _refresh(ref),
                        borderRadius: BorderRadius.circular(4),
                        child: const Padding(
                          padding: EdgeInsets.all(2),
                          child: Icon(
                            Icons.refresh_rounded,
                            size: 16,
                            color: AppColors.textMuted,
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                // Slot 1 (was Project → briefly Members → now Workspace).
                Expanded(
                  child: SizedBox(
                    height: fieldHeight,
                    child: organizations.isEmpty
                        ? InputDecorator(
                            decoration: const InputDecoration(
                              isDense: true,
                              contentPadding: EdgeInsets.symmetric(
                                horizontal: 12,
                                vertical: 12,
                              ),
                              border: OutlineInputBorder(),
                            ),
                            child: Text(
                              'Select Workspace',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: Theme.of(context)
                                  .textTheme
                                  .bodyMedium
                                  ?.copyWith(
                                    fontWeight: FontWeight.w600,
                                    color: AppColors.textMuted,
                                  ),
                            ),
                          )
                        : _CompactDropdown<String>(
                            debugLabel: 'workspace',
                            value: effectiveOrgId,
                            items: [
                              for (final org in organizations)
                                DropdownMenuItem(
                                  value: org.id,
                                  child: Row(
                                    children: [
                                      WorkspaceAvatar(
                                        logoUrl: org.logoUrl,
                                        name: org.name,
                                        size: 22,
                                        borderRadius: 6,
                                      ),
                                      const SizedBox(width: 8),
                                      Expanded(
                                        child: Text(
                                          org.name,
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                            ],
                            selectedBuilder: (context) {
                              final org = organizations.firstWhere(
                                (o) => o.id == effectiveOrgId,
                                orElse: () => organizations.first,
                              );
                              return Row(
                                children: [
                                  WorkspaceAvatar(
                                    logoUrl: org.logoUrl,
                                    name: org.name,
                                    size: 22,
                                    borderRadius: 6,
                                  ),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Text(
                                      org.name,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: Theme.of(context)
                                          .textTheme
                                          .bodyMedium
                                          ?.copyWith(
                                              fontWeight: FontWeight.w600),
                                    ),
                                  ),
                                ],
                              );
                            },
                            onChanged: (value) async {
                              if (value == null || value.isEmpty) return;
                              final current =
                                  ref.read(sessionControllerProvider).orgId;
                              if (value == current) return;
                              await ref
                                  .read(sessionControllerProvider.notifier)
                                  .selectOrganization(value);
                              ref.invalidate(projectsProvider);
                              ref
                                  .read(tasksProjectIdProvider.notifier)
                                  .state = null;
                              ref
                                  .read(tasksMemberFilterProvider.notifier)
                                  .state = null;
                              ref
                                  .read(recurringProjectIdProvider.notifier)
                                  .state = null;
                              ref.invalidate(recurringSummaryProvider);
                              ref.invalidate(recurringTemplatesProvider);
                              ref.invalidate(recurringBoardTasksProvider);
                            },
                          ),
                  ),
                ),
                const SizedBox(width: AppSpacing.sm),
                // Slot 2 (was Members → now Project after the swap).
                Expanded(
                  child: SizedBox(
                    height: fieldHeight,
                    child: _CompactDropdown<String>(
                      debugLabel: 'project',
                      value: effectiveId,
                      items: [
                        DropdownMenuItem(
                          value: kAllProjectsId,
                          child: Row(
                            children: [
                              Container(
                                width: 22,
                                height: 22,
                                decoration: BoxDecoration(
                                  borderRadius: BorderRadius.circular(6),
                                  color: AppColors.primary
                                      .withValues(alpha: 0.12),
                                ),
                                alignment: Alignment.center,
                                child: const Icon(
                                  Icons.apps_rounded,
                                  size: 14,
                                  color: AppColors.primary,
                                ),
                              ),
                              const SizedBox(width: 8),
                              const Expanded(
                                child: Text(
                                  'All projects',
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                          ),
                        ),
                        for (final project in projects)
                          DropdownMenuItem(
                            value: project.id,
                            child: Row(
                              children: [
                                ProjectThumb(
                                    project: project, size: 22, radius: 6),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    project.name,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                              ],
                            ),
                          ),
                      ],
                      selectedBuilder: (context) {
                        if (isAllProjectsSelection(effectiveId)) {
                          return Row(
                            children: [
                              Container(
                                width: 22,
                                height: 22,
                                decoration: BoxDecoration(
                                  borderRadius: BorderRadius.circular(6),
                                  color: AppColors.primary
                                      .withValues(alpha: 0.12),
                                ),
                                alignment: Alignment.center,
                                child: const Icon(
                                  Icons.apps_rounded,
                                  size: 14,
                                  color: AppColors.primary,
                                ),
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  'All projects',
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: Theme.of(context)
                                      .textTheme
                                      .bodyMedium
                                      ?.copyWith(fontWeight: FontWeight.w600),
                                ),
                              ),
                            ],
                          );
                        }
                        final project = projects.firstWhere(
                          (p) => p.id == effectiveId,
                          orElse: () => projects.first,
                        );
                        return Row(
                          children: [
                            ProjectThumb(
                                project: project, size: 22, radius: 6),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                project.name,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: Theme.of(context)
                                    .textTheme
                                    .bodyMedium
                                    ?.copyWith(fontWeight: FontWeight.w600),
                              ),
                            ),
                          ],
                        );
                      },
                      onChanged: (value) {
                        if (value == null || value.isEmpty) return;
                        onProjectSelected(value);
                      },
                    ),
                  ),
                ),
                const SizedBox(width: AppSpacing.sm),
                SizedBox(
                  height: fieldHeight,
                  width: fieldHeight,
                  child: Badge(
                    isLabelVisible: boardFilters.isActive,
                    label: Text('${boardFilters.activeCount}'),
                    child: IconButton.filledTonal(
                      tooltip: 'Filters',
                      onPressed: () => _openFiltersSheet(context, ref),
                      style: IconButton.styleFrom(
                        backgroundColor: boardFilters.isActive
                            ? AppColors.primary.withValues(alpha: 0.14)
                            : Theme.of(context).brightness == Brightness.dark
                                ? const Color(0xFF1E293B)
                                : const Color(0xFFF8FAFC),
                        foregroundColor: boardFilters.isActive
                            ? AppColors.primary
                            : AppColors.textMuted,
                        side: BorderSide(
                          color: boardFilters.isActive
                              ? AppColors.primary.withValues(alpha: 0.45)
                              : AppColors.border.withValues(alpha: 0.7),
                        ),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                        fixedSize: const Size(fieldHeight, fieldHeight),
                        padding: EdgeInsets.zero,
                      ),
                      icon: const Icon(Icons.tune_rounded, size: 22),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _openFiltersSheet(BuildContext context, WidgetRef ref) async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      showDragHandle: true,
      builder: (sheetContext) {
        return Consumer(
          builder: (context, ref, _) {
            final filters = ref.watch(tasksBoardFiltersProvider);
            return Padding(
              padding: EdgeInsets.fromLTRB(
                AppSpacing.lg,
                0,
                AppSpacing.lg,
                MediaQuery.paddingOf(context).bottom + AppSpacing.lg,
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    children: [
                      Text(
                        'Filters',
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                              fontWeight: FontWeight.w700,
                            ),
                      ),
                      const Spacer(),
                      if (filters.isActive)
                        TextButton(
                          onPressed: () {
                            ref.read(tasksBoardFiltersProvider.notifier).state =
                                TasksBoardFilters.empty;
                          },
                          child: const Text('Clear'),
                        ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  Text(
                    'Priority',
                    style: Theme.of(context).textTheme.labelLarge?.copyWith(
                          color: AppColors.textMuted,
                          fontWeight: FontWeight.w600,
                        ),
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      for (final entry in const [
                        ('low', 'Low'),
                        ('medium', 'Medium'),
                        ('high', 'High'),
                        ('critical', 'Critical'),
                      ])
                        FilterChip(
                          label: Text(entry.$2),
                          selected: filters.priorities.contains(entry.$1),
                          onSelected: (selected) {
                            final next = {...filters.priorities};
                            if (selected) {
                              next.add(entry.$1);
                            } else {
                              next.remove(entry.$1);
                            }
                            ref.read(tasksBoardFiltersProvider.notifier).state =
                                filters.copyWith(priorities: next);
                          },
                        ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.md),
                  SwitchListTile.adaptive(
                    contentPadding: EdgeInsets.zero,
                    title: const Text('Overdue only'),
                    value: filters.overdueOnly,
                    onChanged: (value) {
                      ref.read(tasksBoardFiltersProvider.notifier).state =
                          filters.copyWith(overdueOnly: value);
                    },
                  ),
                  SwitchListTile.adaptive(
                    contentPadding: EdgeInsets.zero,
                    title: const Text('Assigned to me'),
                    value: filters.assignedToMe,
                    onChanged: (value) {
                      ref.read(tasksBoardFiltersProvider.notifier).state =
                          filters.copyWith(
                        assignedToMe: value,
                        unassignedOnly: value ? false : filters.unassignedOnly,
                      );
                    },
                  ),
                  SwitchListTile.adaptive(
                    contentPadding: EdgeInsets.zero,
                    title: const Text('Unassigned'),
                    value: filters.unassignedOnly,
                    onChanged: (value) {
                      ref.read(tasksBoardFiltersProvider.notifier).state =
                          filters.copyWith(
                        unassignedOnly: value,
                        assignedToMe: value ? false : filters.assignedToMe,
                      );
                    },
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  FilledButton(
                    onPressed: () => Navigator.of(sheetContext).pop(),
                    child: const Text('Done'),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }
}

class _CompactDropdown<T> extends StatelessWidget {
  const _CompactDropdown({
    required this.value,
    required this.items,
    required this.onChanged,
    required this.selectedBuilder,
    this.debugLabel = 'dropdown',
  });

  final String debugLabel;
  final T value;
  final List<DropdownMenuItem<T>> items;
  final ValueChanged<T?> onChanged;
  final WidgetBuilder selectedBuilder;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return DropdownButtonFormField<T>(
      key: ValueKey('$debugLabel-$value'),
      initialValue: value,
      isExpanded: true,
      isDense: true,
      borderRadius: BorderRadius.circular(14),
      icon: const Icon(Icons.keyboard_arrow_down_rounded, size: 20),
      decoration: InputDecoration(
        filled: true,
        fillColor: isDark ? const Color(0xFF1E293B) : const Color(0xFFF8FAFC),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.sm,
          vertical: 12,
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
      selectedItemBuilder: (context) => [
        for (final _ in items) selectedBuilder(context),
      ],
      items: items,
      onChanged: onChanged,
    );
  }
}

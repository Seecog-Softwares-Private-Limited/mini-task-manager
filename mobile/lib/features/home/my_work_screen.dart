import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/preferences/app_preferences.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../data/models/login_response.dart';
import '../../data/models/project.dart';
import '../../data/models/project_member.dart';
import '../../shared/widgets/app_widgets.dart';
import '../../shared/widgets/user_avatar.dart';
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
        _TasksFilterBar(
          projects: projects,
          selectedProjectId: selectedProjectId,
          loading: projectsAsync.isLoading,
          onProjectSelected: (projectId) {
            ref.read(tasksProjectIdProvider.notifier).state = projectId;
            ref.read(lastProjectIdProvider.notifier).setProjectId(projectId);
            ref.read(tasksMemberFilterProvider.notifier).state = null;
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

  @override
  Widget build(BuildContext context, WidgetRef ref) {
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
    final memberId = ref.watch(tasksMemberFilterProvider);
    final boardFilters = ref.watch(tasksBoardFiltersProvider);
    final membersAsync = ref.watch(projectMembersForTasksProvider(effectiveId));
    final members = membersAsync.valueOrNull ?? const <ProjectMember>[];

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
            Row(
              children: [
                Expanded(child: Text('Project', style: labelStyle)),
                const SizedBox(width: AppSpacing.sm),
                Expanded(child: Text('Members', style: labelStyle)),
                const SizedBox(width: AppSpacing.sm),
                const SizedBox(width: fieldHeight),
              ],
            ),
            const SizedBox(height: 6),
            Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                Expanded(
                  child: SizedBox(
                    height: fieldHeight,
                    child: _CompactDropdown<String>(
                      debugLabel: 'project',
                      value: effectiveId,
                      items: [
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
                Expanded(
                  child: SizedBox(
                    height: fieldHeight,
                    child: _CompactDropdown<String>(
                      debugLabel: 'members',
                      value: memberId ?? '',
                      items: [
                        const DropdownMenuItem(
                          value: '',
                          child: Text('All members'),
                        ),
                        for (final member in members)
                          DropdownMenuItem(
                            value: member.userId,
                            child: Row(
                              children: [
                                UserAvatar(
                                  user: AuthUser(
                                    id: member.userId,
                                    email: member.user?.email ?? '',
                                    fullName: member.user?.fullName ??
                                        member.user?.email ??
                                        'Member',
                                    avatarUrl: member.user?.avatarUrl,
                                  ),
                                  size: 22,
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    member.user?.fullName ??
                                        member.user?.email ??
                                        'Member',
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                              ],
                            ),
                          ),
                      ],
                      selectedBuilder: (context) {
                        if (memberId == null || memberId.isEmpty) {
                          return Text(
                            'All members',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: Theme.of(context)
                                .textTheme
                                .bodyMedium
                                ?.copyWith(fontWeight: FontWeight.w600),
                          );
                        }
                        ProjectMember? selected;
                        for (final m in members) {
                          if (m.userId == memberId) {
                            selected = m;
                            break;
                          }
                        }
                        final name = selected?.user?.fullName ??
                            selected?.user?.email ??
                            'Member';
                        return Row(
                          children: [
                            if (selected != null)
                              UserAvatar(
                                user: AuthUser(
                                  id: selected.userId,
                                  email: selected.user?.email ?? '',
                                  fullName: name,
                                  avatarUrl: selected.user?.avatarUrl,
                                ),
                                size: 22,
                              ),
                            if (selected != null) const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                name,
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
                        ref.read(tasksMemberFilterProvider.notifier).state =
                            (value == null || value.isEmpty) ? null : value;
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

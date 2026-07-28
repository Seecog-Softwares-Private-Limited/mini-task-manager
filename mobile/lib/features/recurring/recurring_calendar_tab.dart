import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:table_calendar/table_calendar.dart';

import '../../core/api/api_exception.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../data/models/recurring.dart';
import '../../data/models/subtask_completion_record.dart';
import '../../data/models/task.dart';
import '../../data/models/workflow.dart';
import '../../shared/widgets/app_widgets.dart';
import '../auth/session_controller.dart';
import '../kanban/kanban_providers.dart';
import '../kanban/task_detail_sheet.dart';
import '../projects/projects_providers.dart';
import 'recurring_providers.dart';
import 'subtask_note_sheet.dart';

/// How far ahead we project upcoming (not-yet-materialized) recurring runs.
const int _projectionHorizonDays = 120;

/// Status of a recurring run (or an aggregate day) used to color the calendar.
enum _RunStatus { done, overdue, today, upcoming }

/// A future recurring run projected from a template's cadence. These are not
/// real tasks yet (no checklist), so they render as read-only "upcoming" rows.
class _ProjectedRun {
  const _ProjectedRun({
    required this.templateId,
    required this.title,
    required this.priority,
    required this.dueDate,
    required this.repeatType,
  });

  final String templateId;
  final String title;
  final String priority;
  final DateTime dueDate;
  final String repeatType;
}

Color _runColor(_RunStatus status) => switch (status) {
      _RunStatus.done => AppColors.success,
      _RunStatus.overdue => AppColors.danger,
      _RunStatus.today => AppColors.primary,
      _RunStatus.upcoming => AppColors.violet,
    };

/// Mirrors the kanban priority palette for the run-card accent stripe.
Color _priorityColor(String priority) => switch (priority.toUpperCase()) {
      'URGENT' || 'CRITICAL' => AppColors.danger,
      'HIGH' => AppColors.warning,
      'LOW' => AppColors.textMuted,
      _ => AppColors.sky,
    };

String _cadenceLabel(String repeatType) => switch (repeatType.toUpperCase()) {
      'DAILY' => 'Repeats daily',
      'WEEKLY' => 'Repeats weekly',
      'BIWEEKLY' => 'Repeats biweekly',
      'MONTHLY' => 'Repeats monthly',
      'YEARLY' => 'Repeats yearly',
      _ => 'Recurring',
    };

/// JS/backend day index: 0=Sun … 6=Sat. Dart weekday is 1=Mon … 7=Sun.
int _jsWeekday(DateTime d) => d.weekday % 7;

/// Advances a projected due date using template cadence (honors weeklyDays).
DateTime? _nextProjectedDue(DateTime from, RecurringTemplate tpl) {
  final repeat = tpl.repeatType.toUpperCase();
  final interval = (tpl.interval ?? 1).clamp(1, 999);
  if (repeat == 'WEEKLY') {
    final weeklyDays = tpl.weeklyDays;
    final startParsed = DateTime.tryParse(tpl.startDueDate ?? '');
    final start = startParsed == null
        ? DateTime(from.year, from.month, from.day)
        : DateTime(startParsed.year, startParsed.month, startParsed.day);
    for (var i = 1; i <= 400; i++) {
      final candidate = from.add(Duration(days: i));
      final day = _jsWeekday(candidate);
      if (weeklyDays.isNotEmpty && !weeklyDays.contains(day)) continue;
      if (weeklyDays.isEmpty && day != _jsWeekday(start)) continue;
      final weekDiff = candidate.difference(start).inDays ~/ 7;
      if (weekDiff < 0) continue;
      if (weekDiff % interval == 0) {
        return DateTime(candidate.year, candidate.month, candidate.day);
      }
    }
    return DateTime(from.year, from.month, from.day)
        .add(Duration(days: 7 * interval));
  }

  return switch (repeat) {
    'DAILY' => from.add(Duration(days: interval)),
    'BIWEEKLY' => from.add(const Duration(days: 14)),
    'MONTHLY' => DateTime(from.year, from.month + interval, from.day),
    'YEARLY' => DateTime(from.year + interval, from.month, from.day),
    _ => null,
  };
}

bool _isTaskDone(Task task, Set<String> doneStatusIds) =>
    task.statusId != null && doneStatusIds.contains(task.statusId);

/// Per-run status. When [statusesLoaded] is false we avoid claiming done/overdue.
_RunStatus _taskRunStatus(
  Task task,
  Set<String> doneStatusIds,
  DateTime today, {
  required bool statusesLoaded,
}) {
  if (statusesLoaded && _isTaskDone(task, doneStatusIds)) {
    return _RunStatus.done;
  }
  final parsed = task.dueDate == null ? null : DateTime.tryParse(task.dueDate!);
  if (parsed == null) return _RunStatus.upcoming;
  final dueDay = DateTime(parsed.year, parsed.month, parsed.day);
  if (dueDay.isAtSameMomentAs(today)) return _RunStatus.today;
  if (dueDay.isBefore(today)) {
    return statusesLoaded ? _RunStatus.overdue : _RunStatus.today;
  }
  return _RunStatus.upcoming;
}

/// Aggregate status for a calendar day given its real runs + any projected runs.
_RunStatus _dayRunStatus(
  List<Task> tasks,
  bool hasProjected,
  Set<String> doneStatusIds,
  DateTime today,
  DateTime dayKey, {
  required bool statusesLoaded,
}) {
  final allDone =
      tasks.isNotEmpty && tasks.every((t) => _isTaskDone(t, doneStatusIds));
  if (statusesLoaded && allDone && !hasProjected) return _RunStatus.done;
  if (dayKey.isAtSameMomentAs(today)) return _RunStatus.today;
  if (dayKey.isBefore(today)) {
    return statusesLoaded ? _RunStatus.overdue : _RunStatus.upcoming;
  }
  return _RunStatus.upcoming;
}

class RecurringCalendarTab extends ConsumerStatefulWidget {
  const RecurringCalendarTab({super.key});

  @override
  ConsumerState<RecurringCalendarTab> createState() => _RecurringCalendarTabState();
}

class _RecurringCalendarTabState extends ConsumerState<RecurringCalendarTab> {
  DateTime _focusedDay = DateTime.now();
  DateTime? _selectedDay;

  @override
  void initState() {
    super.initState();
    _selectedDay = DateTime.now();
  }

  Future<void> _refreshBoard() async {
    final session = ref.read(sessionControllerProvider);
    final orgId = session.orgId;
    final projectId = ref.read(recurringSelectedProjectIdProvider);
    if (orgId == null || projectId == null) return;

    final repo = ref.read(recurringRepositoryProvider);
    await repo.syncBoard(organizationId: orgId, projectId: projectId);
    ref.invalidate(recurringBoardTasksProvider);
    ref.invalidate(recurringSummaryProvider);
    ref.invalidate(recurringTemplatesProvider);
    await ref.read(recurringBoardTasksProvider.future);
  }

  void _jumpToToday() {
    setState(() {
      final now = DateTime.now();
      _selectedDay = now;
      _focusedDay = now;
    });
  }

  /// Opens the interactive day checklist for [day]: check off subtasks, mark
  /// runs done, snooze/skip, and complete the whole day.
  Future<void> _openDaySheet(
    BuildContext context,
    DateTime day,
    List<Task> dayTasks,
    List<_ProjectedRun> projected,
    String projectId,
    Set<String> doneStatusIds,
    bool statusesLoaded,
  ) async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (sheetContext) {
        return _DaySheet(
          day: day,
          initialTasks: dayTasks,
          projected: projected,
          projectId: projectId,
          doneStatusIds: doneStatusIds,
          statusesLoaded: statusesLoaded,
          onOpenDetails: (task) async {
            Navigator.of(sheetContext).pop();
            await _openTaskDetail(context, task, projectId);
          },
          onChanged: () {
            ref.invalidate(recurringBoardTasksProvider);
            ref.invalidate(recurringSummaryProvider);
          },
        );
      },
    );
  }

  Future<void> _openTaskDetail(
    BuildContext context,
    Task task,
    String projectId,
  ) async {
    List<WorkflowStatus> statuses = const [];
    try {
      statuses =
          await ref.read(projectWorkflowStatusesProvider(projectId).future);
    } catch (_) {
      statuses = const [];
    }
    if (!context.mounted) return;
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) {
        return TaskDetailSheet(
          task: task,
          statuses: statuses,
          projectId: projectId,
          mode: TaskDetailMode.runChecklist,
          onUpdated: () {
            ref.invalidate(recurringBoardTasksProvider);
            ref.invalidate(recurringSummaryProvider);
          },
          onDeleted: () {
            ref.invalidate(recurringBoardTasksProvider);
            ref.invalidate(recurringSummaryProvider);
          },
        );
      },
    );
  }

  static DateTime _dateOnly(DateTime value) =>
      DateTime(value.year, value.month, value.day);

  @override
  Widget build(BuildContext context) {
    final projectsAsync = ref.watch(projectsProvider);
    final projectId = ref.watch(recurringSelectedProjectIdProvider);
    final tasksAsync = ref.watch(recurringBoardTasksProvider);
    final tasks = tasksAsync.valueOrNull ?? const <Task>[];
    final loadingTasks = tasksAsync.isLoading && tasks.isEmpty;
    final taskError = tasksAsync.hasError && tasks.isEmpty ? tasksAsync.error : null;

    final projectsLoading =
        projectsAsync.isLoading && projectsAsync.valueOrNull == null;
    final projects = (projectsAsync.valueOrNull ?? const [])
        .where((p) => !p.isArchived)
        .toList();

    if (projectsLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (projects.isEmpty) {
      return const Padding(
        padding: EdgeInsets.all(AppSpacing.lg),
        child: EmptyState(
          title: 'No projects yet',
          message:
              'Create a project first, then your recurring calendar will appear here.',
          icon: Icons.folder_off_outlined,
        ),
      );
    }

    if (projectId == null) {
      return const Padding(
        padding: EdgeInsets.all(AppSpacing.lg),
        child: EmptyState(
          title: 'Select a project',
          message: 'Choose a project above to view its planner calendar.',
          icon: Icons.folder_open_outlined,
        ),
      );
    }

    if (taskError != null) {
      final isNetwork = taskError is ApiException && taskError.isNetwork;
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.lg),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              EmptyState(
                title: 'Calendar unavailable',
                message: taskError.toString(),
                icon: Icons.calendar_month_outlined,
              ),
              if (isNetwork) ...[
                const SizedBox(height: AppSpacing.md),
                PrimaryButton(
                  label: 'Retry',
                  expand: false,
                  onPressed: () => ref.invalidate(recurringBoardTasksProvider),
                ),
              ],
            ],
          ),
        ),
      );
    }

    // Reliable completion detection: a status is "done" when its type == DONE
    // (mirrors the backend). While statuses load we degrade to date-only colors.
    final statusesAsync = ref.watch(projectWorkflowStatusesProvider(projectId));
    final statuses = statusesAsync.valueOrNull ?? const <WorkflowStatus>[];
    final statusesLoaded = statusesAsync.hasValue;
    final doneStatusIds = statuses
        .where((s) => s.type.toUpperCase() == 'DONE')
        .map((s) => s.id)
        .toSet();

    final today = _dateOnly(DateTime.now());

    final byDay = <DateTime, List<Task>>{};
    for (final task in tasks) {
      if (task.dueDate == null) continue;
      final parsed = DateTime.tryParse(task.dueDate!);
      if (parsed == null) continue;
      final key = DateTime(parsed.year, parsed.month, parsed.day);
      byDay.putIfAbsent(key, () => []).add(task);
    }

    // Project future runs from active templates so the calendar looks forward
    // (the board only materializes past/pending runs).
    final templates =
        ref.watch(recurringTemplatesProvider).valueOrNull ??
            const <RecurringTemplate>[];
    final horizonEnd = today.add(const Duration(days: _projectionHorizonDays));
    final projectedByDay = <DateTime, List<_ProjectedRun>>{};
    for (final tpl in templates) {
      if (tpl.isPaused) continue;
      final next = DateTime.tryParse(tpl.nextDueDate);
      if (next == null) continue;
      var cursor = DateTime(next.year, next.month, next.day);
      final endLimit = () {
        if ((tpl.endType ?? '').toUpperCase() != 'ON_DATE') return null;
        final raw = tpl.endDate;
        if (raw == null || raw.isEmpty) return null;
        final parsed = DateTime.tryParse(raw);
        if (parsed == null) return null;
        return DateTime(parsed.year, parsed.month, parsed.day);
      }();
      var guard = 0;
      while (!cursor.isAfter(horizonEnd) && guard < 400) {
        guard++;
        if (endLimit != null && cursor.isAfter(endLimit)) break;
        if (cursor.isAfter(today)) {
          final key = DateTime(cursor.year, cursor.month, cursor.day);
          final alreadyReal = (byDay[key] ?? const [])
              .any((t) => t.recurringTemplateId == tpl.id);
          if (!alreadyReal) {
            projectedByDay.putIfAbsent(key, () => []).add(
                  _ProjectedRun(
                    templateId: tpl.id,
                    title: tpl.title,
                    priority: tpl.priority ?? 'medium',
                    dueDate: key,
                    repeatType: tpl.repeatType,
                  ),
                );
          }
        }
        final stepped = _nextProjectedDue(cursor, tpl);
        if (stepped == null) break;
        cursor = stepped;
      }
    }

    final allDayKeys = <DateTime>{...byDay.keys, ...projectedByDay.keys};
    final byDayStatus = <DateTime, _RunStatus>{
      for (final key in allDayKeys)
        key: _dayRunStatus(
          byDay[key] ?? const [],
          (projectedByDay[key] ?? const []).isNotEmpty,
          doneStatusIds,
          today,
          key,
          statusesLoaded: statusesLoaded,
        ),
    };

    final selected = _selectedDay ?? DateTime.now();
    final selectedKey = DateTime(selected.year, selected.month, selected.day);
    final dayTasks = byDay[selectedKey] ?? const <Task>[];
    final dayProjected = projectedByDay[selectedKey] ?? const <_ProjectedRun>[];
    final doneCount =
        dayTasks.where((t) => _isTaskDone(t, doneStatusIds)).length;
    final overdueCount = dayTasks
        .where((t) =>
            _taskRunStatus(t, doneStatusIds, today,
                statusesLoaded: statusesLoaded) ==
            _RunStatus.overdue)
        .length;

    return RefreshIndicator(
      onRefresh: _refreshBoard,
      child: ListView(
        padding: const EdgeInsets.all(AppSpacing.md),
        children: [
          SurfaceCard(
            padding: const EdgeInsets.all(AppSpacing.sm),
            child: TableCalendar<Object>(
              firstDay: DateTime.utc(2020, 1, 1),
              lastDay: DateTime.utc(2035, 12, 31),
              focusedDay: _focusedDay,
              selectedDayPredicate: (day) => isSameDay(_selectedDay, day),
              calendarFormat: CalendarFormat.month,
              eventLoader: (day) {
                final key = DateTime(day.year, day.month, day.day);
                return <Object>[
                  ...(byDay[key] ?? const []),
                  ...(projectedByDay[key] ?? const []),
                ];
              },
              onDaySelected: (selectedDay, focusedDay) {
                setState(() {
                  _selectedDay = selectedDay;
                  _focusedDay = focusedDay;
                });
                final key = DateTime(
                  selectedDay.year,
                  selectedDay.month,
                  selectedDay.day,
                );
                final tappedTasks = byDay[key] ?? const <Task>[];
                final tappedProjected =
                    projectedByDay[key] ?? const <_ProjectedRun>[];
                if (tappedTasks.isNotEmpty || tappedProjected.isNotEmpty) {
                  _openDaySheet(
                    context,
                    selectedDay,
                    tappedTasks,
                    tappedProjected,
                    projectId,
                    doneStatusIds,
                    statusesLoaded,
                  );
                }
              },
              onPageChanged: (focusedDay) => _focusedDay = focusedDay,
              calendarStyle: CalendarStyle(
                outsideDaysVisible: false,
                todayDecoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.12),
                  shape: BoxShape.circle,
                ),
                todayTextStyle: const TextStyle(
                  color: AppColors.primary,
                  fontWeight: FontWeight.w700,
                ),
                selectedDecoration: const BoxDecoration(
                  gradient: AppColors.primaryGradient,
                  shape: BoxShape.circle,
                ),
                selectedTextStyle: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w700,
                ),
              ),
              calendarBuilders: CalendarBuilders<Object>(
                markerBuilder: (context, day, events) {
                  if (events.isEmpty) return const SizedBox.shrink();
                  // The selected day is a filled gradient circle; a badge on top
                  // is low-contrast, and the summary card already shows counts.
                  if (isSameDay(day, _selectedDay)) {
                    return const SizedBox.shrink();
                  }
                  final key = DateTime(day.year, day.month, day.day);
                  final status = byDayStatus[key] ?? _RunStatus.upcoming;
                  final color = _runColor(status);
                  return Positioned(
                    bottom: 3,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 5, vertical: 1),
                      decoration: BoxDecoration(
                        color: color.withValues(alpha: 0.16),
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: Text(
                        '${events.length}',
                        style: TextStyle(
                          fontSize: 9,
                          height: 1,
                          fontWeight: FontWeight.w700,
                          color: color,
                        ),
                      ),
                    ),
                  );
                },
              ),
              headerStyle: HeaderStyle(
                titleCentered: true,
                formatButtonVisible: false,
                titleTextStyle: Theme.of(context).textTheme.titleMedium!,
              ),
            ),
          ),
          const SizedBox(height: AppSpacing.xs),
          Row(
            children: [
              const Expanded(child: _CalendarLegend()),
              TextButton.icon(
                onPressed: _jumpToToday,
                icon: const Icon(Icons.today_rounded, size: 16),
                label: const Text('Today'),
                style: TextButton.styleFrom(
                  foregroundColor: AppColors.primary,
                  visualDensity: VisualDensity.compact,
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.sm),
          if (loadingTasks)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: AppSpacing.lg),
              child: Center(child: Text('Loading scheduled runs…')),
            )
          else
            _SelectedDaySummary(
              date: selected,
              realTotal: dayTasks.length,
              done: doneCount,
              overdue: overdueCount,
              scheduled: dayProjected.length,
              onViewChecklist:
                  (dayTasks.isEmpty && dayProjected.isEmpty)
                      ? null
                      : () => _openDaySheet(
                            context,
                            selected,
                            dayTasks,
                            dayProjected,
                            projectId,
                            doneStatusIds,
                            statusesLoaded,
                          ),
            ),
        ],
      ),
    );
  }
}

class _CalendarLegend extends StatelessWidget {
  const _CalendarLegend();

  @override
  Widget build(BuildContext context) {
    return const Wrap(
      spacing: AppSpacing.sm,
      runSpacing: AppSpacing.xs,
      children: [
        _LegendDot(color: AppColors.danger, label: 'Overdue'),
        _LegendDot(color: AppColors.primary, label: 'Today'),
        _LegendDot(color: AppColors.violet, label: 'Upcoming'),
        _LegendDot(color: AppColors.success, label: 'Done'),
      ],
    );
  }
}

class _LegendDot extends StatelessWidget {
  const _LegendDot({required this.color, required this.label});

  final Color color;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 8,
          height: 8,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 5),
        Text(
          label,
          style: Theme.of(context).textTheme.labelSmall?.copyWith(
                color: AppColors.textMuted,
                fontSize: 11,
              ),
        ),
      ],
    );
  }
}

class _SelectedDaySummary extends StatelessWidget {
  const _SelectedDaySummary({
    required this.date,
    required this.realTotal,
    required this.done,
    required this.overdue,
    required this.scheduled,
    required this.onViewChecklist,
  });

  final DateTime date;
  final int realTotal;
  final int done;
  final int overdue;
  final int scheduled;
  final VoidCallback? onViewChecklist;

  @override
  Widget build(BuildContext context) {
    if (realTotal == 0 && scheduled == 0) {
      return SurfaceCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              DateFormat('EEEE, MMM d').format(date),
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: AppSpacing.xs),
            Row(
              children: [
                const Icon(Icons.event_available_outlined,
                    size: 18, color: AppColors.textMuted),
                const SizedBox(width: AppSpacing.xs),
                Expanded(
                  child: Text(
                    'No recurring runs scheduled for this day.',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: AppColors.textMuted,
                        ),
                  ),
                ),
              ],
            ),
          ],
        ),
      );
    }

    final progress = realTotal == 0 ? null : done / realTotal;
    final stats = <Widget>[
      if (realTotal > 0)
        _SummaryStat(
          icon: Icons.event_repeat_rounded,
          color: AppColors.violet,
          label: '$realTotal ${realTotal == 1 ? 'run' : 'runs'}',
        ),
      if (realTotal > 0)
        _SummaryStat(
          icon: Icons.check_circle_rounded,
          color: AppColors.success,
          label: '$done done',
        ),
      if (overdue > 0)
        _SummaryStat(
          icon: Icons.error_rounded,
          color: AppColors.danger,
          label: '$overdue overdue',
        ),
      if (scheduled > 0)
        _SummaryStat(
          icon: Icons.schedule_rounded,
          color: AppColors.violet,
          label: '$scheduled upcoming',
        ),
    ];

    return SurfaceCard(
      onTap: onViewChecklist,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  DateFormat('EEEE, MMM d').format(date),
                  style: Theme.of(context).textTheme.titleMedium,
                ),
              ),
              Text(
                realTotal > 0 ? '$done of $realTotal done' : '$scheduled scheduled',
                style: Theme.of(context).textTheme.labelMedium?.copyWith(
                      color: AppColors.textMuted,
                    ),
              ),
            ],
          ),
          if (progress != null) ...[
            const SizedBox(height: AppSpacing.sm),
            ClipRRect(
              borderRadius: BorderRadius.circular(999),
              child: LinearProgressIndicator(
                value: progress,
                minHeight: 8,
                backgroundColor: AppColors.primary.withValues(alpha: 0.10),
                color: AppColors.success,
              ),
            ),
          ],
          const SizedBox(height: AppSpacing.sm),
          Row(
            children: [
              Expanded(
                child: Wrap(
                  spacing: AppSpacing.md,
                  runSpacing: AppSpacing.xs,
                  children: stats,
                ),
              ),
              const Icon(Icons.chevron_right_rounded,
                  color: AppColors.textMuted),
            ],
          ),
        ],
      ),
    );
  }
}

class _SummaryStat extends StatelessWidget {
  const _SummaryStat({
    required this.icon,
    required this.color,
    required this.label,
  });

  final IconData icon;
  final Color color;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 15, color: color),
        const SizedBox(width: 4),
        Text(
          label,
          style: Theme.of(context).textTheme.labelMedium?.copyWith(
                color: AppColors.textSecondary,
                fontSize: 12,
              ),
        ),
      ],
    );
  }
}

/// Interactive day checklist: tick subtasks, mark runs done, snooze/skip,
/// and complete the whole day. Mirrors the web RecurringDayDrawer.
class _DaySheet extends ConsumerStatefulWidget {
  const _DaySheet({
    required this.day,
    required this.initialTasks,
    required this.projected,
    required this.projectId,
    required this.doneStatusIds,
    required this.statusesLoaded,
    required this.onOpenDetails,
    required this.onChanged,
  });

  final DateTime day;
  final List<Task> initialTasks;
  final List<_ProjectedRun> projected;
  final String projectId;
  final Set<String> doneStatusIds;
  final bool statusesLoaded;
  final Future<void> Function(Task task) onOpenDetails;
  final VoidCallback onChanged;

  @override
  ConsumerState<_DaySheet> createState() => _DaySheetState();
}

class _DaySheetState extends ConsumerState<_DaySheet> {
  late List<Task> _tasks;
  final Set<String> _expanded = {};
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _tasks = List<Task>.from(widget.initialTasks);
    _expanded.addAll(_tasks.map((t) => t.id));
  }

  String? get _orgId => ref.read(sessionControllerProvider).orgId;
  String? get _doneStatusId =>
      widget.doneStatusIds.isEmpty ? null : widget.doneStatusIds.first;

  bool _isDone(Task t) =>
      t.statusId != null && widget.doneStatusIds.contains(t.statusId);
  bool _allSubsDone(Task t) =>
      t.subtasks.isNotEmpty && t.subtasks.every((s) => s.completed);
  bool _runComplete(Task t) => _isDone(t) || _allSubsDone(t);

  void _snack(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(message)));
  }

  String _msg(Object error) =>
      error is ApiException ? error.message : error.toString();

  Future<void> _toggleSubtask(Task task, int subIndex, bool value) async {
    final ti = _tasks.indexWhere((t) => t.id == task.id);
    if (ti < 0) return;
    final prevTask = _tasks[ti];
    final subs = List<TaskSubtask>.from(prevTask.subtasks);
    final sub = subs[subIndex];
    final user = ref.read(sessionControllerProvider).user;
    final stamp = value
        ? SubtaskCompletionRecord.timestampOnly(
            completedAt: DateTime.now(),
            employeeId: user?.id ?? '',
            employeeName: user?.fullName.trim().isNotEmpty == true
                ? user!.fullName.trim()
                : (user?.email ?? ''),
          )
        : null;
    subs[subIndex] = sub.copyWith(
      completed: value,
      status: value ? 'DONE' : (sub.status == 'DONE' ? 'TODO' : sub.status),
      clearCompletionRecord: !value,
      clearCompletedAt: !value,
      completionRecord: stamp,
      completedAt: stamp?.completedAt,
    );
    setState(() => _tasks[ti] = prevTask.copyWith(subtasks: subs));
    try {
      await ref
          .read(tasksRepositoryProvider)
          .updateTask(taskId: task.id, subtasks: subs);
      widget.onChanged();
    } catch (error) {
      if (mounted) setState(() => _tasks[ti] = prevTask);
      _snack('Could not update checklist: ${_msg(error)}');
    }
  }

  Future<void> _editSubtaskNote(Task task, TaskSubtask subtask) async {
    final ti = _tasks.indexWhere((t) => t.id == task.id);
    if (ti < 0) return;
    final orgId = _orgId;
    if (orgId == null || orgId.isEmpty) {
      _snack('No workspace selected');
      return;
    }
    final subtaskId = subtask.id.trim();
    if (subtaskId.isEmpty) {
      _snack('This checklist item needs to be saved before adding notes.');
      return;
    }
    // Re-resolve from current state so we never open another row's thread.
    final liveTask = _tasks[ti];
    final liveIndex = liveTask.subtasks.indexWhere((s) => s.id == subtaskId);
    if (liveIndex < 0) {
      _snack('Checklist item not found. Pull to refresh and try again.');
      return;
    }
    final liveSub = liveTask.subtasks[liveIndex];
    final result = await showSubtaskNoteSheet(
      context: context,
      subtask: liveSub,
      taskId: liveTask.id,
      organizationId: orgId,
    );
    if (!mounted) return;

    final taskIndex = _tasks.indexWhere((t) => t.id == liveTask.id);
    if (taskIndex < 0) {
      widget.onChanged();
      return;
    }
    final subIndex =
        _tasks[taskIndex].subtasks.indexWhere((s) => s.id == subtaskId);
    if (result != null && subIndex >= 0) {
      final prevTask = _tasks[taskIndex];
      final subs = List<TaskSubtask>.from(prevTask.subtasks);
      final preview = result.latestNotePreview?.trim();
      subs[subIndex] = subs[subIndex].copyWith(
        note: result.hasNotes
            ? (preview != null && preview.isNotEmpty ? preview : 'Notes')
            : null,
        clearNote: !result.hasNotes,
      );
      setState(() => _tasks[taskIndex] = prevTask.copyWith(subtasks: subs));
    }
    widget.onChanged();
  }

  Future<void> _confirmDeleteSubtask(Task task, int subIndex) async {
    if (_busy) return;
    final ti = _tasks.indexWhere((t) => t.id == task.id);
    if (ti < 0 || subIndex < 0 || subIndex >= _tasks[ti].subtasks.length) {
      return;
    }
    final title = _tasks[ti].subtasks[subIndex].title.trim();
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete subtask'),
        content: Text(
          title.isEmpty
              ? 'Remove this subtask from the checklist?'
              : 'Remove "$title" from the checklist?',
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
    if (confirmed == true && mounted) {
      await _deleteSubtask(task, subIndex);
    }
  }

  Future<void> _deleteSubtask(Task task, int subIndex) async {
    final ti = _tasks.indexWhere((t) => t.id == task.id);
    if (ti < 0 || subIndex < 0 || subIndex >= _tasks[ti].subtasks.length) {
      return;
    }
    final prevTask = _tasks[ti];
    final subs = List<TaskSubtask>.from(prevTask.subtasks)..removeAt(subIndex);
    setState(() {
      _busy = true;
      _tasks[ti] = prevTask.copyWith(subtasks: subs);
    });
    try {
      await ref
          .read(tasksRepositoryProvider)
          .updateTask(taskId: task.id, subtasks: subs);
      widget.onChanged();
      _snack('Subtask deleted');
    } catch (error) {
      if (mounted) setState(() => _tasks[ti] = prevTask);
      _snack('Could not delete subtask: ${_msg(error)}');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _markDone(Task task) async {
    final orgId = _orgId;
    if (orgId == null) return;
    setState(() => _busy = true);
    try {
      await ref.read(recurringRepositoryProvider).completeRecurringTask(
            taskId: task.id,
            organizationId: orgId,
            doneStatusId: _doneStatusId,
          );
      final i = _tasks.indexWhere((t) => t.id == task.id);
      if (i >= 0 && _doneStatusId != null) {
        _tasks[i] = _tasks[i].copyWith(statusId: _doneStatusId);
      }
      widget.onChanged();
      _snack('Marked done');
    } catch (error) {
      _snack('Could not mark done: ${_msg(error)}');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _snooze(Task task) async {
    setState(() => _busy = true);
    try {
      final base = task.dueDate != null
          ? (DateTime.tryParse(task.dueDate!) ?? DateTime.now())
          : DateTime.now();
      final next = base.add(const Duration(days: 1));
      await ref
          .read(tasksRepositoryProvider)
          .updateTask(taskId: task.id, dueDate: next.toIso8601String());
      setState(() => _tasks.removeWhere((t) => t.id == task.id));
      widget.onChanged();
      _snack('Snoozed to tomorrow');
    } catch (error) {
      _snack('Could not snooze: ${_msg(error)}');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _skip(Task task) async {
    final orgId = _orgId;
    final templateId = task.recurringTemplateId;
    if (orgId == null || templateId == null) {
      _snack('This run has no series to skip.');
      return;
    }
    setState(() => _busy = true);
    try {
      await ref
          .read(recurringRepositoryProvider)
          .skipNextOccurrence(templateId: templateId, organizationId: orgId);
      widget.onChanged();
      _snack('Skipped next occurrence');
    } catch (error) {
      if (error is ApiException && error.statusCode == 403) {
        _snack('Only admins can skip runs.');
      } else {
        _snack('Could not skip: ${_msg(error)}');
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _completeDay(List<Task> targets) async {
    final orgId = _orgId;
    if (orgId == null || targets.isEmpty) return;
    setState(() => _busy = true);
    try {
      for (final task in targets) {
        await ref.read(recurringRepositoryProvider).completeRecurringTask(
              taskId: task.id,
              organizationId: orgId,
              doneStatusId: _doneStatusId,
            );
        final i = _tasks.indexWhere((t) => t.id == task.id);
        if (i >= 0 && _doneStatusId != null) {
          _tasks[i] = _tasks[i].copyWith(statusId: _doneStatusId);
        }
      }
      widget.onChanged();
      _snack(
          'Completed ${targets.length} ${targets.length == 1 ? 'run' : 'runs'}');
    } catch (error) {
      _snack('Could not complete day: ${_msg(error)}');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  (int, int) _dayProgress() {
    var total = 0;
    var done = 0;
    for (final task in _tasks) {
      total += task.subtasks.length;
      done += task.completedSubtasks;
    }
    return (done, total);
  }

  _Pill _statusBadge(Task task, DateTime todayKey) {
    if (_isDone(task)) {
      return const _Pill(
          label: 'Done',
          color: AppColors.success,
          icon: Icons.check_circle_rounded);
    }
    final total = task.subtasks.length;
    final done = task.completedSubtasks;
    final due = task.dueDate == null ? null : DateTime.tryParse(task.dueDate!);
    final dueKey = due == null ? null : DateTime(due.year, due.month, due.day);
    if (dueKey != null && dueKey.isBefore(todayKey)) {
      return const _Pill(
          label: 'Overdue',
          color: AppColors.danger,
          icon: Icons.error_rounded);
    }
    if (total > 0 && done > 0) {
      return const _Pill(
          label: 'In progress',
          color: AppColors.sky,
          icon: Icons.timelapse_rounded);
    }
    return const _Pill(
        label: 'To do',
        color: AppColors.violet,
        icon: Icons.radio_button_unchecked_rounded);
  }

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    final todayKey = DateTime(now.year, now.month, now.day);
    final (doneSubs, totalSubs) = _dayProgress();
    final allRunsDone = _tasks.isNotEmpty && _tasks.every(_runComplete);
    final eligible = _tasks
        .where((t) => !_isDone(t) && (t.subtasks.isEmpty || _allSubsDone(t)))
        .toList();
    final blocked = _tasks
        .where(
            (t) => !_isDone(t) && t.subtasks.isNotEmpty && !_allSubsDone(t))
        .toList();
    final canCompleteDay = !_busy && eligible.isNotEmpty && blocked.isEmpty;
    final totalRuns = _tasks.length + widget.projected.length;

    return DraggableScrollableSheet(
      initialChildSize: 0.7,
      minChildSize: 0.4,
      maxChildSize: 0.95,
      expand: false,
      builder: (_, scrollController) {
        return Container(
          decoration: BoxDecoration(
            color: Theme.of(context).scaffoldBackgroundColor,
            borderRadius:
                const BorderRadius.vertical(top: Radius.circular(20)),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const SizedBox(height: AppSpacing.sm),
              Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: AppColors.border,
                  borderRadius: BorderRadius.circular(999),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      DateFormat('EEEE, MMM d').format(widget.day),
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.w700,
                          ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      totalRuns == 0
                          ? 'Nothing scheduled'
                          : allRunsDone
                              ? 'All $totalRuns ${totalRuns == 1 ? 'run' : 'runs'} complete'
                              : '$totalRuns ${totalRuns == 1 ? 'run' : 'runs'} · tap checklist to check off',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: AppColors.textMuted,
                          ),
                    ),
                    if (totalSubs > 0) ...[
                      const SizedBox(height: 14),
                      Row(
                        children: [
                          Text(
                            'Progress',
                            style: Theme.of(context)
                                .textTheme
                                .labelMedium
                                ?.copyWith(
                                  color: AppColors.textSecondary,
                                  fontWeight: FontWeight.w600,
                                ),
                          ),
                          const Spacer(),
                          Text(
                            '$doneSubs / $totalSubs',
                            style: Theme.of(context)
                                .textTheme
                                .labelMedium
                                ?.copyWith(
                                  color: allRunsDone
                                      ? AppColors.success
                                      : AppColors.textPrimary,
                                  fontWeight: FontWeight.w700,
                                ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(999),
                        child: LinearProgressIndicator(
                          value: doneSubs / totalSubs,
                          minHeight: 6,
                          backgroundColor:
                              AppColors.border.withValues(alpha: 0.7),
                          color: allRunsDone
                              ? AppColors.success
                              : AppColors.primary,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              Divider(height: 1, color: AppColors.border.withValues(alpha: 0.8)),
              Flexible(
                child: ListView(
                  controller: scrollController,
                  padding: const EdgeInsets.fromLTRB(16, 14, 16, 8),
                  children: [
                    for (final task in _tasks) ...[
                      _buildRunCard(task, todayKey),
                      const SizedBox(height: 10),
                    ],
                    for (final run in widget.projected) ...[
                      _ProjectedRunCard(run: run),
                      const SizedBox(height: 10),
                    ],
                  ],
                ),
              ),
              if (eligible.isNotEmpty || blocked.isNotEmpty)
                SafeArea(
                  top: false,
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        PrimaryButton(
                          label: 'Complete day',
                          loading: _busy,
                          onPressed:
                              canCompleteDay ? () => _completeDay(eligible) : null,
                        ),
                        if (blocked.isNotEmpty) ...[
                          const SizedBox(height: 8),
                          Text(
                            'Finish every checklist item to unlock Complete day.',
                            textAlign: TextAlign.center,
                            style: Theme.of(context)
                                .textTheme
                                .labelSmall
                                ?.copyWith(color: AppColors.textMuted),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildRunCard(Task task, DateTime todayKey) {
    final total = task.subtasks.length;
    final done = task.completedSubtasks;
    final isExpanded = _expanded.contains(task.id);
    final dayKey = DateTime(widget.day.year, widget.day.month, widget.day.day);
    final isPastDay = dayKey.isBefore(todayKey);
    final canMarkDone =
        !_busy && !_isDone(task) && (total == 0 || done == total);
    final progress = total == 0 ? 0.0 : done / total;

    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border.withValues(alpha: 0.85)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          InkWell(
            borderRadius: BorderRadius.circular(16),
            onTap: () => setState(() {
              if (isExpanded) {
                _expanded.remove(task.id);
              } else {
                _expanded.add(task.id);
              }
            }),
            child: Padding(
              padding: const EdgeInsets.fromLTRB(14, 12, 10, 12),
              child: Row(
                children: [
                  Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      color: _priorityColor(task.priority).withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(
                      Icons.event_repeat_rounded,
                      size: 18,
                      color: _priorityColor(task.priority),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          task.title,
                          style: Theme.of(context).textTheme.titleSmall?.copyWith(
                                fontWeight: FontWeight.w700,
                              ),
                        ),
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            _statusBadge(task, todayKey),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                total == 0
                                    ? 'No checklist'
                                    : '$done of $total done',
                                style: Theme.of(context)
                                    .textTheme
                                    .labelSmall
                                    ?.copyWith(color: AppColors.textMuted),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                        if (total > 0) ...[
                          const SizedBox(height: 8),
                          ClipRRect(
                            borderRadius: BorderRadius.circular(999),
                            child: LinearProgressIndicator(
                              value: progress,
                              minHeight: 4,
                              backgroundColor:
                                  AppColors.border.withValues(alpha: 0.6),
                              color: progress >= 1
                                  ? AppColors.success
                                  : AppColors.primary,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                  const SizedBox(width: 4),
                  Icon(
                    isExpanded
                        ? Icons.keyboard_arrow_up_rounded
                        : Icons.keyboard_arrow_down_rounded,
                    color: AppColors.textMuted,
                  ),
                ],
              ),
            ),
          ),
          if (isExpanded) ...[
            Divider(height: 1, color: AppColors.border.withValues(alpha: 0.7)),
            Padding(
              padding: const EdgeInsets.fromLTRB(8, 4, 8, 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  if (total == 0)
                    Padding(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 10,
                      ),
                      child: Text(
                        'No checklist for this run.',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: AppColors.textMuted,
                            ),
                      ),
                    )
                  else
                    for (final subtask in task.subtasks)
                      _SubtaskRow(
                        subtask: subtask,
                        onToggle: (value) {
                          final idx = task.subtasks
                              .indexWhere((s) => s.id == subtask.id);
                          if (idx >= 0) _toggleSubtask(task, idx, value);
                        },
                        onEditNote: () => _editSubtaskNote(task, subtask),
                        onEdit: () => widget.onOpenDetails(task),
                        onDelete: () {
                          final idx = task.subtasks
                              .indexWhere((s) => s.id == subtask.id);
                          if (idx >= 0) _confirmDeleteSubtask(task, idx);
                        },
                        enabled: !_busy,
                        allowStructureEdit: !isPastDay,
                      ),
                  const SizedBox(height: 8),
                  if (isPastDay)
                    Padding(
                      padding: const EdgeInsets.fromLTRB(8, 0, 8, 8),
                      child: Text(
                        'This day has passed. Use Add note for details and attachments; you can still mark items done or undone.',
                        style: Theme.of(context).textTheme.labelSmall?.copyWith(
                              color: AppColors.textMuted,
                            ),
                      ),
                    ),
                  Row(
                    children: [
                      Expanded(
                        child: FilledButton(
                          onPressed: canMarkDone ? () => _markDone(task) : null,
                          style: FilledButton.styleFrom(
                            backgroundColor: AppColors.success,
                            disabledBackgroundColor:
                                AppColors.border.withValues(alpha: 0.5),
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 10),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                          child: const Text('Mark done'),
                        ),
                      ),
                      const SizedBox(width: 8),
                      if (!isPastDay) ...[
                        _RunIconAction(
                          tooltip: 'Snooze',
                          icon: Icons.snooze_rounded,
                          onPressed: _busy ? null : () => _snooze(task),
                        ),
                        _RunIconAction(
                          tooltip: 'Skip',
                          icon: Icons.skip_next_rounded,
                          onPressed: _busy ? null : () => _skip(task),
                        ),
                      ],
                      _RunIconAction(
                        tooltip: 'Details',
                        icon: Icons.open_in_new_rounded,
                        onPressed: () => widget.onOpenDetails(task),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _RunIconAction extends StatelessWidget {
  const _RunIconAction({
    required this.tooltip,
    required this.icon,
    required this.onPressed,
  });

  final String tooltip;
  final IconData icon;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(left: 4),
      child: Tooltip(
        message: tooltip,
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: onPressed,
            borderRadius: BorderRadius.circular(12),
            child: Ink(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.border),
              ),
              child: Icon(
                icon,
                size: 18,
                color: onPressed == null
                    ? AppColors.textMuted.withValues(alpha: 0.45)
                    : AppColors.textSecondary,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _SubtaskRow extends StatelessWidget {
  const _SubtaskRow({
    required this.subtask,
    required this.onToggle,
    required this.onEditNote,
    required this.onEdit,
    required this.onDelete,
    required this.enabled,
    this.allowStructureEdit = true,
  });

  final TaskSubtask subtask;
  final ValueChanged<bool> onToggle;
  final VoidCallback onEditNote;
  final VoidCallback onEdit;
  final VoidCallback onDelete;
  final bool enabled;
  final bool allowStructureEdit;

  @override
  Widget build(BuildContext context) {
    final completed = subtask.completed;
    final note = subtask.note?.trim();
    final hasNote = note != null && note.isNotEmpty;
    final dueTime = subtask.dueTime?.trim();
    final hasTime = dueTime != null && dueTime.isNotEmpty;
    final doneAtLabel = _completedAtLabel(subtask);

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: enabled ? () => onToggle(!completed) : null,
          borderRadius: BorderRadius.circular(12),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(4, 6, 2, 6),
            child: Row(
              children: [
                SizedBox(
                  width: 28,
                  height: 28,
                  child: Checkbox(
                    value: completed,
                    visualDensity: VisualDensity.compact,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(6),
                    ),
                    activeColor: AppColors.success,
                    onChanged:
                        enabled ? (value) => onToggle(value ?? false) : null,
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        subtask.title,
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              fontWeight: FontWeight.w500,
                              color: completed
                                  ? AppColors.textMuted
                                  : AppColors.textPrimary,
                              decoration: completed
                                  ? TextDecoration.lineThrough
                                  : null,
                            ),
                      ),
                      if (hasTime || hasNote) ...[
                        const SizedBox(height: 2),
                        Text(
                          [
                            if (hasTime) dueTime,
                            if (hasNote) 'Notes',
                          ].join(' · '),
                          style:
                              Theme.of(context).textTheme.labelSmall?.copyWith(
                                    color: AppColors.textMuted,
                                  ),
                        ),
                      ],
                    ],
                  ),
                ),
                if (doneAtLabel != null) ...[
                  const SizedBox(width: 4),
                  _DoneAtChip(label: doneAtLabel),
                ],
                PopupMenuButton<_SubtaskMenuAction>(
                    tooltip: 'More',
                    enabled: enabled,
                    padding: EdgeInsets.zero,
                    icon: Icon(
                      Icons.more_horiz_rounded,
                      color: AppColors.textMuted.withValues(alpha: 0.9),
                    ),
                    onSelected: (action) {
                      switch (action) {
                        case _SubtaskMenuAction.note:
                          onEditNote();
                        case _SubtaskMenuAction.edit:
                          onEdit();
                        case _SubtaskMenuAction.delete:
                          if (allowStructureEdit) onDelete();
                      }
                    },
                    itemBuilder: (context) => [
                      PopupMenuItem(
                        value: _SubtaskMenuAction.note,
                        child: Text(hasNote ? 'Notes' : 'Add note'),
                      ),
                      const PopupMenuItem(
                        value: _SubtaskMenuAction.edit,
                        child: Text('Edit'),
                      ),
                      if (allowStructureEdit)
                        const PopupMenuItem(
                          value: _SubtaskMenuAction.delete,
                          child: Text('Delete'),
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

String? _completedAtLabel(TaskSubtask subtask) {
  if (!subtask.completed) return null;
  final raw = subtask.effectiveCompletedAt;
  if (raw == null || raw.isEmpty) return null;
  final parsed = DateTime.tryParse(raw);
  if (parsed == null) return null;
  return DateFormat('h:mm a').format(parsed.toLocal());
}

class _DoneAtChip extends StatelessWidget {
  const _DoneAtChip({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: AppColors.success.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.check_circle_rounded,
              size: 11, color: AppColors.success),
          const SizedBox(width: 4),
          Text(
            label,
            style: const TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w700,
              color: AppColors.success,
            ),
          ),
        ],
      ),
    );
  }
}

enum _SubtaskMenuAction { note, edit, delete }

/// Read-only card for a projected upcoming run (not yet a real task).
class _ProjectedRunCard extends StatelessWidget {
  const _ProjectedRunCard({required this.run});

  final _ProjectedRun run;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(14, 12, 12, 12),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border.withValues(alpha: 0.85)),
      ),
      child: Row(
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: _priorityColor(run.priority).withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(
              Icons.schedule_rounded,
              size: 18,
              color: _priorityColor(run.priority).withValues(alpha: 0.75),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  run.title,
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w700,
                        color: AppColors.textSecondary,
                      ),
                ),
                const SizedBox(height: 2),
                Text(
                  'Upcoming · ${_cadenceLabel(run.repeatType)}',
                  style: Theme.of(context).textTheme.labelSmall?.copyWith(
                        color: AppColors.textMuted,
                      ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _Pill extends StatelessWidget {
  const _Pill({required this.label, required this.color, required this.icon});

  final String label;
  final Color color;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 11, color: color),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w700,
              color: color,
            ),
          ),
        ],
      ),
    );
  }
}

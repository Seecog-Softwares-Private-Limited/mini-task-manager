import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:table_calendar/table_calendar.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../data/models/task.dart';
import '../../shared/widgets/app_widgets.dart';
import 'recurring_providers.dart';

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

  @override
  Widget build(BuildContext context) {
    final tasksAsync = ref.watch(recurringBoardTasksProvider);

    return tasksAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, _) => EmptyState(
        title: 'Calendar unavailable',
        message: error.toString(),
        icon: Icons.calendar_month_outlined,
      ),
      data: (tasks) {
        final byDay = <DateTime, List<Task>>{};
        for (final task in tasks) {
          if (task.dueDate == null) continue;
          final parsed = DateTime.tryParse(task.dueDate!);
          if (parsed == null) continue;
          final key = DateTime(parsed.year, parsed.month, parsed.day);
          byDay.putIfAbsent(key, () => []).add(task);
        }

        final selected = _selectedDay ?? DateTime.now();
        final selectedKey = DateTime(selected.year, selected.month, selected.day);
        final dayTasks = byDay[selectedKey] ?? const [];

        return RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(recurringBoardTasksProvider);
            await ref.read(recurringBoardTasksProvider.future);
          },
          child: ListView(
            padding: const EdgeInsets.all(AppSpacing.md),
            children: [
              SurfaceCard(
                padding: const EdgeInsets.all(AppSpacing.sm),
                child: TableCalendar<Task>(
                  firstDay: DateTime.utc(2020, 1, 1),
                  lastDay: DateTime.utc(2035, 12, 31),
                  focusedDay: _focusedDay,
                  selectedDayPredicate: (day) => isSameDay(_selectedDay, day),
                  calendarFormat: CalendarFormat.month,
                  eventLoader: (day) => byDay[DateTime(day.year, day.month, day.day)] ?? const [],
                  onDaySelected: (selectedDay, focusedDay) {
                    setState(() {
                      _selectedDay = selectedDay;
                      _focusedDay = focusedDay;
                    });
                  },
                  onPageChanged: (focusedDay) => _focusedDay = focusedDay,
                  calendarStyle: const CalendarStyle(
                    markersMaxCount: 3,
                    markerDecoration: BoxDecoration(
                      color: AppColors.primary,
                      shape: BoxShape.circle,
                    ),
                  ),
                  headerStyle: HeaderStyle(
                    titleCentered: true,
                    formatButtonVisible: false,
                    titleTextStyle: Theme.of(context).textTheme.titleMedium!,
                  ),
                ),
              ),
              const SizedBox(height: AppSpacing.md),
              Text(
                DateFormat('EEEE, MMM d').format(selected),
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: AppSpacing.sm),
              if (dayTasks.isEmpty)
                const EmptyState(
                  title: 'No runs this day',
                  message: 'Scheduled recurring runs will appear here.',
                  icon: Icons.event_busy_outlined,
                )
              else
                ...dayTasks.map(
                  (task) => Padding(
                    padding: const EdgeInsets.only(bottom: AppSpacing.xs),
                    child: SurfaceCard(
                      child: Row(
                        children: [
                          const Icon(Icons.event_repeat, color: AppColors.violet, size: 20),
                          const SizedBox(width: AppSpacing.sm),
                          Expanded(
                            child: Text(
                              task.title,
                              style: Theme.of(context).textTheme.titleMedium,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
            ],
          ),
        );
      },
    );
  }
}

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../data/models/recurring.dart';
import '../../shared/widgets/app_widgets.dart';
import 'recurring_planner_sheet.dart';
import 'recurring_providers.dart';

/// Habit-review analytics: overall success rate plus per-series consistency,
/// streaks and on-time rate over a trailing window.
class RecurringInsightsTab extends ConsumerWidget {
  const RecurringInsightsTab({super.key});

  static const _ranges = <int>[7, 30, 90];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final analyticsAsync = ref.watch(recurringAnalyticsProvider);
    final selectedRange = ref.watch(recurringAnalyticsRangeProvider);

    return RefreshIndicator(
      onRefresh: () async {
        ref.invalidate(recurringAnalyticsProvider);
        await ref.read(recurringAnalyticsProvider.future);
      },
      child: ListView(
        padding: const EdgeInsets.fromLTRB(
            AppSpacing.md, AppSpacing.sm, AppSpacing.md, AppSpacing.xl),
        children: [
          _RangeSelector(
            ranges: _ranges,
            selected: selectedRange,
            onSelected: (days) =>
                ref.read(recurringAnalyticsRangeProvider.notifier).state = days,
          ),
          const SizedBox(height: AppSpacing.md),
          analyticsAsync.when(
            data: (data) => _AnalyticsBody(data: data),
            loading: () => const Padding(
              padding: EdgeInsets.only(top: AppSpacing.xl),
              child: Center(child: CircularProgressIndicator()),
            ),
            error: (error, _) => Padding(
              padding: const EdgeInsets.only(top: AppSpacing.xl),
              child: EmptyState(
                icon: Icons.error_outline_rounded,
                title: 'Could not load insights',
                message: '$error',
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _RangeSelector extends StatelessWidget {
  const _RangeSelector({
    required this.ranges,
    required this.selected,
    required this.onSelected,
  });

  final List<int> ranges;
  final int selected;
  final ValueChanged<int> onSelected;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        const Icon(Icons.history_rounded, size: 16, color: AppColors.textMuted),
        const SizedBox(width: 6),
        Text(
          'Last',
          style: Theme.of(context)
              .textTheme
              .labelLarge
              ?.copyWith(color: AppColors.textSecondary),
        ),
        const SizedBox(width: AppSpacing.sm),
        for (final days in ranges)
          Padding(
            padding: const EdgeInsets.only(right: AppSpacing.xs),
            child: ChoiceChip(
              label: Text('$days days'),
              selected: selected == days,
              onSelected: (_) => onSelected(days),
              showCheckmark: false,
              selectedColor: AppColors.primary.withValues(alpha: 0.14),
              labelStyle: TextStyle(
                color: selected == days
                    ? AppColors.primary
                    : AppColors.textSecondary,
                fontWeight:
                    selected == days ? FontWeight.w700 : FontWeight.w500,
              ),
            ),
          ),
      ],
    );
  }
}

class _AnalyticsBody extends ConsumerWidget {
  const _AnalyticsBody({required this.data});

  final RecurringAnalytics data;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (data.overall.habits == 0) {
      return const Padding(
        padding: EdgeInsets.only(top: AppSpacing.xl),
        child: EmptyState(
          icon: Icons.insights_rounded,
          title: 'No recurring habits yet',
          message:
              'Create recurring tasks to start tracking your success rate and streaks.',
        ),
      );
    }

    final habits = [...data.habits]..sort((a, b) {
        // Active habits first, then by success rate.
        if (a.isPaused != b.isPaused) return a.isPaused ? 1 : -1;
        return b.successRate.compareTo(a.successRate);
      });

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _OverallCard(overall: data.overall),
        const SizedBox(height: AppSpacing.md),
        Text(
          'By habit',
          style: Theme.of(context)
              .textTheme
              .titleMedium
              ?.copyWith(fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: AppSpacing.xs),
        if (habits.isEmpty)
          const EmptyState(
            icon: Icons.check_circle_outline,
            title: 'No runs in this window',
            message: 'Try a longer range to see habit performance.',
          )
        else
          for (final habit in habits) ...[
            _HabitCard(habit: habit),
            const SizedBox(height: AppSpacing.sm),
          ],
      ],
    );
  }
}

class _OverallCard extends StatelessWidget {
  const _OverallCard({required this.overall});

  final RecurringAnalyticsOverall overall;

  @override
  Widget build(BuildContext context) {
    final rate = overall.successRate;
    final rateColor = _rateColor(rate);
    return SurfaceCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              _SuccessRing(percent: rate, color: rateColor, size: 76),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Overall success',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w700,
                          ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '${overall.completed} of ${overall.completed + overall.missed} due runs completed',
                      style: Theme.of(context)
                          .textTheme
                          .bodySmall
                          ?.copyWith(color: AppColors.textSecondary),
                    ),
                    const SizedBox(height: AppSpacing.xs),
                    Row(
                      children: [
                        const Icon(Icons.local_fire_department_rounded,
                            size: 16, color: AppColors.warning),
                        const SizedBox(width: 4),
                        Text(
                          'Best streak ${overall.bestStreak}',
                          style: Theme.of(context)
                              .textTheme
                              .labelLarge
                              ?.copyWith(color: AppColors.textSecondary),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          Row(
            children: [
              _MiniStat(
                label: 'Completed',
                value: '${overall.completed}',
                color: AppColors.success,
                icon: Icons.check_circle_rounded,
              ),
              const SizedBox(width: AppSpacing.sm),
              _MiniStat(
                label: 'Missed',
                value: '${overall.missed}',
                color: AppColors.danger,
                icon: Icons.cancel_rounded,
              ),
              const SizedBox(width: AppSpacing.sm),
              _MiniStat(
                label: 'Skipped',
                value: '${overall.skipped}',
                color: AppColors.textMuted,
                icon: Icons.skip_next_rounded,
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _HabitCard extends ConsumerWidget {
  const _HabitCard({required this.habit});

  final RecurringHabitStat habit;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final rateColor = _rateColor(habit.successRate);
    return SurfaceCard(
      onTap: () => _openPlanner(context, ref),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  habit.title,
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              const SizedBox(width: AppSpacing.xs),
              StatusChip(
                label: habit.isPaused ? 'Paused' : habit.repeatType,
                color: habit.isPaused ? AppColors.warning : AppColors.violet,
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.sm),
          Row(
            children: [
              Text(
                '${habit.successRate}%',
                style: Theme.of(context)
                    .textTheme
                    .titleMedium
                    ?.copyWith(color: rateColor, fontWeight: FontWeight.w800),
              ),
              const SizedBox(width: 6),
              Text(
                'success',
                style: Theme.of(context)
                    .textTheme
                    .bodySmall
                    ?.copyWith(color: AppColors.textMuted),
              ),
              const Spacer(),
              if (habit.currentStreak > 0) ...[
                const Icon(Icons.local_fire_department_rounded,
                    size: 15, color: AppColors.warning),
                const SizedBox(width: 2),
                Text(
                  '${habit.currentStreak}',
                  style: Theme.of(context).textTheme.labelLarge?.copyWith(
                        color: AppColors.textSecondary,
                        fontWeight: FontWeight.w700,
                      ),
                ),
                const SizedBox(width: AppSpacing.sm),
              ],
              Text(
                '${habit.onTimeRate}% on-time',
                style: Theme.of(context)
                    .textTheme
                    .bodySmall
                    ?.copyWith(color: AppColors.textMuted),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.xs),
          ClipRRect(
            borderRadius: BorderRadius.circular(999),
            child: LinearProgressIndicator(
              value: habit.successRate / 100,
              minHeight: 6,
              backgroundColor: AppColors.border,
              valueColor: AlwaysStoppedAnimation<Color>(rateColor),
            ),
          ),
          if (habit.recentRuns.isNotEmpty) ...[
            const SizedBox(height: AppSpacing.sm),
            _RunSparkline(runs: habit.recentRuns),
          ],
        ],
      ),
    );
  }

  void _openPlanner(BuildContext context, WidgetRef ref) {
    final templates =
        ref.read(recurringTemplatesProvider).valueOrNull ?? const [];
    final projectId = ref.read(recurringSelectedProjectIdProvider);
    RecurringTemplate? match;
    for (final t in templates) {
      if (t.id == habit.templateId) {
        match = t;
        break;
      }
    }
    if (match == null || projectId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Open the Series tab to view details.')),
      );
      return;
    }
    showRecurringPlannerSheet(
      context: context,
      ref: ref,
      template: match,
      projectId: projectId,
    );
  }
}

/// Row of small squares showing recent run outcomes (oldest → newest).
class _RunSparkline extends StatelessWidget {
  const _RunSparkline({required this.runs});

  final List<String> runs;

  @override
  Widget build(BuildContext context) {
    Color colorFor(String state) {
      switch (state) {
        case 'completed':
          return AppColors.success;
        case 'missed':
          return AppColors.danger;
        case 'skipped':
          return AppColors.warning.withValues(alpha: 0.55);
        default:
          return AppColors.border;
      }
    }

    return Wrap(
      spacing: 3,
      runSpacing: 3,
      children: [
        for (final state in runs)
          Container(
            width: 12,
            height: 12,
            decoration: BoxDecoration(
              color: colorFor(state),
              borderRadius: BorderRadius.circular(3),
            ),
          ),
      ],
    );
  }
}

class _SuccessRing extends StatelessWidget {
  const _SuccessRing({
    required this.percent,
    required this.color,
    this.size = 72,
  });

  final int percent;
  final Color color;
  final double size;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: Stack(
        alignment: Alignment.center,
        children: [
          SizedBox(
            width: size,
            height: size,
            child: CircularProgressIndicator(
              value: percent / 100,
              strokeWidth: 7,
              backgroundColor: AppColors.border,
              valueColor: AlwaysStoppedAnimation<Color>(color),
            ),
          ),
          Text(
            '$percent%',
            style: Theme.of(context)
                .textTheme
                .titleMedium
                ?.copyWith(color: color, fontWeight: FontWeight.w800),
          ),
        ],
      ),
    );
  }
}

class _MiniStat extends StatelessWidget {
  const _MiniStat({
    required this.label,
    required this.value,
    required this.color,
    required this.icon,
  });

  final String label;
  final String value;
  final Color color;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.sm, vertical: AppSpacing.xs),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, size: 14, color: color),
                const SizedBox(width: 4),
                Text(
                  value,
                  style: Theme.of(context)
                      .textTheme
                      .titleMedium
                      ?.copyWith(color: color, fontWeight: FontWeight.w700),
                ),
              ],
            ),
            const SizedBox(height: 2),
            Text(
              label,
              style: Theme.of(context)
                  .textTheme
                  .labelSmall
                  ?.copyWith(color: AppColors.textSecondary),
            ),
          ],
        ),
      ),
    );
  }
}

Color _rateColor(int rate) {
  if (rate >= 80) return AppColors.success;
  if (rate >= 50) return AppColors.warning;
  return AppColors.danger;
}

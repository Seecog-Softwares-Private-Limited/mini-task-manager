import 'package:flutter/material.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../data/models/home_dashboard.dart';
import '../../shared/widgets/app_widgets.dart';

/// Deep orange used for the Project badge on Home due cards.
const Color kHomeDueProjectColor = Color(0xFFE65100);

/// Shared Due Tasks / Due from Planner card. Leads with the most specific
/// item (subtask, else task) as the real heading, with the project as a
/// small badge and the parent task as a muted breadcrumb — not a raw
/// "Project : / Task : / Sub Task :" label dump.
class HomeDueItemCard extends StatelessWidget {
  const HomeDueItemCard({
    super.key,
    required this.item,
    required this.onTap,
  });

  final HomeDueTodayItem item;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final statusColor = _statusColor(item.displayBucket);
    final isOverdue = item.displayBucket == 2;
    final hasSubItem = item.subtaskLabel != null;
    final title = item.subtaskLabel ?? item.taskLabel;
    final parentLabel = item.fromPlanner ? item.taskLabel : item.taskLabel;
    final textTheme = Theme.of(context).textTheme;

    return SurfaceCard(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.sm,
        vertical: AppSpacing.sm,
      ),
      onTap: onTap,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 4,
            height: 44,
            margin: const EdgeInsets.only(top: 2),
            decoration: BoxDecoration(
              color: statusColor,
              borderRadius: BorderRadius.circular(999),
            ),
          ),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Flexible(
                      child: _Badge(
                        label: item.projectLabel,
                        color: kHomeDueProjectColor,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w700,
                    height: 1.2,
                  ),
                ),
                if (hasSubItem) ...[
                  const SizedBox(height: 2),
                  Text(
                    parentLabel,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: textTheme.bodySmall?.copyWith(
                      color: AppColors.textMuted,
                    ),
                  ),
                ],
                const SizedBox(height: 6),
                Row(
                  children: [
                    Icon(
                      isOverdue
                          ? Icons.error_outline_rounded
                          : Icons.schedule_rounded,
                      size: 13,
                      color: isOverdue ? AppColors.danger : AppColors.textMuted,
                    ),
                    const SizedBox(width: 4),
                    Flexible(
                      child: Text(
                        item.dueFooterLabel,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: textTheme.labelSmall?.copyWith(
                          color: isOverdue ? AppColors.danger : AppColors.textMuted,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(width: 4),
          const Padding(
            padding: EdgeInsets.only(top: 2),
            child: Icon(
              Icons.chevron_right_rounded,
              size: 20,
              color: AppColors.textMuted,
            ),
          ),
        ],
      ),
    );
  }
}

class _Badge extends StatelessWidget {
  const _Badge({required this.label, required this.color});

  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        label,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: Theme.of(context).textTheme.labelSmall?.copyWith(
              color: color,
              fontWeight: FontWeight.w700,
            ),
      ),
    );
  }
}

/// Left bar color mirrors display status (not priority).
Color _statusColor(int bucket) {
  switch (bucket) {
    case 0:
      return AppColors.textMuted; // no date
    case 1:
      return AppColors.sky; // today / remaining
    case 2:
      return AppColors.danger; // overdue
    case 3:
      return AppColors.warning; // in progress
    case 4:
      return AppColors.success; // done
    default:
      return AppColors.sky;
  }
}

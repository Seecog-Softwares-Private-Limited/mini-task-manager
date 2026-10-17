import 'package:flutter/material.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../data/models/home_dashboard.dart';
import '../../shared/widgets/app_widgets.dart';

/// Deep orange used for the Project line on Home due cards.
const Color kHomeDueProjectColor = Color(0xFFE65100);

/// Shared Due Tasks / Due from Planner card:
/// Project : … (deep orange)
/// Task : …
/// Sub Task : … (when present)
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
    final color = _priorityColor(item.subtask?.priority ?? item.task.priority);
    final subLabel = item.subtaskLabel;
    final labelStyle = Theme.of(context).textTheme.labelSmall?.copyWith(
          color: AppColors.textMuted,
          fontWeight: FontWeight.w600,
        );
    final valueStyle = Theme.of(context).textTheme.titleSmall?.copyWith(
          fontWeight: FontWeight.w700,
          color: AppColors.textPrimary,
          height: 1.25,
        );

    Widget labeled(String label, String value, {Color? valueColor}) {
      return Padding(
        padding: const EdgeInsets.only(bottom: 4),
        child: RichText(
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
          text: TextSpan(
            style: valueStyle,
            children: [
              TextSpan(text: '$label ', style: labelStyle),
              TextSpan(
                text: value,
                style: valueStyle?.copyWith(
                  color: valueColor ?? AppColors.textPrimary,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
        ),
      );
    }

    return SurfaceCard(
      padding: const EdgeInsets.all(AppSpacing.sm),
      onTap: onTap,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 4,
            height: subLabel == null ? 56 : 78,
            margin: const EdgeInsets.only(top: 2),
            decoration: BoxDecoration(
              color: color,
              borderRadius: BorderRadius.circular(4),
            ),
          ),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                labeled(
                  'Project :',
                  item.projectLabel,
                  valueColor: kHomeDueProjectColor,
                ),
                labeled('Task :', item.taskLabel),
                if (subLabel != null) labeled('Sub Task :', subLabel),
              ],
            ),
          ),
          const SizedBox(width: AppSpacing.xs),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              StatusChip(
                label: item.statusLabel,
                color: switch (item.displayBucket) {
                  0 => AppColors.textMuted,
                  1 => AppColors.sky,
                  2 => AppColors.danger,
                  3 => AppColors.warning,
                  4 => AppColors.success,
                  _ => AppColors.sky,
                },
              ),
              const SizedBox(height: 6),
              const Icon(
                Icons.chevron_right_rounded,
                color: AppColors.textMuted,
              ),
            ],
          ),
        ],
      ),
    );
  }
}

Color _priorityColor(String priority) {
  switch (priority.toLowerCase()) {
    case 'critical':
    case 'urgent':
    case 'high':
      return AppColors.danger;
    case 'low':
      return AppColors.textMuted;
    default:
      return AppColors.sky;
  }
}

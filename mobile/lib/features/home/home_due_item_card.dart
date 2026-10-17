import 'package:flutter/material.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../data/models/home_dashboard.dart';
import '../../shared/widgets/app_widgets.dart';

/// Deep orange used for the Project line on Home due cards.
const Color kHomeDueProjectColor = Color(0xFFE65100);

/// Shared Due Tasks / Due from Planner card:
/// Board: Project / Task / Sub Task
/// Planner: Project / Series / Task
///
/// Compact layout: status is the left accent bar (no status chip),
/// with due date/time at the bottom.
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
    final subLabel = item.subtaskLabel;
    final planner = item.fromPlanner;
    final midLabel = planner ? 'Series :' : 'Task :';
    final itemLabel = planner ? 'Task :' : 'Sub Task :';
    final labelStyle = Theme.of(context).textTheme.labelSmall?.copyWith(
          color: AppColors.textMuted,
          fontWeight: FontWeight.w600,
          fontSize: 11,
          height: 1.15,
        );
    final valueStyle = Theme.of(context).textTheme.titleSmall?.copyWith(
          fontWeight: FontWeight.w700,
          color: AppColors.textPrimary,
          fontSize: 13,
          height: 1.2,
        );
    final dueStyle = Theme.of(context).textTheme.labelSmall?.copyWith(
          color: item.displayBucket == 2
              ? AppColors.danger
              : AppColors.textMuted,
          fontWeight: FontWeight.w600,
          fontSize: 11,
          height: 1.1,
        );

    Widget labeled(String label, String value, {Color? valueColor}) {
      return Padding(
        padding: const EdgeInsets.only(bottom: 2),
        child: RichText(
          maxLines: 1,
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
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.sm,
        vertical: 8,
      ),
      onTap: onTap,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Container(
            width: 3.5,
            height: subLabel == null ? 48 : 62,
            decoration: BoxDecoration(
              color: statusColor,
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
                labeled(midLabel, item.taskLabel),
                if (subLabel != null) labeled(itemLabel, subLabel),
                const SizedBox(height: 2),
                Text(
                  item.dueFooterLabel,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: dueStyle,
                ),
              ],
            ),
          ),
          const SizedBox(width: 4),
          const Icon(
            Icons.chevron_right_rounded,
            size: 20,
            color: AppColors.textMuted,
          ),
        ],
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

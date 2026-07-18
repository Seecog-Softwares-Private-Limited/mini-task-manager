import 'package:flutter/material.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';

/// Compact location toggle — whole row is tappable.
class RequireLocationToggle extends StatelessWidget {
  const RequireLocationToggle({
    super.key,
    required this.value,
    required this.onChanged,
    this.title = 'Require location',
    this.subtitle = 'Ask for GPS when this is marked done',
    this.enabled = true,
  });

  final bool value;
  final ValueChanged<bool>? onChanged;
  final String title;
  final String subtitle;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    final interactive = enabled && onChanged != null;

    void toggle() {
      if (!interactive) return;
      onChanged!(!value);
    }

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: interactive ? toggle : null,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 2),
          child: Opacity(
            opacity: interactive ? 1 : 0.55,
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                Icon(
                  value ? Icons.location_on_rounded : Icons.location_on_outlined,
                  size: 20,
                  color: value ? AppColors.primary : AppColors.textMuted,
                ),
                const SizedBox(width: AppSpacing.sm),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        title,
                        style: Theme.of(context).textTheme.titleSmall?.copyWith(
                              fontWeight: FontWeight.w600,
                              height: 1.2,
                            ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        subtitle,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: AppColors.textMuted,
                              height: 1.25,
                            ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: AppSpacing.sm),
                // Keep Switch at native size so taps register (FittedBox broke hits).
                Switch.adaptive(
                  value: value,
                  onChanged: interactive ? onChanged : null,
                  activeTrackColor: AppColors.primary,
                  materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

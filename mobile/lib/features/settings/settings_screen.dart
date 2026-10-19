import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/messaging/app_messenger.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../shared/widgets/app_widgets.dart';
import '../auth/session_controller.dart';
import 'manage_workspaces_screen.dart';
import 'task_status_colors_screen.dart';

/// Bottom-nav Settings tab — hub for configuration options.
class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final org = ref.watch(selectedOrgProvider);
    final isOwner = (org?.myRole ?? '').toLowerCase() == 'owner';

    void requireOwner(VoidCallback action) {
      if (!isOwner) {
        showAppMessage(
          'Only owner can access the workspace configurations',
          isError: true,
        );
        return;
      }
      action();
    }

    return ListView(
      padding: const EdgeInsets.all(AppSpacing.md),
      children: [
        Text(
          'Configuration',
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w700,
              ),
        ),
        if (!isOwner) ...[
          const SizedBox(height: AppSpacing.xs),
          Text(
            'Only owner can access the workspace configurations',
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: AppColors.textMuted,
                ),
          ),
        ],
        const SizedBox(height: AppSpacing.sm),
        _SettingsTile(
          icon: Icons.apartment_rounded,
          iconColor: AppColors.primary,
          title: 'Manage workspace and projects',
          subtitle: 'Create, edit, and delete workspaces and their projects',
          enabled: isOwner,
          onTap: () => requireOwner(() {
            Navigator.of(context).push(
              MaterialPageRoute<void>(
                builder: (_) => const ManageWorkspacesScreen(),
              ),
            );
          }),
        ),
        const SizedBox(height: AppSpacing.sm),
        _SettingsTile(
          icon: Icons.palette_outlined,
          iconColor: AppColors.violet,
          title: 'Task status colors',
          subtitle: 'Pick colors for To Do, In Progress, and Done',
          enabled: isOwner,
          onTap: () => requireOwner(() {
            Navigator.of(context).push(
              MaterialPageRoute<void>(
                builder: (_) => const TaskStatusColorsScreen(),
              ),
            );
          }),
        ),
      ],
    );
  }
}

class _SettingsTile extends StatelessWidget {
  const _SettingsTile({
    required this.icon,
    required this.iconColor,
    required this.title,
    required this.subtitle,
    required this.onTap,
    this.enabled = true,
  });

  final IconData icon;
  final Color iconColor;
  final String title;
  final String subtitle;
  final VoidCallback onTap;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    final effectiveIconColor =
        enabled ? iconColor : AppColors.textMuted.withValues(alpha: 0.55);
    final titleColor = enabled
        ? null
        : AppColors.textMuted.withValues(alpha: 0.85);
    final subtitleColor = enabled
        ? AppColors.textMuted
        : AppColors.textMuted.withValues(alpha: 0.65);

    return Opacity(
      opacity: enabled ? 1 : 0.72,
      child: SurfaceCard(
        onTap: onTap,
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: effectiveIconColor.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: effectiveIconColor),
            ),
            const SizedBox(width: AppSpacing.sm),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: Theme.of(context).textTheme.titleSmall?.copyWith(
                          color: titleColor,
                        ),
                  ),
                  Text(
                    subtitle,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: subtitleColor,
                        ),
                  ),
                ],
              ),
            ),
            Icon(
              enabled ? Icons.chevron_right_rounded : Icons.lock_outline_rounded,
              color: AppColors.textMuted.withValues(alpha: enabled ? 1 : 0.7),
              size: enabled ? 24 : 20,
            ),
          ],
        ),
      ),
    );
  }
}

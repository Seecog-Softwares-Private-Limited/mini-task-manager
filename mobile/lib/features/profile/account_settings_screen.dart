import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_exception.dart';
import '../../core/messaging/app_messenger.dart';
import '../../core/preferences/app_preferences.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../data/repositories/users_repository.dart';
import '../../shared/widgets/app_widgets.dart';
import '../../shared/widgets/workspace_avatar.dart';
import '../auth/session_controller.dart';
import '../workspaces/workspace_settings_sheet.dart';
import '../workspaces/workspace_switcher_sheet.dart';
import '../billing/plans_billing_screen.dart';
import 'my_profile_screen.dart';
import 'security_screen.dart';

class AccountSettingsScreen extends ConsumerWidget {
  const AccountSettingsScreen({super.key});

  Future<void> _confirmDeleteAccount(BuildContext context, WidgetRef ref) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete account?'),
        content: const Text(
          'This will permanently delete your account and all your data. '
          'This action cannot be undone.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Cancel'),
          ),
          TextButton(
            style: TextButton.styleFrom(foregroundColor: AppColors.danger),
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('Delete my account'),
          ),
        ],
      ),
    );

    if (confirmed != true || !context.mounted) return;

    try {
      await ref.read(usersRepositoryProvider).deleteAccount();
      if (context.mounted) {
        await ref.read(sessionControllerProvider.notifier).logout();
      }
    } on ApiException catch (e) {
      showAppMessage(e.message, isError: true);
    } catch (_) {
      showAppMessage('Could not delete account. Please try again.', isError: true);
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(sessionControllerProvider);
    final org = ref.watch(selectedOrgProvider);
    final themeMode = ref.watch(themeModeProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Account Settings')),
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.md),
        children: [
          _SettingsTile(
            icon: Icons.person_outline_rounded,
            iconColor: AppColors.violet,
            title: 'My Profile',
            subtitle: 'Your photo, name, and personal details',
            onTap: () => Navigator.of(context).push(
              MaterialPageRoute<void>(builder: (_) => const MyProfileScreen()),
            ),
          ),
          _SettingsTile(
            icon: Icons.lock_outline_rounded,
            iconColor: AppColors.sky,
            title: 'Password',
            subtitle: 'Change your account password',
            onTap: () => Navigator.of(context).push(
              MaterialPageRoute<void>(builder: (_) => const SecurityScreen()),
            ),
          ),
          // Apple App Store policy: digital subscriptions must use Apple IAP.
          // The Plans & Pricing screen uses a third-party payment provider and
          // is therefore only shown on Android / web builds.
          if (defaultTargetPlatform != TargetPlatform.iOS)
            _SettingsTile(
              icon: Icons.workspace_premium_rounded,
              iconColor: AppColors.warning,
              title: 'Plans & Pricing',
              subtitle: 'View plans and upgrade your account',
              onTap: () => Navigator.of(context).push(
                MaterialPageRoute<void>(builder: (_) => const PlansBillingScreen()),
              ),
            ),
          _SettingsTile(
            icon: Icons.business_outlined,
            iconColor: AppColors.primary,
            title: 'Workspace',
            subtitle: 'Name and workspace icon',
            onTap: org == null
                ? null
                : () => showWorkspaceSettingsSheet(
                      context: context,
                      ref: ref,
                      organizationId: org.id,
                    ),
          ),
          const SizedBox(height: AppSpacing.sm),
          SurfaceCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Appearance', style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: AppSpacing.sm),
                SegmentedButton<ThemeMode>(
                  segments: const [
                    ButtonSegment(value: ThemeMode.light, label: Text('Light')),
                    ButtonSegment(value: ThemeMode.dark, label: Text('Dark')),
                    ButtonSegment(value: ThemeMode.system, label: Text('Auto')),
                  ],
                  selected: {themeMode},
                  onSelectionChanged: (selection) {
                    ref.read(themeModeProvider.notifier).setThemeMode(selection.first);
                  },
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.sm),
          SurfaceCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Danger zone', style: Theme.of(context).textTheme.titleMedium?.copyWith(color: AppColors.danger)),
                const SizedBox(height: AppSpacing.xs),
                Text(
                  'Permanently delete your account and all associated data. This cannot be undone.',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.textMuted),
                ),
                const SizedBox(height: AppSpacing.sm),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton(
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.danger,
                      side: BorderSide(color: AppColors.danger.withValues(alpha: 0.4)),
                    ),
                    onPressed: () => _confirmDeleteAccount(context, ref),
                    child: const Text('Delete my account'),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.sm),
          SurfaceCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Current workspace', style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: AppSpacing.sm),
                Row(
                  children: [
                    WorkspaceAvatar(
                      logoUrl: org?.logoUrl,
                      name: org?.name ?? 'Workspace',
                      size: 40,
                    ),
                    const SizedBox(width: AppSpacing.sm),
                    Expanded(child: Text(org?.name ?? session.orgId ?? 'Not selected')),
                  ],
                ),
                const SizedBox(height: AppSpacing.sm),
                SecondaryButton(
                  label: 'Switch workspace',
                  onPressed: () => showWorkspaceSwitcherSheet(context: context, ref: ref),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _SettingsTile extends StatelessWidget {
  const _SettingsTile({
    required this.icon,
    required this.iconColor,
    required this.title,
    required this.subtitle,
    this.onTap,
  });

  final IconData icon;
  final Color iconColor;
  final String title;
  final String subtitle;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
      child: SurfaceCard(
        onTap: onTap,
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: iconColor.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: iconColor),
            ),
            const SizedBox(width: AppSpacing.sm),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: Theme.of(context).textTheme.titleSmall),
                  Text(subtitle, style: Theme.of(context).textTheme.bodySmall),
                ],
              ),
            ),
            const Icon(Icons.chevron_right_rounded, color: AppColors.textMuted),
          ],
        ),
      ),
    );
  }
}

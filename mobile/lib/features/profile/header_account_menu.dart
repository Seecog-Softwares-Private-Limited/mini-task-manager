import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/router/app_router.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../shared/widgets/user_avatar.dart';
import '../auth/session_controller.dart';
import 'account_settings_screen.dart';
import 'my_profile_screen.dart';
import 'security_screen.dart';

class HeaderAccountMenu extends ConsumerWidget {
  const HeaderAccountMenu({
    super.key,
    this.onOpenProfileTab,
  });

  final VoidCallback? onOpenProfileTab;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(sessionControllerProvider);
    final user = session.user;
    final org = ref.watch(selectedOrgProvider);
    final role = org?.myRole;

    final displayName = user != null &&
            user.fullName.trim().isNotEmpty &&
            user.fullName != user.email
        ? user.fullName
        : user?.email ?? 'Account';

    return PopupMenuButton<_AccountAction>(
      tooltip: 'Account menu',
      offset: const Offset(0, 44),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      onSelected: (action) async {
        switch (action) {
          case _AccountAction.myProfile:
            onOpenProfileTab?.call();
            await Navigator.of(context).push(
              MaterialPageRoute<void>(builder: (_) => const MyProfileScreen()),
            );
          case _AccountAction.feedbacks:
            if (context.mounted) context.push(AppRoutes.feedbacks);
          case _AccountAction.accountSettings:
            onOpenProfileTab?.call();
            await Navigator.of(context).push(
              MaterialPageRoute<void>(builder: (_) => const AccountSettingsScreen()),
            );
          case _AccountAction.security:
            onOpenProfileTab?.call();
            await Navigator.of(context).push(
              MaterialPageRoute<void>(builder: (_) => const SecurityScreen()),
            );
          case _AccountAction.logout:
            await ref.read(sessionControllerProvider.notifier).logout();
            if (context.mounted) context.go(AppRoutes.login);
        }
      },
      itemBuilder: (context) => [
        PopupMenuItem<_AccountAction>(
          enabled: false,
          child: Row(
            children: [
              UserAvatar(user: user, size: 36),
              const SizedBox(width: AppSpacing.sm),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      displayName,
                      style: Theme.of(context).textTheme.titleSmall,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    if (role != null || user?.email != null)
                      Text(
                        [
                          if (role != null) role[0].toUpperCase() + role.substring(1),
                          if (user?.email != null) user!.email,
                        ].join(' · '),
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: AppColors.textMuted,
                            ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                  ],
                ),
              ),
            ],
          ),
        ),
        const PopupMenuDivider(),
        const PopupMenuItem(
          value: _AccountAction.myProfile,
          child: _MenuRow(icon: Icons.person_outline_rounded, label: 'My Profile'),
        ),
        const PopupMenuItem(
          value: _AccountAction.feedbacks,
          child: _MenuRow(icon: Icons.auto_awesome_rounded, label: 'Feedbacks'),
        ),
        const PopupMenuItem(
          value: _AccountAction.accountSettings,
          child: _MenuRow(icon: Icons.settings_outlined, label: 'Account Settings'),
        ),
        const PopupMenuItem(
          value: _AccountAction.security,
          child: _MenuRow(icon: Icons.verified_user_outlined, label: 'Security'),
        ),
        const PopupMenuDivider(),
        const PopupMenuItem(
          value: _AccountAction.logout,
          child: _MenuRow(
            icon: Icons.logout_rounded,
            label: 'Log out',
            color: AppColors.danger,
          ),
        ),
      ],
      child: Padding(
        padding: const EdgeInsets.only(right: AppSpacing.sm),
        child: UserAvatar(user: user, size: 34, showOnlineIndicator: true),
      ),
    );
  }
}

enum _AccountAction { myProfile, feedbacks, accountSettings, security, logout }

class _MenuRow extends StatelessWidget {
  const _MenuRow({
    required this.icon,
    required this.label,
    this.color,
  });

  final IconData icon;
  final String label;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final tint = color ?? Theme.of(context).colorScheme.onSurface;
    return Row(
      children: [
        Icon(icon, size: 18, color: tint),
        const SizedBox(width: AppSpacing.sm),
        Text(label, style: TextStyle(color: tint)),
      ],
    );
  }
}

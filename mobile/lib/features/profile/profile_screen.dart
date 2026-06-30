import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/router/app_router.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../shared/widgets/app_widgets.dart';
import '../../shared/widgets/user_avatar.dart';
import '../auth/session_controller.dart';
import 'account_settings_screen.dart';
import 'my_profile_screen.dart';
import 'security_screen.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

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

    return ListView(
      padding: const EdgeInsets.all(AppSpacing.md),
      children: [
        SurfaceCard(
          child: Row(
            children: [
              UserAvatar(user: user, size: 56, showOnlineIndicator: true),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(displayName, style: Theme.of(context).textTheme.titleLarge),
                    const SizedBox(height: 4),
                    Text(
                      [
                        if (role != null) role[0].toUpperCase() + role.substring(1),
                        if (user?.email != null) user!.email,
                      ].join(' · '),
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: AppColors.textMuted,
                          ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: AppSpacing.md),
        _ProfileMenuTile(
          icon: Icons.person_outline_rounded,
          label: 'My Profile',
          onTap: () => Navigator.of(context).push(
            MaterialPageRoute<void>(builder: (_) => const MyProfileScreen()),
          ),
        ),
        _ProfileMenuTile(
          icon: Icons.settings_outlined,
          label: 'Account Settings',
          onTap: () => Navigator.of(context).push(
            MaterialPageRoute<void>(builder: (_) => const AccountSettingsScreen()),
          ),
        ),
        _ProfileMenuTile(
          icon: Icons.verified_user_outlined,
          label: 'Security',
          onTap: () => Navigator.of(context).push(
            MaterialPageRoute<void>(builder: (_) => const SecurityScreen()),
          ),
        ),
        const SizedBox(height: AppSpacing.sm),
        SurfaceCard(
          onTap: () async {
            await ref.read(sessionControllerProvider.notifier).logout();
            if (context.mounted) context.go(AppRoutes.login);
          },
          child: Row(
            children: [
              Icon(Icons.logout_rounded, color: AppColors.danger, size: 20),
              const SizedBox(width: AppSpacing.sm),
              Text(
                'Log out',
                style: Theme.of(context).textTheme.titleSmall?.copyWith(
                      color: AppColors.danger,
                    ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _ProfileMenuTile extends StatelessWidget {
  const _ProfileMenuTile({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
      child: SurfaceCard(
        onTap: onTap,
        child: Row(
          children: [
            Icon(icon, size: 20),
            const SizedBox(width: AppSpacing.sm),
            Expanded(child: Text(label, style: Theme.of(context).textTheme.titleSmall)),
            const Icon(Icons.chevron_right_rounded, color: AppColors.textMuted),
          ],
        ),
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';
import '../../core/theme/app_colors.dart';
import '../../core/utils/workspace_logo.dart';
import '../../data/models/login_response.dart';

String resolveUserAvatarUrl(String apiBaseUrl, String? avatarUrl) {
  if (avatarUrl == null || avatarUrl.isEmpty) return '';
  if (avatarUrl.startsWith('http')) return avatarUrl;
  final origin = apiBaseUrl.replaceAll(RegExp(r'/api/v1$'), '');
  if (avatarUrl.startsWith('/')) return '$origin$avatarUrl';
  return '$origin/$avatarUrl';
}

class UserAvatar extends ConsumerWidget {
  const UserAvatar({
    super.key,
    required this.user,
    this.size = 40,
    this.showOnlineIndicator = false,
  });

  final AuthUser? user;
  final double size;
  final bool showOnlineIndicator;

  Widget _initialsAvatar(String initials) {
    return Container(
      width: size,
      height: size,
      decoration: const BoxDecoration(
        shape: BoxShape.circle,
        gradient: LinearGradient(
          colors: [AppColors.primary, AppColors.violet],
        ),
      ),
      alignment: Alignment.center,
      child: Text(
        initials,
        style: TextStyle(
          color: Colors.white,
          fontWeight: FontWeight.w700,
          fontSize: size * 0.34,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final config = ref.watch(appConfigProvider);
    final name = user?.fullName ?? user?.email ?? '?';
    final initials = workspaceInitials(name);
    final imageUrl = resolveUserAvatarUrl(config.apiBaseUrl, user?.avatarUrl);
    final cacheSize = (size * MediaQuery.devicePixelRatioOf(context)).round();

    final Widget avatar;
    if (imageUrl.isEmpty) {
      avatar = _initialsAvatar(initials);
    } else {
      avatar = ClipOval(
        child: Image.network(
          imageUrl,
          width: size,
          height: size,
          fit: BoxFit.cover,
          cacheWidth: cacheSize,
          cacheHeight: cacheSize,
          errorBuilder: (_, __, ___) => _initialsAvatar(initials),
        ),
      );
    }

    if (!showOnlineIndicator) return avatar;

    return Stack(
      clipBehavior: Clip.none,
      children: [
        avatar,
        Positioned(
          right: 0,
          bottom: 0,
          child: Container(
            width: size * 0.28,
            height: size * 0.28,
            decoration: BoxDecoration(
              color: AppColors.success,
              shape: BoxShape.circle,
              border: Border.all(color: Theme.of(context).scaffoldBackgroundColor, width: 2),
            ),
          ),
        ),
      ],
    );
  }
}

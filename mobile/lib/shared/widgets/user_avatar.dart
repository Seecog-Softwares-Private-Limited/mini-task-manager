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

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final config = ref.watch(appConfigProvider);
    final name = user?.fullName ?? user?.email ?? '?';
    final initials = workspaceInitials(name);
    final imageUrl = resolveUserAvatarUrl(config.apiBaseUrl, user?.avatarUrl);

    Widget avatar = Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: imageUrl.isEmpty
            ? const LinearGradient(
                colors: [AppColors.primary, AppColors.violet],
              )
            : null,
        image: imageUrl.isNotEmpty
            ? DecorationImage(
                image: NetworkImage(imageUrl),
                fit: BoxFit.cover,
              )
            : null,
      ),
      alignment: Alignment.center,
      child: imageUrl.isEmpty
          ? Text(
              initials,
              style: TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w700,
                fontSize: size * 0.34,
              ),
            )
          : null,
    );

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

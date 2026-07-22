import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';
import '../../core/theme/app_colors.dart';
import '../../core/utils/workspace_logo.dart';
import '../../data/models/login_response.dart';

/// Hosts that should be rewritten to the current API origin (migrated AWS / local).
const _staleAvatarHosts = <String>{
  'localhost',
  '127.0.0.1',
  '10.0.2.2',
  '3.110.214.243',
};

String apiOriginFromBaseUrl(String apiBaseUrl) {
  return apiBaseUrl.replaceAll(RegExp(r'/api/v1/?$'), '');
}

/// Resolves a stored avatar path/URL against the active API origin.
String resolveUserAvatarUrl(String apiBaseUrl, String? avatarUrl) {
  final origin = apiOriginFromBaseUrl(apiBaseUrl);
  final trimmed = avatarUrl?.trim() ?? '';

  if (trimmed.isNotEmpty) {
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      final uri = Uri.tryParse(trimmed);
      if (uri != null && _staleAvatarHosts.contains(uri.host)) {
        final path = uri.path.isEmpty ? '/' : uri.path;
        return '$origin$path${uri.hasQuery ? '?${uri.query}' : ''}';
      }
      return trimmed;
    }
    if (trimmed.startsWith('/')) return '$origin$trimmed';
    return '$origin/$trimmed';
  }

  // Prefer an explicit avatar URL. Do not probe /users/avatar/:id — missing
  // avatars 404 and spam the browser console on every list render.
  return '';
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
    final imageUrl = resolveUserAvatarUrl(
      config.apiBaseUrl,
      user?.avatarUrl,
    );
    final cacheSize = (size * MediaQuery.devicePixelRatioOf(context)).round();

    final Widget avatar;
    if (imageUrl.isEmpty) {
      avatar = _initialsAvatar(initials);
    } else {
      avatar = SizedBox(
        width: size,
        height: size,
        child: ClipOval(
          child: Image.network(
            imageUrl,
            width: size,
            height: size,
            fit: BoxFit.cover,
            cacheWidth: cacheSize,
            cacheHeight: cacheSize,
            errorBuilder: (_, __, ___) => _initialsAvatar(initials),
          ),
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

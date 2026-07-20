import 'package:flutter/material.dart';

import '../../core/constants/workspace_avatar_presets.dart';
import '../../core/theme/app_colors.dart';
import '../../core/utils/workspace_logo.dart';

class WorkspacePresetAvatar extends StatelessWidget {
  const WorkspacePresetAvatar({
    super.key,
    required this.preset,
    this.size = 44,
    this.borderRadius = 12,
  });

  final WorkspaceAvatarPreset preset;
  final double size;
  final double borderRadius;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(borderRadius),
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [preset.color1, preset.color2],
          ),
          border: Border.all(color: AppColors.border.withValues(alpha: 0.35)),
        ),
        alignment: Alignment.center,
        child: Text(
          preset.emoji,
          style: TextStyle(fontSize: size * 0.47, height: 1),
        ),
      ),
    );
  }
}

class WorkspaceAvatar extends StatelessWidget {
  const WorkspaceAvatar({
    super.key,
    this.logoUrl,
    required this.name,
    this.size = 44,
    this.borderRadius = 12,
  });

  final String? logoUrl;
  final String name;
  final double size;
  final double borderRadius;

  @override
  Widget build(BuildContext context) {
    final initials = workspaceInitials(name);
    final url = logoUrl?.trim();
    final resolvedUrl =
        (url != null && url.isNotEmpty) ? url : kDefaultWorkspaceAvatar.dataUrl;
    final preset = findPresetByDataUrl(resolvedUrl);

    if (preset != null) {
      return WorkspacePresetAvatar(
        preset: preset,
        size: size,
        borderRadius: borderRadius,
      );
    }

    return ClipRRect(
      borderRadius: BorderRadius.circular(borderRadius),
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          color: AppColors.primary.withValues(alpha: 0.12),
          border: Border.all(color: AppColors.border.withValues(alpha: 0.6)),
        ),
        child: _LogoImage(url: resolvedUrl, initials: initials),
      ),
    );
  }
}

class _LogoImage extends StatelessWidget {
  const _LogoImage({required this.url, required this.initials});

  final String url;
  final String initials;

  @override
  Widget build(BuildContext context) {
    if (url.startsWith('data:image/') && !url.contains('image/svg')) {
      final bytes = decodeDataUrlBytes(url);
      if (bytes != null && bytes.isNotEmpty) {
        return Image.memory(
          bytes,
          width: double.infinity,
          height: double.infinity,
          fit: BoxFit.cover,
          errorBuilder: (_, __, ___) => _initialsFallback(),
        );
      }
    }

    if (!url.startsWith('data:')) {
      return Image.network(
        url,
        width: double.infinity,
        height: double.infinity,
        fit: BoxFit.cover,
        errorBuilder: (_, __, ___) => _initialsFallback(),
      );
    }

    return _initialsFallback();
  }

  Widget _initialsFallback() {
    return ColoredBox(
      color: AppColors.primary.withValues(alpha: 0.12),
      child: Center(
        child: Text(
          initials,
          style: const TextStyle(
            color: AppColors.primary,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
    );
  }
}

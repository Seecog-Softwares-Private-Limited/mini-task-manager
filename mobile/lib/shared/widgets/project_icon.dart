import 'package:flutter/material.dart';

import '../../core/theme/app_colors.dart';
import '../../core/utils/workspace_logo.dart';

/// Project logo tile: uploaded image when set, otherwise a letter on a gradient.
class ProjectIcon extends StatelessWidget {
  const ProjectIcon({
    super.key,
    required this.name,
    this.iconUrl,
    this.size = 48,
    this.borderRadius = 14,
  });

  final String name;
  final String? iconUrl;
  final double size;
  final double borderRadius;

  @override
  Widget build(BuildContext context) {
    final url = iconUrl?.trim();
    final hasImage = url != null && url.isNotEmpty;
    final initial = name.trim().isEmpty
        ? '?'
        : name.trim().characters.first.toUpperCase();

    return ClipRRect(
      borderRadius: BorderRadius.circular(borderRadius),
      child: SizedBox(
        width: size,
        height: size,
        child: hasImage
            ? _ProjectLogoImage(url: url, initial: initial)
            : DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [
                      AppColors.primary.withValues(alpha: 0.85),
                      AppColors.violet.withValues(alpha: 0.9),
                    ],
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.primary.withValues(alpha: 0.25),
                      blurRadius: 8,
                      offset: const Offset(0, 3),
                    ),
                  ],
                ),
                child: Center(
                  child: Text(
                    initial,
                    style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w700,
                      fontSize: size * 0.38,
                    ),
                  ),
                ),
              ),
      ),
    );
  }
}

class _ProjectLogoImage extends StatelessWidget {
  const _ProjectLogoImage({required this.url, required this.initial});

  final String url;
  final String initial;

  @override
  Widget build(BuildContext context) {
    if (url.startsWith('data:image/') && !url.contains('image/svg')) {
      final bytes = decodeDataUrlBytes(url);
      if (bytes != null && bytes.isNotEmpty) {
        return Image.memory(
          bytes,
          fit: BoxFit.cover,
          errorBuilder: (_, __, ___) => _fallback(),
        );
      }
    }
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return Image.network(
        url,
        fit: BoxFit.cover,
        errorBuilder: (_, __, ___) => _fallback(),
      );
    }
    return _fallback();
  }

  Widget _fallback() {
    return ColoredBox(
      color: AppColors.primary.withValues(alpha: 0.85),
      child: Center(
        child: Text(
          initial,
          style: const TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
    );
  }
}

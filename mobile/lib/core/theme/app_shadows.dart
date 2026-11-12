import 'package:flutter/material.dart';

import 'app_colors.dart';

/// Shared elevation specs. Kept as cheap BoxShadows (no ImageFilter blur) so
/// long scrolling lists of SurfaceCards don't pay a real-blur raster cost.
///
/// Dark surfaces don't read a cast shadow well against a dark background, so
/// card elevation in dark mode falls back to the existing 1px border instead
/// of a shadow — this is a deliberate per-brightness branch, not a shared
/// constant.
abstract final class AppShadows {
  static List<BoxShadow> cardFor(Brightness brightness) {
    if (brightness == Brightness.dark) return const [];
    return [
      BoxShadow(
        color: AppColors.textPrimary.withValues(alpha: 0.06),
        blurRadius: 12,
        offset: const Offset(0, 2),
      ),
    ];
  }

  static List<BoxShadow> raisedFor(Brightness brightness) {
    final isDark = brightness == Brightness.dark;
    return [
      BoxShadow(
        color: (isDark ? Colors.black : AppColors.textPrimary).withValues(
          alpha: isDark ? 0.35 : 0.10,
        ),
        blurRadius: 24,
        offset: const Offset(0, 8),
      ),
    ];
  }
}

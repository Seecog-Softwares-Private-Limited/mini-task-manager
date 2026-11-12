import 'package:flutter/material.dart';

import 'app_colors.dart';

/// Inter (body/UI) + Manrope (display/headlines) — bundled locally under
/// assets/fonts/ so first-run rendering never depends on a network fetch
/// (corporate networks may block Google Fonts' CDN).
abstract final class AppTypography {
  static const _display = 'Manrope';
  static const _body = 'Inter';

  static const TextTheme textTheme = TextTheme(
    displayLarge: TextStyle(
      fontFamily: _display,
      fontSize: 34,
      fontWeight: FontWeight.w700,
      color: AppColors.textPrimary,
      height: 1.15,
      letterSpacing: -0.3,
    ),
    displayMedium: TextStyle(
      fontFamily: _display,
      fontSize: 30,
      fontWeight: FontWeight.w700,
      color: AppColors.textPrimary,
      height: 1.18,
      letterSpacing: -0.3,
    ),
    displaySmall: TextStyle(
      fontFamily: _display,
      fontSize: 28,
      fontWeight: FontWeight.w700,
      color: AppColors.textPrimary,
      height: 1.2,
      letterSpacing: -0.2,
    ),
    headlineLarge: TextStyle(
      fontFamily: _display,
      fontSize: 24,
      fontWeight: FontWeight.w700,
      color: AppColors.textPrimary,
      letterSpacing: -0.2,
    ),
    headlineMedium: TextStyle(
      fontFamily: _display,
      fontSize: 22,
      fontWeight: FontWeight.w700,
      color: AppColors.textPrimary,
      letterSpacing: -0.1,
    ),
    headlineSmall: TextStyle(
      fontFamily: _display,
      fontSize: 20,
      fontWeight: FontWeight.w700,
      color: AppColors.textPrimary,
      letterSpacing: -0.1,
    ),
    titleLarge: TextStyle(
      fontFamily: _body,
      fontSize: 18,
      fontWeight: FontWeight.w600,
      color: AppColors.textPrimary,
    ),
    titleMedium: TextStyle(
      fontFamily: _body,
      fontSize: 16,
      fontWeight: FontWeight.w600,
      color: AppColors.textPrimary,
    ),
    titleSmall: TextStyle(
      fontFamily: _body,
      fontSize: 14,
      fontWeight: FontWeight.w600,
      color: AppColors.textPrimary,
    ),
    bodyLarge: TextStyle(
      fontFamily: _body,
      fontSize: 15,
      fontWeight: FontWeight.w400,
      color: AppColors.textPrimary,
      height: 1.45,
    ),
    bodyMedium: TextStyle(
      fontFamily: _body,
      fontSize: 14,
      fontWeight: FontWeight.w400,
      color: AppColors.textSecondary,
      height: 1.4,
    ),
    bodySmall: TextStyle(
      fontFamily: _body,
      fontSize: 13,
      fontWeight: FontWeight.w400,
      color: AppColors.textSecondary,
      height: 1.35,
    ),
    labelLarge: TextStyle(
      fontFamily: _body,
      fontSize: 14,
      fontWeight: FontWeight.w600,
      color: AppColors.textPrimary,
    ),
    labelMedium: TextStyle(
      fontFamily: _body,
      fontSize: 12,
      fontWeight: FontWeight.w600,
      color: AppColors.textMuted,
    ),
    labelSmall: TextStyle(
      fontFamily: _body,
      fontSize: 11,
      fontWeight: FontWeight.w600,
      color: AppColors.textMuted,
      letterSpacing: 0.2,
    ),
  );
}

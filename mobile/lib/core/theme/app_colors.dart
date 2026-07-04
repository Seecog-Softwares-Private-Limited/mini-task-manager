import 'package:flutter/material.dart';

abstract final class AppColors {
  /// Website `--primary` / `--gradient-start`: hsl(239 84% 67%)
  static const primary = Color(0xFF6467F2);
  /// Website `--gradient-end`: hsl(280 72% 60%)
  static const primaryGradientEnd = Color(0xFFB150E2);
  static const primaryDark = Color(0xFFB150E2);
  static const violet = Color(0xFF7C3AED);
  static const sky = Color(0xFF0284C7);

  static const primaryGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [primary, primaryGradientEnd],
  );

  static const background = Color(0xFFF8FAFC);
  static const surface = Color(0xFFFFFFFF);
  static const border = Color(0xFFE2E8F0);

  static const textPrimary = Color(0xFF0F172A);
  static const textSecondary = Color(0xFF475569);
  static const textMuted = Color(0xFF64748B);

  static const success = Color(0xFF059669);
  static const successSoft = Color(0xFFD1FAE5);
  static const danger = Color(0xFFE11D48);
  static const dangerSoft = Color(0xFFFFE4E6);
  static const warning = Color(0xFFD97706);
}

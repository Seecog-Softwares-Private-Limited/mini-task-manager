import 'package:flutter/material.dart';

import '../../core/branding/opspick_logo.dart';
import '../../core/theme/app_colors.dart';

/// Shown while [SessionStatus.loading] so login never flashes before restore.
class AuthSplashScreen extends StatelessWidget {
  const AuthSplashScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      backgroundColor: AppColors.background,
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            OpsPickLogo(size: 72, borderRadius: 18),
            SizedBox(height: 28),
            SizedBox(
              width: 28,
              height: 28,
              child: CircularProgressIndicator(
                strokeWidth: 2.5,
                color: AppColors.primary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

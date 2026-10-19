import 'package:flutter/material.dart';

import '../../core/theme/app_spacing.dart';
import '../../shared/widgets/app_widgets.dart';

/// Bottom-nav Settings tab stub — destination to be wired later.
class SettingsPlaceholderScreen extends StatelessWidget {
  const SettingsPlaceholderScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const Padding(
      padding: EdgeInsets.all(AppSpacing.lg),
      child: EmptyState(
        icon: Icons.settings_outlined,
        title: 'Settings',
        message: 'Coming soon.',
      ),
    );
  }
}

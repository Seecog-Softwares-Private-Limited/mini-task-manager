import 'package:flutter/material.dart';

import '../../features/billing/plans_billing_screen.dart';

final rootScaffoldMessengerKey = GlobalKey<ScaffoldMessengerState>();
final rootNavigatorKey = GlobalKey<NavigatorState>();

void showAppMessage(String message, {bool isError = false}) {
  rootScaffoldMessengerKey.currentState?.showSnackBar(
    SnackBar(
      content: Text(message),
      backgroundColor: isError ? const Color(0xFFE11D48) : null,
      behavior: SnackBarBehavior.floating,
    ),
  );
}

void showPlanLimitMessage(String message) {
  rootScaffoldMessengerKey.currentState?.showSnackBar(
    SnackBar(
      content: Text(
        message.isNotEmpty ? message : 'Plan limit reached. Upgrade to continue.',
      ),
      backgroundColor: const Color(0xFFE11D48),
      behavior: SnackBarBehavior.floating,
      action: SnackBarAction(
        label: 'Upgrade',
        textColor: Colors.white,
        onPressed: openPlansBillingScreen,
      ),
      duration: const Duration(seconds: 6),
    ),
  );
}

void openPlansBillingScreen() {
  final nav = rootNavigatorKey.currentState;
  if (nav == null) return;
  nav.push(
    MaterialPageRoute<void>(builder: (_) => const PlansBillingScreen()),
  );
}

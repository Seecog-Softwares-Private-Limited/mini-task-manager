import 'package:flutter/material.dart';

import '../../features/billing/ios_billing_gate.dart';
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
  final showUpgrade = isPlansBillingUiEnabled;
  final messenger = rootScaffoldMessengerKey.currentState;
  if (messenger == null) return;
  // Clear any earlier plan-limit snackbar instead of stacking another one.
  messenger.hideCurrentSnackBar();
  messenger.showSnackBar(
    SnackBar(
      content: Row(
        children: [
          Expanded(
            child: Text(
              message.isNotEmpty
                  ? message
                  : (showUpgrade
                      ? 'Plan limit reached. Upgrade to continue.'
                      : 'Plan limit reached for this account.'),
            ),
          ),
          const SizedBox(width: 8),
          InkWell(
            onTap: () => messenger.hideCurrentSnackBar(),
            child: const Icon(Icons.close, color: Colors.white, size: 18),
          ),
        ],
      ),
      backgroundColor: const Color(0xFFE11D48),
      behavior: SnackBarBehavior.floating,
      action: showUpgrade
          ? SnackBarAction(
              label: 'Upgrade',
              textColor: Colors.white,
              onPressed: openPlansBillingScreen,
            )
          : null,
      duration: const Duration(seconds: 6),
    ),
  );
}

void openPlansBillingScreen() {
  if (!isPlansBillingUiEnabled) return;
  final nav = rootNavigatorKey.currentState;
  if (nav == null) return;
  nav.push(
    MaterialPageRoute<void>(builder: (_) => const PlansBillingScreen()),
  );
}

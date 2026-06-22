import 'package:flutter/material.dart';

final rootScaffoldMessengerKey = GlobalKey<ScaffoldMessengerState>();

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
  showAppMessage(message, isError: true);
}

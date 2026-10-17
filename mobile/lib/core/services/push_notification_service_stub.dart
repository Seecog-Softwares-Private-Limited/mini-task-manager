import 'package:flutter/foundation.dart';

import 'push_nav.dart';

typedef OpenAlertsCallback = void Function([PushDeepLink? link]);

/// No-op push service for web (and any non-IO target).
/// Keeps Chrome free of Firebase.initializeApp / FCM requirements.
class PushNotificationService {
  PushNotificationService._();
  static final PushNotificationService instance = PushNotificationService._();

  OpenAlertsCallback? onOpenAlerts;
  void Function(String token)? onTokenRefresh;
  VoidCallback? onInitialized;

  String? get token => null;

  Future<void> get ready => Future<void>.value();

  Future<void> initialize() async {
    debugPrint('PushNotificationService: skipped on this platform (no FCM).');
    try {
      onInitialized?.call();
    } catch (_) {}
  }

  Future<String?> getToken() async => null;

  Future<void> deleteToken() async {}
}

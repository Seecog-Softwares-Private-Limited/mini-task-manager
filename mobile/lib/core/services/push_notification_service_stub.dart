import 'package:flutter/foundation.dart';

typedef OpenAlertsCallback = void Function();

/// No-op push service for web (and any non-IO target).
/// Keeps Chrome free of Firebase.initializeApp / FCM requirements.
class PushNotificationService {
  PushNotificationService._();
  static final PushNotificationService instance = PushNotificationService._();

  OpenAlertsCallback? onOpenAlerts;
  void Function(String token)? onTokenRefresh;

  String? get token => null;

  Future<void> initialize() async {
    debugPrint('PushNotificationService: skipped on this platform (no FCM).');
  }

  Future<String?> getToken() async => null;

  Future<void> deleteToken() async {}
}

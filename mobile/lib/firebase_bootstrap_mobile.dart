import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/foundation.dart';

import 'core/services/push_notification_service.dart';

/// Android / iOS: real Firebase + FCM init.
Future<void> initializeFirebaseAndPush() async {
  try {
    await Firebase.initializeApp();
    await PushNotificationService.instance.initialize();
  } catch (e, st) {
    debugPrint('Firebase/FCM init failed: $e\n$st');
  }
}

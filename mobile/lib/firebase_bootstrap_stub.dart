import 'package:flutter/foundation.dart';

/// Web / non-IO: do not import firebase_core at all.
Future<void> initializeFirebaseAndPush() async {
  debugPrint('Firebase bootstrap skipped (web / unsupported platform).');
}

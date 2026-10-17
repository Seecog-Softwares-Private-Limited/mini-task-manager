import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:permission_handler/permission_handler.dart';

import 'push_nav.dart';

/// Top-level handler required by firebase_messaging for background isolates.
@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  debugPrint('FCM background message: ${message.messageId}');
}

typedef OpenAlertsCallback = void Function([PushDeepLink? link]);

/// Real FCM implementation (Android / iOS only — imported via conditional export).
class PushNotificationService {
  PushNotificationService._();
  static final PushNotificationService instance = PushNotificationService._();

  FlutterLocalNotificationsPlugin? _local;
  FirebaseMessaging? _messaging;

  OpenAlertsCallback? onOpenAlerts;
  String? _token;
  bool _initialized = false;
  Completer<void>? _readyCompleter;

  void Function(String token)? onTokenRefresh;
  VoidCallback? onInitialized;

  String? get token => _token;

  /// Completes when [initialize] finishes (success or failure).
  Future<void> get ready {
    if (_initialized && (_readyCompleter == null || _readyCompleter!.isCompleted)) {
      return Future<void>.value();
    }
    _readyCompleter ??= Completer<void>();
    return _readyCompleter!.future;
  }

  Future<void> initialize() async {
    if (_initialized) return;
    _readyCompleter ??= Completer<void>();
    _initialized = true;

    try {
      _messaging = FirebaseMessaging.instance;
      _local = FlutterLocalNotificationsPlugin();

      FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);

      await _setupLocalNotifications();
      await _requestPermission();

      // Foreground banners are shown via flutter_local_notifications in
      // [_showForegroundNotification] (Android never auto-displays FCM in
      // foreground; iOS presentation options alone are unreliable). Keep badge.
      await _messaging!.setForegroundNotificationPresentationOptions(
        alert: false,
        badge: true,
        sound: false,
      );

      // iOS requires an APNs token before FCM token is available on device.
      if (defaultTargetPlatform == TargetPlatform.iOS) {
        await _waitForApnsToken();
      }

      // getToken() can hang indefinitely on iOS Simulator (no APNs).
      try {
        _token = await _messaging!.getToken().timeout(const Duration(seconds: 8));
        debugPrint('FCM TOKEN: $_token');
      } catch (e) {
        debugPrint('FCM getToken skipped: $e');
      }

      _messaging!.onTokenRefresh.listen((newToken) {
        _token = newToken;
        debugPrint('FCM TOKEN refreshed: $newToken');
        onTokenRefresh?.call(newToken);
      });

      FirebaseMessaging.onMessage.listen(_showForegroundNotification);

      FirebaseMessaging.onMessageOpenedApp.listen((message) {
        onOpenAlerts?.call(_deepLinkFromRemote(message));
      });

      try {
        final initial = await _messaging!
            .getInitialMessage()
            .timeout(const Duration(seconds: 2));
        if (initial != null) {
          final link = _deepLinkFromRemote(initial);
          Future.microtask(() => onOpenAlerts?.call(link));
        }
      } catch (e) {
        debugPrint('FCM getInitialMessage skipped: $e');
      }
    } finally {
      if (!(_readyCompleter?.isCompleted ?? true)) {
        _readyCompleter!.complete();
      }
      // Let session re-register after cold-start race with restoreSession.
      try {
        onInitialized?.call();
      } catch (e) {
        debugPrint('Push onInitialized callback failed: $e');
      }
    }
  }

  PushDeepLink _deepLinkFromRemote(RemoteMessage message) {
    return PushDeepLink.fromMap(
      message.data.map((key, value) => MapEntry(key, value)),
    );
  }

  PushDeepLink? _deepLinkFromLocalPayload(String? payload) {
    if (payload == null || payload.trim().isEmpty) return null;
    try {
      final decoded = jsonDecode(payload);
      if (decoded is Map) {
        return PushDeepLink.fromMap(
          decoded.map((key, value) => MapEntry(key.toString(), value)),
        );
      }
    } catch (_) {
      // Ignore malformed payloads.
    }
    return null;
  }

  Future<void> _waitForApnsToken() async {
    for (var i = 0; i < 20; i++) {
      try {
        final apns = await _messaging!.getAPNSToken();
        if (apns != null && apns.isNotEmpty) {
          debugPrint('APNs token ready');
          return;
        }
      } catch (e) {
        debugPrint('APNs token poll: $e');
      }
      await Future<void>.delayed(const Duration(milliseconds: 250));
    }
    debugPrint('APNs token not ready yet — FCM token may be delayed on iOS');
  }

  Future<void> _requestPermission() async {
    final settings = await _messaging!.requestPermission(
      alert: true,
      badge: true,
      sound: true,
      provisional: false,
    );
    debugPrint('FCM permission: ${settings.authorizationStatus}');

    if (defaultTargetPlatform == TargetPlatform.android) {
      final status = await Permission.notification.request();
      debugPrint('Android notification permission: $status');
    }
  }

  Future<void> _setupLocalNotifications() async {
    const androidInit = AndroidInitializationSettings('@mipmap/ic_launcher');
    const iosInit = DarwinInitializationSettings(
      requestAlertPermission: true,
      requestBadgePermission: true,
      requestSoundPermission: true,
    );
    await _local!.initialize(
      settings: const InitializationSettings(android: androidInit, iOS: iosInit),
      onDidReceiveNotificationResponse: (response) {
        onOpenAlerts?.call(_deepLinkFromLocalPayload(response.payload));
      },
    );

    const channel = AndroidNotificationChannel(
      'high_importance_channel',
      'High Importance Notifications',
      description: 'OpsPick alerts',
      importance: Importance.high,
      enableVibration: true,
      playSound: true,
    );
    await _local!
        .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(channel);
  }

  Future<void> _showForegroundNotification(RemoteMessage message) async {
    // Background/killed: OS shows the FCM `notification` payload automatically.
    // Foreground: Android never auto-shows; iOS only if presentation options work.
    // Always mirror to a local notification so alerts are visible while the app is open.
    if (_local == null) return;

    final notification = message.notification;
    final data = message.data;
    final title = (notification?.title?.trim().isNotEmpty == true)
        ? notification!.title!.trim()
        : (data['title']?.toString().trim().isNotEmpty == true
            ? data['title']!.toString().trim()
            : 'OpsPick');
    final body = (notification?.body?.trim().isNotEmpty == true)
        ? notification!.body!.trim()
        : (data['body']?.toString().trim().isNotEmpty == true
            ? data['body']!.toString().trim()
            : '');

    debugPrint(
      'FCM foreground: title="$title" body="$body" '
      'hasNotification=${notification != null} dataKeys=${data.keys.toList()}',
    );

    final id = message.messageId?.hashCode ??
        Object.hash(title, body, DateTime.now().millisecondsSinceEpoch);

    final link = _deepLinkFromRemote(message);
    final payload = jsonEncode(link.toPayloadMap());

    try {
      await _local!.show(
        id: id & 0x7fffffff,
        title: title,
        body: body.isEmpty ? null : body,
        payload: payload,
        notificationDetails: NotificationDetails(
          android: AndroidNotificationDetails(
            'high_importance_channel',
            'High Importance Notifications',
            channelDescription: 'OpsPick alerts',
            importance: Importance.high,
            priority: Priority.high,
            icon: '@mipmap/ic_launcher',
            enableVibration: true,
            playSound: true,
            vibrationPattern: Int64List.fromList([0, 250, 120, 250]),
          ),
          iOS: const DarwinNotificationDetails(
            presentAlert: true,
            presentBadge: true,
            presentSound: true,
          ),
        ),
      );
    } catch (e) {
      debugPrint('FCM foreground local notification failed: $e');
    }
  }

  Future<String?> getToken() async {
    // Wait for initialize() so restoreSession doesn't race past FCM setup.
    try {
      await ready.timeout(const Duration(seconds: 12));
    } catch (_) {
      debugPrint('FCM ready wait timed out');
    }

    if (_token != null && _token!.isNotEmpty) return _token;
    if (_messaging == null) return null;

    if (defaultTargetPlatform == TargetPlatform.iOS) {
      await _waitForApnsToken();
    }
    try {
      _token = await _messaging!.getToken().timeout(const Duration(seconds: 8));
    } catch (e) {
      debugPrint('FCM getToken retry skipped: $e');
    }
    return _token;
  }

  Future<void> deleteToken() async {
    try {
      await _messaging?.deleteToken();
    } catch (e) {
      debugPrint('FCM deleteToken failed: $e');
    }
    _token = null;
  }
}

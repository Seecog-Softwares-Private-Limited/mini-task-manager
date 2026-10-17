import 'dart:async';
import 'dart:convert';

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

  /// Queued until HomeShell successfully consumes the deep link.
  PushDeepLink? _queuedOpenLink;
  bool _queuedOpenAlertsOnly = false;

  void Function(String token)? onTokenRefresh;
  VoidCallback? onInitialized;

  String? get token => _token;

  /// Peek at a pending task deep-link without clearing it.
  PushDeepLink? get pendingOpenLink => _queuedOpenLink;

  /// Deliver any launch / early taps that arrived before the UI callback existed.
  void flushPendingOpen() {
    final link = _queuedOpenLink;
    final alertsOnly = _queuedOpenAlertsOnly;
    // Keep [_queuedOpenLink] until [takePendingOpenLink] so a late HomeShell
    // mount can still open the task after the tick listener was missed.
    _queuedOpenAlertsOnly = false;
    if (link != null) {
      onOpenAlerts?.call(link);
    } else if (alertsOnly) {
      onOpenAlerts?.call();
    }
  }

  /// HomeShell takes ownership of the pending deep link (clears the queue).
  PushDeepLink? takePendingOpenLink() {
    final link = _queuedOpenLink;
    _queuedOpenLink = null;
    return link;
  }

  /// Put a link back when open failed (e.g. API not ready yet).
  void requeueOpenLink(PushDeepLink link) {
    if (link.hasTask) {
      _queuedOpenLink = link;
    }
  }

  void _emitOpen([PushDeepLink? link]) {
    debugPrint(
      'FCM open tap: taskId=${link?.taskId} subtaskId=${link?.subtaskId} '
      'projectId=${link?.projectId} hasTask=${link?.hasTask ?? false}',
    );
    if (link != null && link.hasTask) {
      _queuedOpenLink = link;
    } else if (link == null || !link.hasTask) {
      // Only mark alerts-only when we don't already have a task link queued.
      if (_queuedOpenLink == null) {
        _queuedOpenAlertsOnly = true;
      }
    }

    if (onOpenAlerts != null) {
      onOpenAlerts!(link);
      return;
    }
  }

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

      // Background/killed: OS shows the FCM `notification` payload automatically.
      // Foreground: mirror via flutter_local_notifications (see below).
      await _messaging!.setForegroundNotificationPresentationOptions(
        alert: false,
        badge: true,
        sound: false,
      );

      // Capture cold-start tap ASAP — before token waits that can take seconds.
      await _captureLaunchMessages();

      if (defaultTargetPlatform == TargetPlatform.iOS) {
        await _waitForApnsToken();
      }

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
        _emitOpen(_deepLinkFromRemote(message));
      });
    } finally {
      if (!(_readyCompleter?.isCompleted ?? true)) {
        _readyCompleter!.complete();
      }
      try {
        onInitialized?.call();
      } catch (e) {
        debugPrint('Push onInitialized callback failed: $e');
      }
      // UI may have wired [onOpenAlerts] while we were initializing.
      flushPendingOpen();
    }
  }

  Future<void> _captureLaunchMessages() async {
    try {
      final initial = await _messaging!
          .getInitialMessage()
          .timeout(const Duration(seconds: 2));
      if (initial != null) {
        debugPrint(
          'FCM getInitialMessage data keys=${initial.data.keys.toList()}',
        );
        _emitOpen(_deepLinkFromRemote(initial));
      } else {
        debugPrint('FCM getInitialMessage: null');
      }
    } catch (e) {
      debugPrint('FCM getInitialMessage skipped: $e');
    }

    // Cold start from a local (foreground-mirrored) notification tap.
    try {
      final launch = await _local!.getNotificationAppLaunchDetails();
      final response = launch?.notificationResponse;
      if (launch?.didNotificationLaunchApp == true && response != null) {
        final link = _deepLinkFromLocalPayload(response.payload);
        if (link != null) {
          _emitOpen(link);
        }
      }
    } catch (e) {
      debugPrint('Local notification launch details skipped: $e');
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
        _emitOpen(_deepLinkFromLocalPayload(response.payload));
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

    // Persist the full FCM data map so taps keep taskId/subtaskId.
    final payloadMap = <String, String>{
      for (final entry in data.entries)
        if (entry.value.toString().trim().isNotEmpty)
          entry.key: entry.value.toString(),
    };
    final link = _deepLinkFromRemote(message);
    payloadMap.addAll(link.toPayloadMap());
    final payload = jsonEncode(payloadMap);

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

import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'core/config/api_reachability_probe.dart';
import 'core/messaging/app_messenger.dart';
import 'core/preferences/app_preferences.dart';
import 'core/router/app_router.dart';
import 'core/services/push_nav.dart';
import 'core/services/push_notification_service.dart';
import 'core/theme/app_theme.dart';
import 'features/auth/session_controller.dart';
import 'firebase_bootstrap.dart';

Future<void> bootstrap() async {
  WidgetsFlutterBinding.ensureInitialized();

  final prefs = await SharedPreferences.getInstance();

  // Show UI immediately. Reachability + FCM can hang on iOS Simulator
  // (no APNs) or when the API is unreachable — never block first frame.
  runApp(
    ProviderScope(
      overrides: [
        sharedPreferencesProvider.overrideWithValue(prefs),
      ],
      child: const MiniTaskManagerApp(),
    ),
  );

  unawaited(_postLaunchInit(prefs));
}

Future<void> _postLaunchInit(SharedPreferences prefs) async {
  try {
    await ApiReachabilityProbe.ensureReachable(prefs).timeout(
      const Duration(seconds: 6),
      onTimeout: () => null,
    );
  } catch (e, st) {
    debugPrint('API reachability probe failed: $e\n$st');
  }

  try {
    await initializeFirebaseAndPush().timeout(const Duration(seconds: 12));
  } catch (e, st) {
    debugPrint('Firebase/FCM post-launch init failed: $e\n$st');
  }
}

class MiniTaskManagerApp extends ConsumerStatefulWidget {
  const MiniTaskManagerApp({super.key});

  @override
  ConsumerState<MiniTaskManagerApp> createState() => _MiniTaskManagerAppState();
}

class _MiniTaskManagerAppState extends ConsumerState<MiniTaskManagerApp>
    with WidgetsBindingObserver {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    // Safe on web: stub PushNotificationService never touches Firebase.
    PushNotificationService.instance.onOpenAlerts = () {
      requestOpenAlertsTab(ref);
    };
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state != AppLifecycleState.resumed) return;
    final session = ref.read(sessionControllerProvider);
    if (session.status != SessionStatus.authenticated) return;
    // Re-register whenever the app returns to foreground so token rotations
    // and first-time permission grants still reach the API.
    unawaited(ref.read(sessionControllerProvider.notifier).unawaitedRegisterDeviceToken());
  }

  @override
  Widget build(BuildContext context) {
    final router = ref.watch(appRouterProvider);
    final themeMode = ref.watch(themeModeProvider);

    return MaterialApp.router(
      title: 'Mini Task Manager',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light(),
      darkTheme: AppTheme.dark(),
      themeMode: themeMode,
      scaffoldMessengerKey: rootScaffoldMessengerKey,
      routerConfig: router,
    );
  }
}

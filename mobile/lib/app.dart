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
import 'firebase_bootstrap.dart';

Future<void> bootstrap() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Mobile: initialize Firebase + FCM. Web: no-op (see firebase_bootstrap*.dart).
  await initializeFirebaseAndPush();

  final prefs = await SharedPreferences.getInstance();
  // Pick AWS (or another reachable server) before the first API call when localhost is down.
  await ApiReachabilityProbe.ensureReachable(prefs);

  runApp(
    ProviderScope(
      overrides: [
        sharedPreferencesProvider.overrideWithValue(prefs),
      ],
      child: const MiniTaskManagerApp(),
    ),
  );
}

class MiniTaskManagerApp extends ConsumerStatefulWidget {
  const MiniTaskManagerApp({super.key});

  @override
  ConsumerState<MiniTaskManagerApp> createState() => _MiniTaskManagerAppState();
}

class _MiniTaskManagerAppState extends ConsumerState<MiniTaskManagerApp> {
  @override
  void initState() {
    super.initState();
    // Safe on web: stub PushNotificationService never touches Firebase.
    PushNotificationService.instance.onOpenAlerts = () {
      requestOpenAlertsTab(ref);
    };
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

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'api_reachability_probe.dart';

/// On production mobile builds, finds a reachable server URL (port 80 vs 3000).
abstract final class ProductionApiProbe {
  static Future<void> ensureReachable(SharedPreferences prefs) async {
    const flavor = String.fromEnvironment('FLAVOR', defaultValue: 'dev');
    if (flavor != 'prod' || kIsWeb) return;
    await ApiReachabilityProbe.ensureReachable(prefs);
  }
}

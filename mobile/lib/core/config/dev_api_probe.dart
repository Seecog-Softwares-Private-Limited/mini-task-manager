import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'api_reachability_probe.dart';

/// On local dev builds, picks the first reachable API URL (Nest or Next proxy).
abstract final class DevApiProbe {
  /// Matches repo-root `.env` defaults and common local setups.
  static const localCandidates = <String>[
    'http://localhost:3007/api/v1',
    'http://127.0.0.1:3007/api/v1',
    'http://localhost:3008/api/v1',
    'http://127.0.0.1:3008/api/v1',
    'http://localhost:3000/api/v1',
    'http://127.0.0.1:3000/api/v1',
  ];

  static Future<void> ensureReachable(SharedPreferences prefs) async {
    const flavor = String.fromEnvironment('FLAVOR', defaultValue: 'dev');
    if (flavor != 'dev' || kIsWeb) return;
    await ApiReachabilityProbe.ensureReachable(prefs);
  }
}

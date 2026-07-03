import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../api/api_connection_service.dart';
import 'api_url_resolver.dart';
import 'app_config.dart';
import 'storage_keys.dart';

/// On production mobile builds, finds a reachable server URL (port 80 vs 3000).
abstract final class ProductionApiProbe {
  static Future<void> ensureReachable(SharedPreferences prefs) async {
    const flavor = String.fromEnvironment('FLAVOR', defaultValue: 'dev');
    if (flavor != 'prod' || kIsWeb) return;

    final current = ApiUrlResolver.resolve(prefs);
    if ((await ApiConnectionService.test(current)).ok) return;

    for (final candidate in AppConfig.productionApiCandidates) {
      if (candidate == current) continue;
      if ((await ApiConnectionService.test(candidate)).ok) {
        await prefs.setString(StorageKeys.apiBaseUrl, candidate);
        return;
      }
    }
  }
}

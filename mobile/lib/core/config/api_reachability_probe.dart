import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../api/api_connection_service.dart';
import 'api_url_resolver.dart';
import 'app_config.dart';
import 'dev_api_probe.dart';
import 'storage_keys.dart';

/// Picks the first reachable API URL and persists it when the current target is down.
abstract final class ApiReachabilityProbe {
  /// Returns the URL that was selected, or null if the current URL is already fine.
  static Future<String?> ensureReachable(SharedPreferences prefs) async {
    if (kIsWeb) return null;

    const envOverride = String.fromEnvironment('API_BASE_URL');
    if (envOverride.isNotEmpty) {
      final resolved = ApiUrlResolver.normalizeAndMigrate(envOverride);
      if ((await ApiConnectionService.test(resolved)).ok) return null;
      return null;
    }

    final current = ApiUrlResolver.resolve(prefs);
    if ((await ApiConnectionService.test(current)).ok) {
      await prefs.setString(StorageKeys.lastReachableApiUrl, current);
      return null;
    }

    final candidates = _orderedCandidates(
      current: current,
      lastReachable: prefs.getString(StorageKeys.lastReachableApiUrl),
    );

    for (final candidate in candidates) {
      if (candidate == current) continue;
      if ((await ApiConnectionService.test(candidate)).ok) {
        await prefs.setString(StorageKeys.apiBaseUrl, candidate);
        await prefs.setString(StorageKeys.lastReachableApiUrl, candidate);
        return candidate;
      }
    }

    return null;
  }

  static List<String> _orderedCandidates({
    required String current,
    required String? lastReachable,
  }) {
    final seen = <String>{};
    final ordered = <String>[];

    void add(String? url) {
      if (url == null || url.isEmpty || !seen.add(url)) return;
      ordered.add(url);
    }

    add(lastReachable);

    if (ApiUrlResolver.isLocalDevUrl(current)) {
      for (final url in DevApiProbe.localCandidates) {
        add(url);
      }
    }

    for (final url in AppConfig.productionApiCandidates) {
      add(url);
    }
    add(AppConfig.productionApiBaseUrl);

    return ordered;
  }
}

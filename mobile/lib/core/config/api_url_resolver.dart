import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../config/storage_keys.dart';
import 'app_config.dart';

/// Resolves the API base URL from saved settings, build-time defines, and flavor defaults.
abstract final class ApiUrlResolver {
  static String resolve(SharedPreferences prefs) {
    // Build/run --dart-define wins over stale saved browser/device settings.
    const envOverride = String.fromEnvironment('API_BASE_URL');
    if (envOverride.isNotEmpty) {
      return _preferLocalProxyOnWeb(normalizeAndMigrate(envOverride));
    }

    const flavor = String.fromEnvironment('FLAVOR', defaultValue: 'dev');

    final saved = prefs.getString(StorageKeys.apiBaseUrl)?.trim();
    if (saved != null && saved.isNotEmpty) {
      final normalized = normalizeAndMigrate(saved);
      // Stale localhost URLs from dev/debug installs must not break production APKs.
      if (flavor == 'prod' && !kIsWeb && _isLocalDevUrl(normalized)) {
        return _preferLocalProxyOnWeb(normalizeAndMigrate(_defaultBaseUrlForFlavor(flavor)));
      }
      return _preferLocalProxyOnWeb(normalized);
    }

    return _preferLocalProxyOnWeb(normalizeAndMigrate(_defaultBaseUrlForFlavor(flavor)));
  }

  static String normalizeAndMigrate(String raw) {
    return _migrateUnreachableBackendPort(AppConfig.normalizeBaseUrl(raw));
  }

  /// Nest often listens on :3007 locally, but production exposes the API via the web app on :3000.
  static String _migrateUnreachableBackendPort(String url) {
    final uri = Uri.tryParse(url);
    if (uri == null) return url;

    final isLocalHost = uri.host == 'localhost' ||
        uri.host == '10.0.2.2' ||
        uri.host.startsWith('127.') ||
        RegExp(r'^192\.168\.|^10\.|^172\.(1[6-9]|2\d|3[01])\.').hasMatch(uri.host);

    if (uri.port == 3007 && !isLocalHost) {
      final migrated = uri.replace(port: 3000);
      var next = migrated.toString();
      if (next.endsWith('/')) next = next.substring(0, next.length - 1);
      return next;
    }
    return url;
  }


  static String _preferLocalProxyOnWeb(String url) {
    if (!kIsWeb) return url;
    final host = Uri.base.host;
    if (host == 'localhost' || host == '127.0.0.1') {
      return 'http://localhost:3007/api/v1';
    }
    return url;
  }

  static bool _isLocalDevUrl(String url) {
    final uri = Uri.tryParse(url);
    if (uri == null) return false;

    return uri.host == 'localhost' ||
        uri.host == '10.0.2.2' ||
        uri.host.startsWith('127.') ||
        RegExp(r'^192\.168\.|^10\.|^172\.(1[6-9]|2\d|3[01])\.').hasMatch(uri.host);
  }

  static String _defaultBaseUrlForFlavor(String flavor) {
    if (flavor == 'prod') {
      return AppConfig.productionApiBaseUrl;
    }
    if (flavor == 'staging') {
      return 'https://staging.your-host/api/v1';
    }

    if (!kIsWeb && Platform.isAndroid) {
      return 'http://10.0.2.2:3007/api/v1';
    }
    return 'http://localhost:3007/api/v1';
  }
}

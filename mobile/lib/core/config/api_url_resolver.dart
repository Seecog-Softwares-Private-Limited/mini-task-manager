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
      final normalized = _repairSavedUrl(prefs, saved);
      // Stale localhost URLs from dev/debug installs must not break production APKs.
      if (flavor == 'prod' && !kIsWeb && isLocalDevUrl(normalized)) {
        return _preferLocalProxyOnWeb(normalizeAndMigrate(_defaultBaseUrlForFlavor(flavor)));
      }
      return _preferLocalProxyOnWeb(normalized);
    }

    return _preferLocalProxyOnWeb(normalizeAndMigrate(_defaultBaseUrlForFlavor(flavor)));
  }

  static String normalizeAndMigrate(String raw) {
    return _migrateUnreachableBackendPort(normalizeBaseUrl(raw));
  }

  static String normalizeBaseUrl(String raw) {
    return AppConfig.normalizeBaseUrl(raw);
  }

  /// Nest often listens on :3007 locally, but production exposes the API via the web app on :3000.
  /// Also migrates the old AWS Lightsail IP to the Hostinger VPS.
  static String _migrateUnreachableBackendPort(String url) {
    final origin = AppConfig.parseApiOrigin(url);
    if (origin == null) return url;

    // Old AWS Lightsail → Hostinger
    if (origin.host == '3.110.214.243') {
      return AppConfig.normalizeBaseUrl(
        Uri(
          scheme: origin.scheme.isEmpty ? 'http' : origin.scheme,
          host: AppConfig.productionHost,
          port: origin.hasPort ? origin.port : 3000,
        ).toString(),
      );
    }

    final isLocalHost = origin.host == 'localhost' ||
        origin.host == '10.0.2.2' ||
        origin.host.startsWith('127.') ||
        RegExp(r'^192\.168\.|^10\.|^172\.(1[6-9]|2\d|3[01])\.').hasMatch(origin.host);

    if (origin.hasPort && origin.port == 3007 && !isLocalHost) {
      return AppConfig.normalizeBaseUrl(
        Uri(
          scheme: origin.scheme,
          host: origin.host,
          port: 3000,
        ).toString(),
      );
    }
    return AppConfig.normalizeBaseUrl(url);
  }

  static String _repairSavedUrl(SharedPreferences prefs, String saved) {
    try {
      final normalized = normalizeAndMigrate(saved);
      if (normalized != saved) {
        prefs.setString(StorageKeys.apiBaseUrl, normalized);
      }
      return normalized;
    } catch (_) {
      prefs.remove(StorageKeys.apiBaseUrl);
      return normalizeAndMigrate(_defaultBaseUrlForFlavor(
        const String.fromEnvironment('FLAVOR', defaultValue: 'dev'),
      ));
    }
  }

  /// On Flutter web during local `flutter run -d chrome`, keep an explicit remote
  /// Hostinger/production URL. Only fall back to local Nest when the URL is local.
  static String _preferLocalProxyOnWeb(String url) {
    if (!kIsWeb) return url;
    final host = Uri.base.host;
    if (host != 'localhost' && host != '127.0.0.1') {
      return url;
    }
    final apiHost = Uri.tryParse(url)?.host ?? '';
    final isLocalApi = apiHost == 'localhost' ||
        apiHost == '127.0.0.1' ||
        apiHost == '10.0.2.2' ||
        apiHost.isEmpty;
    if (isLocalApi) {
      return 'http://localhost:3007/api/v1';
    }
    return url;
  }

  static bool isLocalDevUrl(String url) {
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

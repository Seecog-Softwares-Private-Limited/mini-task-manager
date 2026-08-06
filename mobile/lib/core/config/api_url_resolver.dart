import 'package:shared_preferences/shared_preferences.dart';

import '../config/storage_keys.dart';
import 'app_config.dart';

/// Resolves the API base URL from saved settings, build-time defines, and flavor defaults.
///
/// Dev and prod both use the Hostinger VPS — never localhost Nest — so uploads,
/// comments, and attachments stay consistent for live users and local development.
abstract final class ApiUrlResolver {
  static String resolve(SharedPreferences prefs) {
    // Build/run --dart-define wins over stale saved browser/device settings.
    const envOverride = String.fromEnvironment('API_BASE_URL');
    if (envOverride.isNotEmpty) {
      return normalizeAndMigrate(envOverride);
    }

    const flavor = String.fromEnvironment('FLAVOR', defaultValue: 'dev');

    final saved = prefs.getString(StorageKeys.apiBaseUrl)?.trim();
    if (saved != null && saved.isNotEmpty) {
      final normalized = _repairSavedUrl(prefs, saved);
      // Local Nest URLs mix up live VPS data/files — always prefer Hostinger.
      if (isLocalDevUrl(normalized)) {
        final vps = normalizeAndMigrate(AppConfig.productionApiBaseUrl);
        prefs.setString(StorageKeys.apiBaseUrl, vps);
        return vps;
      }
      return normalized;
    }

    return normalizeAndMigrate(_defaultBaseUrlForFlavor(flavor));
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

    // Never keep a local Nest URL — live app + local web must share the VPS API.
    if (isLocalHost) {
      return AppConfig.productionApiBaseUrl;
    }

    if (origin.hasPort && origin.port == 3007) {
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

  static bool isLocalDevUrl(String url) {
    final uri = Uri.tryParse(url);
    if (uri == null) return false;

    return uri.host == 'localhost' ||
        uri.host == '10.0.2.2' ||
        uri.host.startsWith('127.') ||
        RegExp(r'^192\.168\.|^10\.|^172\.(1[6-9]|2\d|3[01])\.').hasMatch(uri.host);
  }

  static String _defaultBaseUrlForFlavor(String flavor) {
    if (flavor == 'staging') {
      return 'https://staging.your-host/api/v1';
    }
    // Dev + prod both default to Hostinger VPS (not localhost Nest).
    return AppConfig.productionApiBaseUrl;
  }
}

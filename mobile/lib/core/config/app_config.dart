import 'dart:io';

import 'package:flutter/foundation.dart';

/// Runtime configuration for API connectivity and app metadata.
class AppConfig {
  const AppConfig({
    required this.apiBaseUrl,
    required this.appName,
    required this.flavor,
  });

  final String apiBaseUrl;
  final String appName;
  final String flavor;

  static AppConfig fromEnvironment() {
    const flavor = String.fromEnvironment('FLAVOR', defaultValue: 'dev');
    const override = String.fromEnvironment('API_BASE_URL');

    final baseUrl = override.isNotEmpty
        ? _normalizeBaseUrl(override)
        : _defaultBaseUrlForFlavor(flavor);

    return AppConfig(
      apiBaseUrl: baseUrl,
      appName: 'Mini Task Manager',
      flavor: flavor,
    );
  }

  static String _defaultBaseUrlForFlavor(String flavor) {
    if (flavor == 'prod') {
      return 'https://your-production-host/api/v1';
    }
    if (flavor == 'staging') {
      return 'https://staging.your-host/api/v1';
    }

    // Local dev: Android emulator uses 10.0.2.2 to reach host machine.
    if (!kIsWeb && Platform.isAndroid) {
      return 'http://10.0.2.2:3007/api/v1';
    }
    return 'http://localhost:3007/api/v1';
  }

  static String _normalizeBaseUrl(String value) {
    var url = value.trim();
    if (url.endsWith('/')) {
      url = url.substring(0, url.length - 1);
    }
    if (!url.endsWith('/api/v1')) {
      url = '$url/api/v1';
    }
    return url;
  }
}

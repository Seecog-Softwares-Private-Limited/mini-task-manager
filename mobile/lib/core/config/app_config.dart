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

  static AppConfig fromApiBaseUrl(String apiBaseUrl) {
    const flavor = String.fromEnvironment('FLAVOR', defaultValue: 'dev');
    return AppConfig(
      apiBaseUrl: apiBaseUrl,
      appName: 'Mini Task Manager',
      flavor: flavor,
    );
  }

  @Deprecated('Use apiBaseUrlProvider via appConfigProvider')
  static AppConfig fromEnvironment() {
    const flavor = String.fromEnvironment('FLAVOR', defaultValue: 'dev');
    const override = String.fromEnvironment('API_BASE_URL');

    final baseUrl = override.isNotEmpty
        ? normalizeBaseUrl(override)
        : _defaultBaseUrlForFlavor(flavor);

    return AppConfig(
      apiBaseUrl: baseUrl,
      appName: 'Mini Task Manager',
      flavor: flavor,
    );
  }

  /// Public AWS server IP.
  static const productionHost = '3.110.214.243';

  /// Next.js on port 3000 (works on Wi‑Fi / desktop; many mobile carriers block this port).
  static const productionApiBaseUrl = 'http://$productionHost:3000/api/v1';

  /// Port 80 via nginx (preferred for mobile — requires deploy/nginx-minitask.conf on the server).
  static const productionApiBaseUrlPort80 = 'http://$productionHost/api/v1';

  /// Tried in order when probing production connectivity from the mobile app.
  static const productionApiCandidates = <String>[
    productionApiBaseUrlPort80,
    productionApiBaseUrl,
  ];

  static String _defaultBaseUrlForFlavor(String flavor) {
    if (flavor == 'prod') {
      return productionApiBaseUrl;
    }
    if (flavor == 'staging') {
      return 'https://staging.your-host/api/v1';
    }

    if (!kIsWeb && Platform.isAndroid) {
      return 'http://10.0.2.2:3007/api/v1';
    }
    return 'http://localhost:3007/api/v1';
  }

  static String normalizeBaseUrl(String value) {
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

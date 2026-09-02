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
      appName: 'OpsPick',
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
      appName: 'OpsPick',
      flavor: flavor,
    );
  }

  /// Public Hostinger VPS IP (was AWS Lightsail 3.110.214.243).
  static const productionHost = '200.97.172.61';

  /// Public HTTPS URLs required by App Review for auto-renewable subscriptions
  /// (Guideline 3.1.2). Update [privacyPolicyUrl] to the live marketing domain.
  static const privacyPolicyUrl = 'https://opspick.app/privacypolicy';

  /// Apple's standard EULA. Replace with a custom Terms of Use URL if you host one.
  static const termsOfUseUrl =
      'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';

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
    if (flavor == 'staging') {
      return 'https://staging.your-host/api/v1';
    }
    // Dev + prod both default to Hostinger VPS (not localhost / RDS).
    return productionApiBaseUrl;
  }

  static String normalizeBaseUrl(String value) {
    final origin = parseApiOrigin(value);
    if (origin == null) {
      throw ArgumentError('Invalid API server URL: $value');
    }
    return '${origin.toString().replaceAll(RegExp(r'/$'), '')}/api/v1';
  }

  /// Fixes common typos (e.g. `http:/host` → `http://host`) and returns the server origin.
  static Uri? parseApiOrigin(String value) {
    var raw = value.trim();
    if (raw.isEmpty) return null;

    // http:/example.com → http://example.com
    raw = raw.replaceFirst(RegExp(r'^(https?):/(?!/)'), r'$1://');
    if (!raw.contains('://')) {
      raw = 'http://$raw';
    }

    if (raw.endsWith('/api/v1')) {
      raw = raw.substring(0, raw.length - '/api/v1'.length);
    }
    while (raw.endsWith('/')) {
      raw = raw.substring(0, raw.length - 1);
    }

    final uri = Uri.tryParse(raw);
    if (uri == null || uri.host.isEmpty) return null;

    final scheme = uri.scheme.isEmpty ? 'http' : uri.scheme;
    if (scheme != 'http' && scheme != 'https') return null;

    return Uri(
      scheme: scheme,
      host: uri.host,
      port: uri.hasPort ? uri.port : null,
    );
  }

  static bool isValidApiBaseUrl(String value) {
    try {
      return parseApiOrigin(value) != null;
    } catch (_) {
      return false;
    }
  }
}

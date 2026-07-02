import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../preferences/app_preferences.dart';
import 'api_url_resolver.dart';
import 'storage_keys.dart';

final apiBaseUrlProvider =
    NotifierProvider<ApiBaseUrlController, String>(ApiBaseUrlController.new);

class ApiBaseUrlController extends Notifier<String> {
  @override
  String build() {
    final prefs = ref.watch(sharedPreferencesProvider);
    return ApiUrlResolver.resolve(prefs);
  }

  Future<void> setBaseUrl(String raw) async {
    final prefs = ref.read(sharedPreferencesProvider);
    final normalized = ApiUrlResolver.normalizeAndMigrate(raw);
    await prefs.setString(StorageKeys.apiBaseUrl, normalized);
    state = normalized;
  }

  Future<void> resetToDefault() async {
    final prefs = ref.read(sharedPreferencesProvider);
    await prefs.remove(StorageKeys.apiBaseUrl);
    state = ApiUrlResolver.resolve(prefs);
  }

}

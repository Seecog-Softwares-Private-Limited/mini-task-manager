import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

const _themeKey = 'mini_tm_theme_mode';
const _lastProjectKey = 'mini_tm_last_project_id';

final sharedPreferencesProvider = Provider<SharedPreferences>((ref) {
  throw UnimplementedError('SharedPreferences must be overridden in main()');
});

final themeModeProvider =
    NotifierProvider<ThemeModeController, ThemeMode>(ThemeModeController.new);

class ThemeModeController extends Notifier<ThemeMode> {
  @override
  ThemeMode build() {
    final prefs = ref.watch(sharedPreferencesProvider);
    final raw = prefs.getString(_themeKey);
    return switch (raw) {
      'dark' => ThemeMode.dark,
      'light' => ThemeMode.light,
      _ => ThemeMode.system,
    };
  }

  Future<void> setThemeMode(ThemeMode mode) async {
    final prefs = ref.read(sharedPreferencesProvider);
    await prefs.setString(_themeKey, mode.name);
    state = mode;
  }
}

final lastProjectIdProvider =
    NotifierProvider<LastProjectController, String?>(LastProjectController.new);

class LastProjectController extends Notifier<String?> {
  @override
  String? build() {
    return ref.watch(sharedPreferencesProvider).getString(_lastProjectKey);
  }

  Future<void> setProjectId(String? projectId) async {
    final prefs = ref.read(sharedPreferencesProvider);
    if (projectId == null || projectId.isEmpty) {
      await prefs.remove(_lastProjectKey);
      state = null;
      return;
    }
    await prefs.setString(_lastProjectKey, projectId);
    state = projectId;
  }
}

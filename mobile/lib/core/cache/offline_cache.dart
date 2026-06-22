import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../preferences/app_preferences.dart';

class OfflineCache {
  OfflineCache(this._prefs);

  final SharedPreferences _prefs;

  static const _projectsPrefix = 'cache_projects_';

  Future<void> saveProjects(String orgId, List<Map<String, dynamic>> projects) async {
    await _prefs.setString('$_projectsPrefix$orgId', jsonEncode(projects));
  }

  List<Map<String, dynamic>>? readProjects(String orgId) {
    final raw = _prefs.getString('$_projectsPrefix$orgId');
    if (raw == null) return null;
    try {
      final list = jsonDecode(raw) as List<dynamic>;
      return list.whereType<Map<String, dynamic>>().toList();
    } catch (_) {
      return null;
    }
  }
}

final offlineCacheProvider = Provider<OfflineCache>((ref) {
  return OfflineCache(ref.watch(sharedPreferencesProvider));
});

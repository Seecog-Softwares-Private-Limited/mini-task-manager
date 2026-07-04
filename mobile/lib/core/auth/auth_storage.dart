import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../data/models/login_response.dart';
import '../config/storage_keys.dart';

class AuthStorage {
  AuthStorage({
    FlutterSecureStorage? storage,
    SharedPreferences? preferences,
  })  : _storage = storage ??
            const FlutterSecureStorage(
              aOptions: AndroidOptions(encryptedSharedPreferences: true),
            ),
        _preferences = preferences;

  final FlutterSecureStorage _storage;
  final SharedPreferences? _preferences;

  Future<String?> readToken() => _storage.read(key: StorageKeys.token);

  Future<String?> readOrgId() async {
    final secureOrgId = await _storage.read(key: StorageKeys.orgId);
    if (secureOrgId != null && secureOrgId.isNotEmpty) {
      return secureOrgId;
    }

    final prefsOrgId = _preferences?.getString(StorageKeys.orgId);
    if (prefsOrgId != null && prefsOrgId.isNotEmpty) {
      await _storage.write(key: StorageKeys.orgId, value: prefsOrgId);
      return prefsOrgId;
    }
    return null;
  }

  Future<AuthUser?> readUser() async {
    final raw = await _storage.read(key: StorageKeys.userJson);
    if (raw == null || raw.isEmpty) return null;
    try {
      final json = jsonDecode(raw) as Map<String, dynamic>;
      return AuthUser.fromJson(json);
    } catch (_) {
      return null;
    }
  }

  Future<void> writeToken(String? token) async {
    if (token == null || token.isEmpty) {
      await _storage.delete(key: StorageKeys.token);
      return;
    }
    await _storage.write(key: StorageKeys.token, value: token);
  }

  Future<void> writeOrgId(String? orgId) async {
    if (orgId == null || orgId.isEmpty) {
      await _storage.delete(key: StorageKeys.orgId);
      await _preferences?.remove(StorageKeys.orgId);
      return;
    }
    await _storage.write(key: StorageKeys.orgId, value: orgId);
    await _preferences?.setString(StorageKeys.orgId, orgId);
  }

  Future<void> writeUser(AuthUser? user) async {
    if (user == null) {
      await _storage.delete(key: StorageKeys.userJson);
      return;
    }
    await _storage.write(
      key: StorageKeys.userJson,
      value: jsonEncode({
        'id': user.id,
        'email': user.email,
        'fullName': user.fullName,
        if (user.avatarUrl != null) 'avatarUrl': user.avatarUrl,
      }),
    );
  }

  Future<void> clearAll() async {
    await _storage.delete(key: StorageKeys.token);
    await _storage.delete(key: StorageKeys.orgId);
    await _storage.delete(key: StorageKeys.userJson);
    await _preferences?.remove(StorageKeys.orgId);
  }
}

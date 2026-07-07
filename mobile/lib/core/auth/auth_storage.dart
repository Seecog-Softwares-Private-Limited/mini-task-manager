import 'dart:convert';

import 'package:flutter/foundation.dart';
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
              iOptions: IOSOptions(
                accessibility: KeychainAccessibility.first_unlock_this_device,
              ),
            ),
        _preferences = preferences;

  final FlutterSecureStorage _storage;
  final SharedPreferences? _preferences;

  Future<String?> readToken() async {
    try {
      final secureToken = await _storage.read(key: StorageKeys.token);
      if (secureToken != null && secureToken.isNotEmpty) {
        return secureToken;
      }
    } catch (error) {
      debugPrint('AuthStorage.readToken secure read failed: $error');
    }
    return _preferences?.getString(StorageKeys.token);
  }

  Future<String?> readOrgId() async {
    try {
      final secureOrgId = await _storage.read(key: StorageKeys.orgId);
      if (secureOrgId != null && secureOrgId.isNotEmpty) {
        return secureOrgId;
      }
    } catch (error) {
      debugPrint('AuthStorage.readOrgId secure read failed: $error');
    }

    final prefsOrgId = _preferences?.getString(StorageKeys.orgId);
    if (prefsOrgId != null && prefsOrgId.isNotEmpty) {
      try {
        await _storage.write(key: StorageKeys.orgId, value: prefsOrgId);
      } catch (_) {
        // Prefs fallback is enough for this session.
      }
      return prefsOrgId;
    }
    return null;
  }

  Future<AuthUser?> readUser() async {
    String? raw;
    try {
      raw = await _storage.read(key: StorageKeys.userJson);
    } catch (error) {
      debugPrint('AuthStorage.readUser secure read failed: $error');
    }
    raw ??= _preferences?.getString(StorageKeys.userJson);
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
      try {
        await _storage.delete(key: StorageKeys.token);
      } catch (_) {}
      await _preferences?.remove(StorageKeys.token);
      return;
    }

    try {
      await _storage.write(key: StorageKeys.token, value: token);
    } catch (error) {
      debugPrint('AuthStorage.writeToken secure write failed: $error');
    }
    await _preferences?.setString(StorageKeys.token, token);
  }

  Future<void> writeOrgId(String? orgId) async {
    if (orgId == null || orgId.isEmpty) {
      try {
        await _storage.delete(key: StorageKeys.orgId);
      } catch (_) {}
      await _preferences?.remove(StorageKeys.orgId);
      return;
    }
    try {
      await _storage.write(key: StorageKeys.orgId, value: orgId);
    } catch (error) {
      debugPrint('AuthStorage.writeOrgId secure write failed: $error');
    }
    await _preferences?.setString(StorageKeys.orgId, orgId);
  }

  Future<void> writeUser(AuthUser? user) async {
    if (user == null) {
      try {
        await _storage.delete(key: StorageKeys.userJson);
      } catch (_) {}
      await _preferences?.remove(StorageKeys.userJson);
      return;
    }

    final payload = jsonEncode({
      'id': user.id,
      'email': user.email,
      'fullName': user.fullName,
      if (user.avatarUrl != null) 'avatarUrl': user.avatarUrl,
    });

    try {
      await _storage.write(key: StorageKeys.userJson, value: payload);
    } catch (error) {
      debugPrint('AuthStorage.writeUser secure write failed: $error');
    }
    await _preferences?.setString(StorageKeys.userJson, payload);
  }

  Future<void> clearAll() async {
    try {
      await _storage.delete(key: StorageKeys.token);
      await _storage.delete(key: StorageKeys.orgId);
      await _storage.delete(key: StorageKeys.userJson);
    } catch (_) {}
    await _preferences?.remove(StorageKeys.token);
    await _preferences?.remove(StorageKeys.orgId);
    await _preferences?.remove(StorageKeys.userJson);
  }
}

import 'package:equatable/equatable.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';
import '../../core/auth/auth_storage.dart';
import '../../core/services/device_info_service.dart';
import '../../core/services/push_nav.dart';
import '../../core/services/push_notification_service.dart';
import '../../data/models/login_response.dart';
import '../../data/models/organization.dart';
import '../../data/repositories/auth_repository.dart';
import '../../data/repositories/device_tokens_repository.dart';
import '../../data/repositories/organizations_repository.dart';
import '../../data/repositories/users_repository.dart';

enum SessionStatus {
  loading,
  unauthenticated,
  needsWorkspace,
  authenticated,
}

class SessionState extends Equatable {
  const SessionState({
    required this.status,
    this.user,
    this.orgId,
    this.organizations = const [],
  });

  final SessionStatus status;
  final AuthUser? user;
  final String? orgId;
  final List<Organization> organizations;

  SessionState copyWith({
    SessionStatus? status,
    AuthUser? user,
    String? orgId,
    List<Organization>? organizations,
    bool clearUser = false,
    bool clearOrgId = false,
  }) {
    return SessionState(
      status: status ?? this.status,
      user: clearUser ? null : user ?? this.user,
      orgId: clearOrgId ? null : orgId ?? this.orgId,
      organizations: organizations ?? this.organizations,
    );
  }

  @override
  List<Object?> get props => [status, user, orgId, organizations];
}

class SessionController extends Notifier<SessionState> {
  late AuthRepository _authRepository;
  late OrganizationsRepository _organizationsRepository;
  late DeviceTokensRepository _deviceTokensRepository;
  late UsersRepository _usersRepository;
  late AuthStorage _authStorage;
  int _operationGeneration = 0;
  bool _restoreScheduled = false;
  bool _tokenRefreshWired = false;

  @override
  SessionState build() {
    // Watch so login/API calls pick up Server settings URL changes immediately.
    _authRepository = ref.watch(authRepositoryProvider);
    _organizationsRepository = ref.watch(organizationsRepositoryProvider);
    _deviceTokensRepository = ref.watch(deviceTokensRepositoryProvider);
    _usersRepository = ref.watch(usersRepositoryProvider);
    _authStorage = ref.watch(authStorageProvider);

    ref.listen<int>(sessionExpiredTickProvider, (_, __) {
      _operationGeneration++;
      state = const SessionState(status: SessionStatus.unauthenticated);
    });

    if (!_tokenRefreshWired) {
      _tokenRefreshWired = true;
      PushNotificationService.instance.onTokenRefresh = (_) {
        if (state.status == SessionStatus.authenticated) {
          unawaitedRegisterDeviceToken();
        }
      };
    }

    if (!_restoreScheduled) {
      _restoreScheduled = true;
      Future.microtask(restoreSession);
      return const SessionState(status: SessionStatus.loading);
    }
    // Keep current session when only the API URL / repositories change.
    return state;
  }

  bool _isStale(int generation) => generation != _operationGeneration;

  Future<void> unawaitedRegisterDeviceToken() async {
    try {
      await registerDeviceToken();
    } catch (e) {
      debugPrint('registerDeviceToken failed: $e');
    }
  }

  Future<void> registerDeviceToken() async {
    if (kIsWeb) return;
    final platform = pushPlatformName();
    if (platform != 'android' && platform != 'ios') return;

    final fcmToken = await PushNotificationService.instance.getToken();
    if (fcmToken == null || fcmToken.isEmpty) return;

    String? deviceId;
    try {
      final info = await DeviceInfoService.capture();
      deviceId = info['deviceId'] as String?;
    } catch (_) {}

    await _deviceTokensRepository.register(
      token: fcmToken,
      platform: platform,
      deviceId: deviceId,
    );
  }

  Future<void> unregisterDeviceToken() async {
    if (kIsWeb) return;
    final fcmToken = PushNotificationService.instance.token;
    if (fcmToken == null || fcmToken.isEmpty) return;
    try {
      await _deviceTokensRepository.unregister(fcmToken);
    } catch (e) {
      debugPrint('unregisterDeviceToken API failed: $e');
    }
    await PushNotificationService.instance.deleteToken();
  }

  Future<void> restoreSession() async {
    final generation = _operationGeneration;
    final token = await _authRepository.readToken();
    if (_isStale(generation)) return;

    if (token == null || token.isEmpty) {
      if (state.status != SessionStatus.authenticated &&
          state.status != SessionStatus.needsWorkspace) {
        state = const SessionState(status: SessionStatus.unauthenticated);
      }
      return;
    }

    final user = await _authStorage.readUser();
    if (_isStale(generation)) return;

    final storedOrgId = await _authRepository.readOrgId();
    if (_isStale(generation)) return;

    List<Organization> organizations = const [];
    try {
      organizations = await _organizationsRepository.fetchOrganizations();
    } catch (_) {
      if (_isStale(generation)) return;
      if (storedOrgId != null && storedOrgId.isNotEmpty) {
        state = SessionState(
          status: SessionStatus.authenticated,
          user: user,
          orgId: storedOrgId,
        );
        unawaitedRegisterDeviceToken();
        return;
      }
      if (state.status != SessionStatus.authenticated &&
          state.status != SessionStatus.needsWorkspace) {
        state = const SessionState(status: SessionStatus.unauthenticated);
      }
      return;
    }

    if (_isStale(generation)) return;

    if (storedOrgId != null && storedOrgId.isNotEmpty) {
      final stillMember = organizations.any((org) => org.id == storedOrgId);
      if (stillMember) {
        state = SessionState(
          status: SessionStatus.authenticated,
          user: user,
          orgId: storedOrgId,
          organizations: organizations,
        );
        unawaitedRegisterDeviceToken();
        // Login payloads used to omit avatarUrl — refresh from /users/me.
        // ignore: unawaited_futures
        refreshCurrentUserProfile();
        return;
      }
      await _authStorage.writeOrgId(null);
      if (_isStale(generation)) return;
    }

    if (organizations.length == 1) {
      final org = organizations.first;
      await _authStorage.writeOrgId(org.id);
      if (_isStale(generation)) return;
      state = SessionState(
        status: SessionStatus.authenticated,
        user: user,
        orgId: org.id,
        organizations: organizations,
      );
      unawaitedRegisterDeviceToken();
      // ignore: unawaited_futures
      refreshCurrentUserProfile();
      return;
    }

    state = SessionState(
      status: SessionStatus.needsWorkspace,
      user: user,
      organizations: organizations,
    );
  }

  Future<void> login({
    required String email,
    required String password,
  }) async {
    final generation = ++_operationGeneration;

    final response = await _authRepository.login(email: email, password: password);
    if (_isStale(generation)) return;

    await _applyLoginResponse(response, generation: generation);
  }

  /// Completes session after signup / email verification when the API returns a token.
  Future<void> completeAuthenticatedSession(LoginResponse response) async {
    final generation = ++_operationGeneration;
    await _applyLoginResponse(response, generation: generation);
  }

  Future<void> _applyLoginResponse(
    LoginResponse response, {
    required int generation,
  }) async {
    if (response.organizationId != null && response.organizationId!.isNotEmpty) {
      final organizations = await _organizationsRepository.fetchOrganizations();
      if (_isStale(generation)) return;
      state = SessionState(
        status: SessionStatus.authenticated,
        user: response.user,
        orgId: response.organizationId,
        organizations: organizations,
      );
      unawaitedRegisterDeviceToken();
      // ignore: unawaited_futures
      refreshCurrentUserProfile();
      return;
    }

    await _loadOrganizations(
      requireSelection: true,
      user: response.user,
      generation: generation,
    );
  }

  Future<void> _loadOrganizations({
    required bool requireSelection,
    AuthUser? user,
    required int generation,
  }) async {
    final organizations = await _organizationsRepository.fetchOrganizations();
    if (_isStale(generation)) return;

    if (organizations.length == 1) {
      await selectOrganization(organizations.first.id, user: user);
      return;
    }

    state = SessionState(
      status: SessionStatus.needsWorkspace,
      user: user ?? state.user,
      organizations: organizations,
    );
  }

  Future<void> selectOrganization(String orgId, {AuthUser? user}) async {
    await _authStorage.writeOrgId(orgId);
    state = SessionState(
      status: SessionStatus.authenticated,
      user: user ?? state.user,
      orgId: orgId,
      organizations: state.organizations,
    );
    unawaitedRegisterDeviceToken();
    // ignore: unawaited_futures
    refreshCurrentUserProfile();
  }

  Future<void> refreshOrganizations() async {
    final organizations = await _organizationsRepository.fetchOrganizations();
    state = state.copyWith(organizations: organizations);
  }

  Future<Organization> createWorkspace({
    required String name,
    String? slug,
    String? logoUrl,
  }) async {
    final org = await _organizationsRepository.createOrganization(
      name: name,
      slug: slug,
      logoUrl: logoUrl,
    );
    final organizations = await _organizationsRepository.fetchOrganizations();
    await selectOrganization(org.id);
    state = state.copyWith(organizations: organizations);
    return org;
  }

  Future<Organization> updateWorkspace({
    required String orgId,
    String? name,
    String? slug,
    String? logoUrl,
    bool clearLogo = false,
  }) async {
    final org = await _organizationsRepository.updateOrganization(
      orgId,
      name: name,
      slug: slug,
      logoUrl: logoUrl,
      clearLogo: clearLogo,
    );
    final organizations = await _organizationsRepository.fetchOrganizations();
    state = state.copyWith(organizations: organizations);
    return org;
  }

  Future<void> logout() async {
    await unregisterDeviceToken();
    await _authRepository.logout();
    state = const SessionState(status: SessionStatus.unauthenticated);
  }

  Future<void> updateUser(AuthUser user) async {
    await _authStorage.writeUser(user);
    state = state.copyWith(user: user);
  }

  /// Refresh profile (incl. avatarUrl) from `/users/me` after login/restore.
  Future<void> refreshCurrentUserProfile() async {
    try {
      final profile = await _usersRepository.fetchCurrentUser();
      await updateUser(profile);
    } catch (e) {
      debugPrint('refreshCurrentUserProfile failed: $e');
    }
  }
}

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository(
    apiClient: ref.watch(apiClientProvider),
    authStorage: ref.watch(authStorageProvider),
  );
});

final organizationsRepositoryProvider = Provider<OrganizationsRepository>((ref) {
  return OrganizationsRepository(apiClient: ref.watch(apiClientProvider));
});

final sessionControllerProvider =
    NotifierProvider<SessionController, SessionState>(SessionController.new);

final selectedOrgProvider = Provider<Organization?>((ref) {
  final session = ref.watch(sessionControllerProvider);
  final orgId = session.orgId;
  if (orgId == null) return null;
  for (final org in session.organizations) {
    if (org.id == orgId) return org;
  }
  return Organization(
    id: orgId,
    name: 'Workspace',
    slug: orgId,
    ownerId: '',
  );
});

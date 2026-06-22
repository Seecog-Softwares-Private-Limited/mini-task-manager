import 'package:equatable/equatable.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';
import '../../core/auth/auth_storage.dart';
import '../../data/models/login_response.dart';
import '../../data/models/organization.dart';
import '../../data/repositories/auth_repository.dart';
import '../../data/repositories/organizations_repository.dart';

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
  late AuthStorage _authStorage;

  @override
  SessionState build() {
    _authRepository = ref.read(authRepositoryProvider);
    _organizationsRepository = ref.read(organizationsRepositoryProvider);
    _authStorage = ref.read(authStorageProvider);

    ref.listen<int>(sessionExpiredTickProvider, (_, __) {
      state = const SessionState(status: SessionStatus.unauthenticated);
    });

    Future.microtask(restoreSession);
    return const SessionState(status: SessionStatus.loading);
  }

  Future<void> restoreSession() async {
    final token = await _authRepository.readToken();
    if (token == null || token.isEmpty) {
      state = const SessionState(status: SessionStatus.unauthenticated);
      return;
    }

    final user = await _authStorage.readUser();
    final orgId = await _authRepository.readOrgId();
    if (orgId != null && orgId.isNotEmpty) {
      state = SessionState(
        status: SessionStatus.authenticated,
        user: user,
        orgId: orgId,
      );
      return;
    }

    await _loadOrganizations(requireSelection: true, user: user);
  }

  Future<void> login({
    required String email,
    required String password,
  }) async {
    final response = await _authRepository.login(email: email, password: password);

    if (response.organizationId != null && response.organizationId!.isNotEmpty) {
      state = SessionState(
        status: SessionStatus.authenticated,
        user: response.user,
        orgId: response.organizationId,
      );
      return;
    }

    state = SessionState(
      status: SessionStatus.needsWorkspace,
      user: response.user,
    );
    await _loadOrganizations(requireSelection: true, user: response.user);
  }

  Future<void> _loadOrganizations({
    required bool requireSelection,
    AuthUser? user,
  }) async {
    final organizations = await _organizationsRepository.fetchOrganizations();
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
  }

  Future<void> refreshOrganizations() async {
    final organizations = await _organizationsRepository.fetchOrganizations();
    state = state.copyWith(organizations: organizations);
  }

  Future<void> logout() async {
    await _authRepository.logout();
    state = const SessionState(status: SessionStatus.unauthenticated);
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

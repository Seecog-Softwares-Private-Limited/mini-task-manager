import 'package:dio/dio.dart';

import '../../core/api/api_client.dart';
import '../../core/api/api_exception.dart';
import '../models/organization.dart';
import '../models/project_member.dart';

class OrganizationsRepository {
  OrganizationsRepository({required ApiClient apiClient}) : _api = apiClient;

  final ApiClient _api;

  Future<List<Organization>> fetchOrganizations() async {
    try {
      final response = await _api.dio.get<List<dynamic>>('/organizations');
      final list = response.data ?? const [];
      return list
          .whereType<Map<String, dynamic>>()
          .map(Organization.fromJson)
          .where((org) => !org.isArchived)
          .toList();
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }

  Future<Organization> fetchOrganization(String orgId) async {
    try {
      final response = await _api.dio.get<Map<String, dynamic>>(
        '/organizations/$orgId',
        options: _api.withOrgHeader(orgId),
      );
      return Organization.fromJson(response.data!);
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }

  Future<bool> isSlugAvailable(String slug, {String? excludeOrganizationId}) async {
    try {
      final response = await _api.dio.get<Map<String, dynamic>>(
        '/organizations/slug/available',
        queryParameters: {
          'slug': slug.trim().toLowerCase(),
          if (excludeOrganizationId != null && excludeOrganizationId.isNotEmpty)
            'excludeOrganizationId': excludeOrganizationId,
        },
      );
      return response.data?['available'] as bool? ?? false;
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }

  Future<Organization> createOrganization({
    required String name,
    String? slug,
    String? logoUrl,
  }) async {
    try {
      final response = await _api.dio.post<Map<String, dynamic>>(
        '/organizations',
        data: {
          'name': name.trim(),
          if (slug != null && slug.trim().isNotEmpty) 'slug': slug.trim().toLowerCase(),
          if (logoUrl != null && logoUrl.isNotEmpty) 'logoUrl': logoUrl,
        },
      );
      return Organization.fromJson(response.data!);
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }

  /// Active workspace members (used by Tasks → All projects member filter).
  Future<List<ProjectMember>> fetchOrgMembers(String orgId) async {
    try {
      final response = await _api.dio.get<List<dynamic>>(
        '/organizations/$orgId/members',
        options: _api.withOrgHeader(orgId),
      );
      final list = response.data ?? const [];
      final members = <ProjectMember>[];
      for (final raw in list) {
        if (raw is! Map<String, dynamic>) continue;
        final status = (raw['status'] as String?)?.toLowerCase();
        if (status != null && status.isNotEmpty && status != 'active') {
          continue;
        }
        members.add(
          ProjectMember(
            id: raw['id'] as String? ?? '',
            projectId: '',
            userId: raw['userId'] as String? ?? '',
            role: raw['role'] as String? ?? '',
            user: raw['user'] is Map<String, dynamic>
                ? ProjectMemberUser.fromJson(
                    raw['user'] as Map<String, dynamic>,
                  )
                : null,
          ),
        );
      }
      members.sort((a, b) {
        final an = (a.user?.fullName ?? a.user?.email ?? a.userId).toLowerCase();
        final bn = (b.user?.fullName ?? b.user?.email ?? b.userId).toLowerCase();
        return an.compareTo(bn);
      });
      return members;
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }

  Future<ProjectMember> updateMemberRole({
    required String organizationId,
    required String memberId,
    required String role,
  }) async {
    try {
      final response = await _api.dio.patch<Map<String, dynamic>>(
        '/organizations/$organizationId/members/$memberId',
        data: {'role': role.trim().toLowerCase()},
        options: _api.withOrgHeader(organizationId),
      );
      final raw = response.data ?? const <String, dynamic>{};
      return ProjectMember(
        id: raw['id'] as String? ?? memberId,
        projectId: '',
        userId: raw['userId'] as String? ?? '',
        role: raw['role'] as String? ?? role,
        user: raw['user'] is Map<String, dynamic>
            ? ProjectMemberUser.fromJson(raw['user'] as Map<String, dynamic>)
            : null,
      );
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }

  Future<void> removeMember({
    required String organizationId,
    required String memberId,
  }) async {
    try {
      await _api.dio.delete<void>(
        '/organizations/$organizationId/members/$memberId',
        options: _api.withOrgHeader(organizationId),
      );
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }

  Future<Organization> updateOrganization(
    String orgId, {
    String? name,
    String? slug,
    String? logoUrl,
    bool clearLogo = false,
  }) async {
    try {
      final data = <String, dynamic>{};
      if (name != null) data['name'] = name.trim();
      if (slug != null) data['slug'] = slug.trim().toLowerCase();
      if (clearLogo) {
        data['logoUrl'] = '';
      } else if (logoUrl != null) {
        data['logoUrl'] = logoUrl;
      }

      final response = await _api.dio.patch<Map<String, dynamic>>(
        '/organizations/$orgId',
        data: data,
        options: _api.withOrgHeader(orgId),
      );
      return Organization.fromJson(response.data!);
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }

  /// Permanently delete a workspace. Owner only (enforced by API).
  Future<void> deleteOrganization(String orgId) async {
    try {
      await _api.dio.delete<void>(
        '/organizations/$orgId',
        options: _api.withOrgHeader(orgId),
      );
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }
}

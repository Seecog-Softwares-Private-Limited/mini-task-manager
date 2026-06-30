import 'package:dio/dio.dart';

import '../../core/api/api_client.dart';
import '../../core/api/api_exception.dart';
import '../models/organization.dart';

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
    required String slug,
    String? logoUrl,
  }) async {
    try {
      final response = await _api.dio.post<Map<String, dynamic>>(
        '/organizations',
        data: {
          'name': name.trim(),
          'slug': slug.trim().toLowerCase(),
          if (logoUrl != null && logoUrl.isNotEmpty) 'logoUrl': logoUrl,
        },
      );
      return Organization.fromJson(response.data!);
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
}

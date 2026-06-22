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
}

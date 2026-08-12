import 'package:dio/dio.dart';

import '../../core/api/api_client.dart';
import '../../core/api/api_exception.dart';
import '../models/org_invitation.dart';

class InvitationsRepository {
  InvitationsRepository({required ApiClient apiClient}) : _api = apiClient;

  final ApiClient _api;

  Future<OrgInvitation> createInvitation({
    required String organizationId,
    required String email,
    required String role,
  }) async {
    try {
      final response = await _api.dio.post<Map<String, dynamic>>(
        '/organizations/$organizationId/invitations',
        data: {
          'email': email.trim(),
          'role': role.trim(),
        },
        options: _api.withOrgHeader(organizationId),
      );
      return OrgInvitation.fromJson(response.data ?? const {});
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }

  Future<List<OrgInvitation>> fetchInvitations(String organizationId) async {
    try {
      final response = await _api.dio.get<List<dynamic>>(
        '/organizations/$organizationId/invitations',
        options: _api.withOrgHeader(organizationId),
      );
      final list = response.data ?? const [];
      return list
          .whereType<Map<String, dynamic>>()
          .map(OrgInvitation.fromJson)
          .toList();
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }

  Future<OrgInvitation> resendInvitation({
    required String organizationId,
    required String invitationId,
  }) async {
    try {
      final response = await _api.dio.post<Map<String, dynamic>>(
        '/organizations/$organizationId/invitations/$invitationId/resend',
        options: _api.withOrgHeader(organizationId),
      );
      return OrgInvitation.fromJson(response.data ?? const {});
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }

  Future<void> cancelInvitation({
    required String organizationId,
    required String invitationId,
  }) async {
    try {
      await _api.dio.patch<void>(
        '/organizations/$organizationId/invitations/$invitationId/cancel',
        options: _api.withOrgHeader(organizationId),
      );
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }
}

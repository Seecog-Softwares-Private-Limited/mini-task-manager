import 'dart:typed_data';

import 'package:dio/dio.dart';

import '../../core/api/api_client.dart';
import '../../core/api/api_exception.dart';
import '../models/pending_attachment.dart';
import '../models/task_attachment.dart';

enum AttachmentSource { entity, task }

class AttachmentsRepository {
  AttachmentsRepository({required ApiClient apiClient}) : _api = apiClient;

  final ApiClient _api;

  Future<void> uploadTaskAttachment({
    required String taskId,
    required String organizationId,
    required PendingAttachment file,
  }) async {
    try {
      final form = FormData.fromMap({
        'file': await file.toMultipartFile(),
      });
      await _api.dio.post<void>(
        '/tasks/$taskId/attachments',
        data: form,
        options: _api.withOrgHeader(
          organizationId,
          base: Options(contentType: 'multipart/form-data'),
        ),
      );
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }

  Future<void> uploadSubtaskAttachment({
    required String subtaskId,
    required String taskId,
    required String organizationId,
    required PendingAttachment file,
  }) async {
    await uploadEntityAttachment(
      entityType: 'SUBTASK',
      entityId: subtaskId,
      taskId: taskId,
      organizationId: organizationId,
      file: file,
    );
  }

  Future<void> uploadEntityAttachment({
    required String entityType,
    required String entityId,
    required String taskId,
    required String organizationId,
    required PendingAttachment file,
  }) async {
    try {
      final form = FormData.fromMap({
        'file': await file.toMultipartFile(),
        'entityType': entityType,
        'entityId': entityId,
        'taskId': taskId,
      });
      await _api.dio.post<void>(
        '/attachments/upload',
        data: form,
        options: _api.withOrgHeader(
          organizationId,
          base: Options(contentType: 'multipart/form-data'),
        ),
      );
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }

  Future<List<TaskAttachment>> fetchEntityAttachments({
    required String entityType,
    required String entityId,
    required String organizationId,
    String? taskId,
  }) async {
    try {
      final response = await _api.dio.get<List<dynamic>>(
        '/attachments/entity/$entityType/$entityId',
        queryParameters: taskId == null ? null : {'taskId': taskId},
        options: _api.withOrgHeader(organizationId),
      );
      final list = response.data ?? const [];
      return list
          .whereType<Map<String, dynamic>>()
          .map(TaskAttachment.fromJson)
          .toList();
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }

  Future<void> deleteAttachment({
    required String attachmentId,
    required String organizationId,
  }) async {
    try {
      await _api.dio.delete<void>(
        '/attachments/$attachmentId',
        options: _api.withOrgHeader(organizationId),
      );
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }

  Future<void> deleteTaskAttachment({
    required String taskId,
    required String attachmentId,
    required String organizationId,
  }) async {
    try {
      await _api.dio.delete<void>(
        '/tasks/$taskId/attachments/$attachmentId',
        options: _api.withOrgHeader(organizationId),
      );
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }

  Future<Uint8List> fetchPreviewBytes({
    required String attachmentId,
    required String organizationId,
  }) async {
    return _fetchAttachmentBytes(
      path: '/attachments/$attachmentId/preview',
      organizationId: organizationId,
      fallbackMessage: 'Preview is not available for this file type.',
    );
  }

  Future<Uint8List> downloadBytes({
    required String attachmentId,
    required String organizationId,
  }) async {
    return _fetchAttachmentBytes(
      path: '/attachments/$attachmentId/download',
      organizationId: organizationId,
      fallbackMessage: 'Could not download this attachment.',
    );
  }

  Future<Uint8List> fetchTaskAttachmentBytes({
    required String attachmentId,
    required String organizationId,
  }) async {
    return _fetchAttachmentBytes(
      path: '/tasks/attachments/$attachmentId/file',
      organizationId: organizationId,
      fallbackMessage: 'Could not load this task attachment.',
    );
  }

  /// Load attachment bytes for preview.
  Future<Uint8List> fetchAttachmentContent({
    required String attachmentId,
    required String organizationId,
    AttachmentSource source = AttachmentSource.entity,
  }) async {
    final attempts = source == AttachmentSource.task
        ? <Future<Uint8List> Function()>[
            () => fetchTaskAttachmentBytes(
                  attachmentId: attachmentId,
                  organizationId: organizationId,
                ),
            () => downloadBytes(
                  attachmentId: attachmentId,
                  organizationId: organizationId,
                ),
            () => fetchPreviewBytes(
                  attachmentId: attachmentId,
                  organizationId: organizationId,
                ),
          ]
        : <Future<Uint8List> Function()>[
            () => downloadBytes(
                  attachmentId: attachmentId,
                  organizationId: organizationId,
                ),
            () => fetchPreviewBytes(
                  attachmentId: attachmentId,
                  organizationId: organizationId,
                ),
            () => fetchTaskAttachmentBytes(
                  attachmentId: attachmentId,
                  organizationId: organizationId,
                ),
          ];

    ApiException? lastError;
    for (final attempt in attempts) {
      try {
        return await attempt();
      } on ApiException catch (error) {
        lastError = _preferError(lastError, error);
        if (error.statusCode == 401 || error.statusCode == 403) {
          rethrow;
        }
        if (_isDefinitiveAttachmentError(error)) {
          throw error;
        }
      }
    }
    throw lastError ??
        const ApiException(message: 'Could not load this attachment.');
  }

  bool _isDefinitiveAttachmentError(ApiException error) {
    final message = error.message.toLowerCase();
    return message.contains('missing on the server') ||
        message.contains('file missing') ||
        message.contains('re-upload');
  }

  ApiException _preferError(ApiException? current, ApiException next) {
    if (current == null) return next;
    if (_isDefinitiveAttachmentError(next)) return next;
    if (_isDefinitiveAttachmentError(current)) return current;
    return next;
  }

  Future<Uint8List> _fetchAttachmentBytes({
    required String path,
    required String organizationId,
    required String fallbackMessage,
  }) async {
    try {
      final response = await _api.dio.get<dynamic>(
        path,
        options: _api.withOrgHeader(
          organizationId,
          base: Options(
            responseType: ResponseType.bytes,
            validateStatus: (status) => status != null && status < 500,
          ),
        ),
      );
      final statusCode = response.statusCode ?? 0;
      if (statusCode != 200) {
        throw ApiException(
          message: _messageFromResponseBody(response.data, statusCode) ??
              fallbackMessage,
          statusCode: statusCode,
        );
      }
      final contentType =
          response.headers.value('content-type')?.toLowerCase() ?? '';
      if (contentType.contains('application/json')) {
        throw ApiException(
          message: _messageFromResponseBody(response.data, statusCode) ??
              fallbackMessage,
        );
      }
      final bytes = _normalizeBytes(response.data);
      if (bytes == null || bytes.isEmpty) {
        throw ApiException(message: fallbackMessage);
      }
      return bytes;
    } on ApiException {
      rethrow;
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }

  Uint8List? _normalizeBytes(dynamic data) {
    if (data == null) return null;
    if (data is Uint8List) return data;
    if (data is List<int>) return Uint8List.fromList(data);
    if (data is ByteBuffer) return data.asUint8List();
    return null;
  }

  String? _messageFromResponseBody(dynamic data, int statusCode) {
    if (data is Uint8List) {
      return _messageFromText(String.fromCharCodes(data), statusCode);
    }
    if (data is List<int>) {
      return _messageFromText(String.fromCharCodes(data), statusCode);
    }
    if (data is Map<String, dynamic>) {
      final message = data['message'];
      if (message is String && message.trim().isNotEmpty) return message;
    }
    if (data is String && data.trim().isNotEmpty) {
      return _messageFromText(data, statusCode);
    }
    return _friendlyHttpMessage(statusCode);
  }

  String? _messageFromText(String raw, int statusCode) {
    final trimmed = raw.trim();
    if (trimmed.isEmpty) return _friendlyHttpMessage(statusCode);
    if (trimmed.startsWith('{')) {
      final jsonMessage = _messageFromJsonText(trimmed);
      if (jsonMessage != null) return jsonMessage;
    }
    if (trimmed.contains('ENOENT') || trimmed.contains('no such file')) {
      return 'Attachment file is missing on the server. Re-upload the file.';
    }
    if (!trimmed.startsWith('<') && trimmed.length < 240) {
      return trimmed;
    }
    return _friendlyHttpMessage(statusCode);
  }

  String? _messageFromJsonText(String raw) {
    final match = RegExp(r'"message"\s*:\s*"([^"]+)"').firstMatch(raw);
    return match?.group(1);
  }

  String? _friendlyHttpMessage(int statusCode) {
    return switch (statusCode) {
      400 => 'Could not open this attachment.',
      401 => 'Your session expired. Please sign in again.',
      403 => 'You do not have permission to view this attachment.',
      404 => 'Attachment not found.',
      _ => null,
    };
  }
}

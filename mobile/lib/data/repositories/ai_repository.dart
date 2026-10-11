import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';
import '../../core/api/api_exception.dart';

class AiRepository {
  AiRepository({required ApiClient apiClient}) : _api = apiClient;

  final ApiClient _api;

  /// Returns suggested subtask titles for either an existing [taskId] or a [draft].
  /// Provide exactly one of [taskId] or [draftTitle].
  Future<List<String>> suggestSubtasks({
    required String organizationId,
    String? taskId,
    String? draftTitle,
    String? draftDescription,
    List<String> draftSubtaskTitles = const [],
    List<String> excludeTitles = const [],
  }) async {
    final hasTask = taskId != null && taskId.trim().isNotEmpty;
    final hasDraft = draftTitle != null && draftTitle.trim().isNotEmpty;
    if (hasTask == hasDraft) {
      throw const ApiException(
        message: 'Provide a task or a draft title for suggestions.',
      );
    }

    final body = <String, dynamic>{};
    if (hasTask) {
      body['taskId'] = taskId.trim();
    } else {
      final trimmedTitle = (draftTitle ?? '').trim();
      final draft = <String, dynamic>{
        'title': trimmedTitle.length > 300
            ? trimmedTitle.substring(0, 300)
            : trimmedTitle,
      };
      final description = draftDescription?.trim();
      if (description != null && description.isNotEmpty) {
        draft['description'] = description.length > 10000
            ? description.substring(0, 10000)
            : description;
      }
      final subtasks = draftSubtaskTitles
          .map((t) => t.trim())
          .where((t) => t.isNotEmpty)
          .take(100)
          .map((t) => {
                'title': t.length > 200 ? t.substring(0, 200) : t,
              })
          .toList();
      if (subtasks.isNotEmpty) {
        draft['subtasks'] = subtasks;
      }
      body['draft'] = draft;
    }

    final excluded = excludeTitles
        .map((t) => t.trim())
        .where((t) => t.isNotEmpty)
        .take(40)
        .map((t) => t.length > 200 ? t.substring(0, 200) : t)
        .toList();
    if (excluded.isNotEmpty) {
      body['excludeTitles'] = excluded;
    }

    try {
      final response = await _api.dio.post<Map<String, dynamic>>(
        '/ai/subtask-suggestions',
        data: body,
        options: _api.withOrgHeader(
          organizationId,
          base: Options(
            // Backend AI timeout is ~25s; allow a little headroom.
            receiveTimeout: const Duration(seconds: 35),
            sendTimeout: const Duration(seconds: 20),
          ),
        ),
      );
      final raw = response.data?['suggestions'];
      if (raw is! List) return const [];
      final titles = <String>[];
      for (final item in raw) {
        if (item is! Map) continue;
        final title = item['title'];
        if (title is! String) continue;
        final trimmed = title.trim();
        if (trimmed.isEmpty) continue;
        titles.add(trimmed.length > 200 ? trimmed.substring(0, 200) : trimmed);
      }
      return titles;
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }
}

final aiRepositoryProvider = Provider<AiRepository>((ref) {
  return AiRepository(apiClient: ref.watch(apiClientProvider));
});

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';
import '../../data/models/feedback.dart';
import '../../data/repositories/feedbacks_repository.dart';
import '../auth/session_controller.dart';

final feedbacksRepositoryProvider = Provider<FeedbacksRepository>((ref) {
  return FeedbacksRepository(apiClient: ref.watch(apiClientProvider));
});

final feedbacksListProvider =
    FutureProvider.autoDispose<List<AppFeedback>>((ref) async {
  final orgId = ref.watch(
    sessionControllerProvider.select((s) => s.orgId),
  );
  if (orgId == null || orgId.isEmpty) return const [];
  final result = await ref.watch(feedbacksRepositoryProvider).fetchFeedbacks(
        organizationId: orgId,
        page: 1,
        limit: 50,
      );
  return result.data;
});

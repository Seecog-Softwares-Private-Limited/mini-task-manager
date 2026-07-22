import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';
import '../../data/repositories/feedbacks_repository.dart';

final feedbacksRepositoryProvider = Provider<FeedbacksRepository>((ref) {
  return FeedbacksRepository(apiClient: ref.watch(apiClientProvider));
});

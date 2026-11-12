import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/models/industry_option.dart';
import '../auth/session_controller.dart';

/// Static list of industry editions for the workspace-creation picker.
/// Rarely changes, so it's kept alive for the session.
final industriesProvider = FutureProvider<List<IndustryOption>>((ref) {
  ref.keepAlive();
  return ref.watch(organizationsRepositoryProvider).fetchIndustries();
});

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Deep-link from a push / local notification tap.
class PushDeepLink {
  const PushDeepLink({
    this.taskId,
    this.subtaskId,
    this.projectId,
  });

  final String? taskId;
  final String? subtaskId;
  final String? projectId;

  bool get hasTask => taskId != null && taskId!.trim().isNotEmpty;

  factory PushDeepLink.fromMap(Map<String, dynamic>? raw) {
    if (raw == null || raw.isEmpty) return const PushDeepLink();
    String? read(String key) {
      final value = raw[key]?.toString().trim();
      return (value != null && value.isNotEmpty) ? value : null;
    }

    return PushDeepLink(
      taskId: read('taskId'),
      subtaskId: read('subtaskId'),
      projectId: read('projectId'),
    );
  }

  Map<String, String> toPayloadMap() {
    final out = <String, String>{};
    if (taskId != null && taskId!.trim().isNotEmpty) {
      out['taskId'] = taskId!.trim();
    }
    if (subtaskId != null && subtaskId!.trim().isNotEmpty) {
      out['subtaskId'] = subtaskId!.trim();
    }
    if (projectId != null && projectId!.trim().isNotEmpty) {
      out['projectId'] = projectId!.trim();
    }
    return out;
  }
}

/// Bumped when a push notification tap should select the Alerts tab.
final openAlertsTabTickProvider = StateProvider<int>((ref) => 0);

/// Latest deep-link requested from a notification tap (consumed by [HomeShell]).
final pendingPushDeepLinkProvider = StateProvider<PushDeepLink?>((ref) => null);

void requestOpenAlertsTab(WidgetRef ref, [PushDeepLink? link]) {
  if (link != null && link.hasTask) {
    ref.read(pendingPushDeepLinkProvider.notifier).state = link;
  }
  ref.read(openAlertsTabTickProvider.notifier).state++;
}

void requestOpenAlertsTabFromContainer(
  ProviderContainer container, [
  PushDeepLink? link,
]) {
  if (link != null && link.hasTask) {
    container.read(pendingPushDeepLinkProvider.notifier).state = link;
  }
  container.read(openAlertsTabTickProvider.notifier).state++;
}

String pushPlatformName() {
  if (kIsWeb) return 'web';
  switch (defaultTargetPlatform) {
    case TargetPlatform.iOS:
      return 'ios';
    case TargetPlatform.android:
      return 'android';
    default:
      return defaultTargetPlatform.name.toLowerCase();
  }
}

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Bumped when a push notification tap should select the Alerts tab.
final openAlertsTabTickProvider = StateProvider<int>((ref) => 0);

void requestOpenAlertsTab(WidgetRef ref) {
  ref.read(openAlertsTabTickProvider.notifier).state++;
}

void requestOpenAlertsTabFromContainer(ProviderContainer container) {
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

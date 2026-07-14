import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_exception.dart';
import '../../core/theme/app_colors.dart';
import '../../data/models/recurring.dart';
import '../auth/session_controller.dart';
import 'recurring_providers.dart';

/// True when the current user's org role can manage recurring series
/// (owner/admin). Matches the backend RolesGuard on the mutation endpoints.
bool canManageRecurring(WidgetRef ref) {
  final role = ref.read(selectedOrgProvider)?.myRole?.toLowerCase();
  return role == 'owner' || role == 'admin';
}

void invalidateRecurringData(WidgetRef ref) {
  ref.invalidate(recurringTemplatesProvider);
  ref.invalidate(recurringSummaryProvider);
  ref.invalidate(recurringAnalyticsProvider);
  ref.invalidate(recurringBoardTasksProvider);
}

/// Skips the next pending occurrence of a series.
Future<void> skipNextRecurring({
  required BuildContext context,
  required WidgetRef ref,
  required RecurringTemplate template,
}) async {
  final messenger = ScaffoldMessenger.of(context);
  final orgId = ref.read(sessionControllerProvider).orgId;
  if (orgId == null) return;
  try {
    await ref.read(recurringRepositoryProvider).skipNextOccurrence(
          templateId: template.id,
          organizationId: orgId,
        );
    invalidateRecurringData(ref);
    messenger
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(content: Text('Skipped next run of "${template.title}"')),
      );
  } on ApiException catch (e) {
    messenger.showSnackBar(SnackBar(content: Text(e.message)));
  }
}

/// Duplicates a series into a new paused template the user can then edit.
Future<void> duplicateRecurring({
  required BuildContext context,
  required WidgetRef ref,
  required RecurringTemplate template,
}) async {
  final messenger = ScaffoldMessenger.of(context);
  final orgId = ref.read(sessionControllerProvider).orgId;
  if (orgId == null) return;
  try {
    await ref.read(recurringRepositoryProvider).duplicateTemplate(
          templateId: template.id,
          organizationId: orgId,
        );
    invalidateRecurringData(ref);
    messenger
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(content: Text('Duplicated "${template.title}"')),
      );
  } on ApiException catch (e) {
    messenger.showSnackBar(SnackBar(content: Text(e.message)));
  }
}

/// Archives a series (stops future runs but keeps history), with Undo.
Future<void> archiveRecurring({
  required BuildContext context,
  required WidgetRef ref,
  required RecurringTemplate template,
}) async {
  final messenger = ScaffoldMessenger.of(context);
  final orgId = ref.read(sessionControllerProvider).orgId;
  if (orgId == null) return;
  try {
    await ref.read(recurringRepositoryProvider).archiveTemplate(
          templateId: template.id,
          organizationId: orgId,
        );
    invalidateRecurringData(ref);
    messenger
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Text('Archived "${template.title}"'),
          action: SnackBarAction(
            label: 'Undo',
            onPressed: () async {
              try {
                await ref.read(recurringRepositoryProvider).resumeTemplate(
                      templateId: template.id,
                      organizationId: orgId,
                    );
                invalidateRecurringData(ref);
              } catch (_) {
                // Best-effort; list will reflect server state.
              }
            },
          ),
        ),
      );
  } on ApiException catch (e) {
    messenger.showSnackBar(SnackBar(content: Text(e.message)));
  }
}

/// Shows a simple delete confirmation. Returns true if the series was deleted.
Future<bool> confirmDeleteSeries({
  required BuildContext context,
  required WidgetRef ref,
  required RecurringTemplate template,
}) async {
  final orgId = ref.read(sessionControllerProvider).orgId;
  if (orgId == null) return false;

  final confirmed = await showDialog<bool>(
    context: context,
    builder: (dialogContext) => AlertDialog(
      title: const Text('Delete series?'),
      content: Text(
        'Delete "${template.title}"? This cannot be undone.',
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(dialogContext).pop(false),
          child: const Text('Cancel'),
        ),
        FilledButton(
          onPressed: () => Navigator.of(dialogContext).pop(true),
          style: FilledButton.styleFrom(backgroundColor: AppColors.danger),
          child: const Text('Delete'),
        ),
      ],
    ),
  );

  if (confirmed != true) return false;

  try {
    await ref.read(recurringRepositoryProvider).deleteSeries(
          templateId: template.id,
          organizationId: orgId,
        );
    invalidateRecurringData(ref);
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Deleted "${template.title}"')),
      );
    }
    return true;
  } on ApiException catch (e) {
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.message)),
      );
    }
    return false;
  }
}

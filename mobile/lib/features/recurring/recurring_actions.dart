import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_exception.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
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

/// Shows the guarded delete dialog. Returns true if the series was deleted.
Future<bool> confirmDeleteSeries({
  required BuildContext context,
  required WidgetRef ref,
  required RecurringTemplate template,
}) async {
  final orgId = ref.read(sessionControllerProvider).orgId;
  if (orgId == null) return false;
  final deleted = await showDialog<bool>(
    context: context,
    builder: (_) => _DeleteSeriesDialog(
      organizationId: orgId,
      template: template,
      ref: ref,
    ),
  );
  if (deleted == true) {
    invalidateRecurringData(ref);
  }
  return deleted == true;
}

class _DeleteSeriesDialog extends StatefulWidget {
  const _DeleteSeriesDialog({
    required this.organizationId,
    required this.template,
    required this.ref,
  });

  final String organizationId;
  final RecurringTemplate template;
  final WidgetRef ref;

  @override
  State<_DeleteSeriesDialog> createState() => _DeleteSeriesDialogState();
}

class _DeleteSeriesDialogState extends State<_DeleteSeriesDialog> {
  final _controller = TextEditingController();
  bool _deleting = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _controller.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  bool get _confirmed =>
      _controller.text.trim() == widget.template.title.trim();

  Future<void> _delete() async {
    setState(() {
      _deleting = true;
      _error = null;
    });
    try {
      await widget.ref.read(recurringRepositoryProvider).deleteSeries(
            templateId: widget.template.id,
            organizationId: widget.organizationId,
          );
      if (mounted) Navigator.of(context).pop(true);
    } on ApiException catch (e) {
      if (mounted) {
        setState(() {
          _error = e.message;
          _deleting = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final generated = widget.template.generatedCount;
    final impact = generated > 0
        ? 'This permanently deletes "${widget.template.title}", its recurrence '
            'rule and its ${generated == 1 ? '1 generated run' : '$generated generated runs'}.'
        : 'This permanently deletes "${widget.template.title}" and its recurrence rule.';

    return AlertDialog(
      title: const Row(
        children: [
          Icon(Icons.warning_amber_rounded, color: AppColors.danger),
          SizedBox(width: AppSpacing.xs),
          Expanded(child: Text('Delete series')),
        ],
      ),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(impact),
          const SizedBox(height: AppSpacing.xs),
          Text(
            'Consider archiving instead — it keeps your history for reviews. '
            'Deleting cannot be undone.',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: AppColors.danger,
                  fontWeight: FontWeight.w600,
                ),
          ),
          const SizedBox(height: AppSpacing.md),
          Text(
            'Type the series name to confirm:',
            style: Theme.of(context).textTheme.labelMedium,
          ),
          const SizedBox(height: AppSpacing.xs),
          TextField(
            controller: _controller,
            autofocus: true,
            enabled: !_deleting,
            decoration: InputDecoration(
              hintText: widget.template.title,
              border: const OutlineInputBorder(),
            ),
          ),
          if (_error != null) ...[
            const SizedBox(height: AppSpacing.sm),
            Text(
              _error!,
              style: TextStyle(color: Theme.of(context).colorScheme.error),
            ),
          ],
        ],
      ),
      actions: [
        TextButton(
          onPressed: _deleting ? null : () => Navigator.of(context).pop(false),
          child: const Text('Cancel'),
        ),
        FilledButton(
          onPressed: (_confirmed && !_deleting) ? _delete : null,
          style: FilledButton.styleFrom(backgroundColor: AppColors.danger),
          child: _deleting
              ? const SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(
                      strokeWidth: 2, color: Colors.white),
                )
              : const Text('Delete forever'),
        ),
      ],
    );
  }
}

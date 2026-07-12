import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../core/api/api_exception.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../data/models/recurring.dart';
import '../../shared/widgets/app_widgets.dart';
import '../auth/session_controller.dart';
import 'recurring_actions.dart';
import 'recurring_editor_sheet.dart';
import 'recurring_planner_sheet.dart';
import 'recurring_providers.dart';

class RecurringSeriesTab extends ConsumerWidget {
  const RecurringSeriesTab({super.key});

  Future<void> _createSeries(
    BuildContext context,
    WidgetRef ref,
    String projectId,
  ) async {
    final orgId = ref.read(sessionControllerProvider).orgId;
    if (orgId == null) return;
    await showRecurringEditorSheet(
      context: context,
      organizationId: orgId,
      projectId: projectId,
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final projectId = ref.watch(recurringSelectedProjectIdProvider);
    final templatesAsync = ref.watch(recurringTemplatesProvider);
    final canManage = canManageRecurring(ref);

    if (projectId == null) {
      return const Center(child: CircularProgressIndicator());
    }

    return templatesAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, _) {
        final isNetwork = error is ApiException && error.isNetwork;
        return Center(
          child: Padding(
            padding: const EdgeInsets.all(AppSpacing.lg),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                EmptyState(
                  title: 'Series unavailable',
                  message: error.toString(),
                  icon: Icons.library_books_outlined,
                ),
                if (isNetwork) ...[
                  const SizedBox(height: AppSpacing.md),
                  PrimaryButton(
                    label: 'Retry',
                    expand: false,
                    onPressed: () => ref.invalidate(recurringTemplatesProvider),
                  ),
                ],
              ],
            ),
          ),
        );
      },
      data: (templates) {
        if (templates.isEmpty) {
          return Center(
            child: Padding(
              padding: const EdgeInsets.all(AppSpacing.lg),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const EmptyState(
                    title: 'No recurring series',
                    message:
                        'Build routines and habits that repeat automatically.',
                    icon: Icons.event_repeat_rounded,
                  ),
                  if (canManage) ...[
                    const SizedBox(height: AppSpacing.md),
                    PrimaryButton(
                      label: 'New recurring series',
                      expand: false,
                      onPressed: () => _createSeries(context, ref, projectId),
                    ),
                  ],
                ],
              ),
            ),
          );
        }

        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (canManage)
              Padding(
                padding: const EdgeInsets.fromLTRB(
                  AppSpacing.md,
                  AppSpacing.md,
                  AppSpacing.md,
                  0,
                ),
                child: Align(
                  alignment: Alignment.centerRight,
                  child: FilledButton.icon(
                    onPressed: () => _createSeries(context, ref, projectId),
                    icon: const Icon(Icons.add_rounded, size: 18),
                    label: const Text('New recurring'),
                  ),
                ),
              ),
            Expanded(
              child: RefreshIndicator(
                onRefresh: () async {
                  ref.invalidate(recurringTemplatesProvider);
                  await ref.read(recurringTemplatesProvider.future);
                },
                child: ListView.separated(
                  padding: const EdgeInsets.all(AppSpacing.md),
                  itemCount: templates.length,
                  separatorBuilder: (_, __) =>
                      const SizedBox(height: AppSpacing.sm),
                  itemBuilder: (context, index) {
                    return _SeriesCard(
                      template: templates[index],
                      projectId: projectId,
                      canManage: canManage,
                    );
                  },
                ),
              ),
            ),
          ],
        );
      },
    );
  }
}

class _SeriesCard extends ConsumerWidget {
  const _SeriesCard({
    required this.template,
    required this.projectId,
    required this.canManage,
  });

  final RecurringTemplate template;
  final String projectId;
  final bool canManage;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final next = DateTime.tryParse(template.nextDueDate);
    final nextLabel =
        next != null ? DateFormat('MMM d').format(next.toLocal()) : '—';
    final rate = template.successRate;

    return SurfaceCard(
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () => showRecurringPlannerSheet(
          context: context,
          ref: ref,
          template: template,
          projectId: projectId,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    template.title,
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                ),
                StatusChip(
                  label: template.isPaused ? 'Paused' : template.repeatType,
                  color:
                      template.isPaused ? AppColors.warning : AppColors.violet,
                ),
                if (canManage)
                  _SeriesMenu(template: template, projectId: projectId),
              ],
            ),
            const SizedBox(height: AppSpacing.xs),
            Text(
              'Next: $nextLabel · ${template.completed}/${template.generatedCount} done',
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            if (rate != null) ...[
              const SizedBox(height: AppSpacing.xs),
              Text(
                'Success $rate%',
                style: Theme.of(context).textTheme.labelMedium?.copyWith(
                      color: AppColors.sky,
                    ),
              ),
            ],
            const SizedBox(height: AppSpacing.sm),
            Row(
              children: [
                if (template.isPaused)
                  TextButton(
                    onPressed: () async {
                      final orgId = ref.read(sessionControllerProvider).orgId;
                      if (orgId == null) return;
                      await ref
                          .read(recurringRepositoryProvider)
                          .resumeTemplate(
                            templateId: template.id,
                            organizationId: orgId,
                          );
                      invalidateRecurringData(ref);
                    },
                    child: const Text('Resume'),
                  )
                else
                  TextButton(
                    onPressed: () async {
                      final orgId = ref.read(sessionControllerProvider).orgId;
                      if (orgId == null) return;
                      await ref
                          .read(recurringRepositoryProvider)
                          .pauseTemplate(
                            templateId: template.id,
                            organizationId: orgId,
                          );
                      invalidateRecurringData(ref);
                    },
                    child: const Text('Pause'),
                  ),
                const Spacer(),
                Text(
                  'Open planner',
                  style: Theme.of(context).textTheme.labelMedium?.copyWith(
                        color: AppColors.primary,
                        fontWeight: FontWeight.w600,
                      ),
                ),
                const Icon(
                  Icons.chevron_right_rounded,
                  color: AppColors.primary,
                  size: 20,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

enum _SeriesAction { edit, skip, duplicate, archive, delete }

class _SeriesMenu extends ConsumerWidget {
  const _SeriesMenu({required this.template, required this.projectId});

  final RecurringTemplate template;
  final String projectId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return PopupMenuButton<_SeriesAction>(
      icon: const Icon(Icons.more_vert_rounded),
      tooltip: 'Series actions',
      onSelected: (action) async {
        final orgId = ref.read(sessionControllerProvider).orgId;
        if (orgId == null) return;
        switch (action) {
          case _SeriesAction.edit:
            await showRecurringEditorSheet(
              context: context,
              organizationId: orgId,
              projectId: projectId,
              template: template,
            );
            break;
          case _SeriesAction.skip:
            await skipNextRecurring(
                context: context, ref: ref, template: template);
            break;
          case _SeriesAction.duplicate:
            await duplicateRecurring(
                context: context, ref: ref, template: template);
            break;
          case _SeriesAction.archive:
            await archiveRecurring(
                context: context, ref: ref, template: template);
            break;
          case _SeriesAction.delete:
            await confirmDeleteSeries(
                context: context, ref: ref, template: template);
            break;
        }
      },
      itemBuilder: (context) => [
        const PopupMenuItem(
          value: _SeriesAction.edit,
          child: ListTile(
            leading: Icon(Icons.edit_outlined),
            title: Text('Edit'),
            contentPadding: EdgeInsets.zero,
          ),
        ),
        const PopupMenuItem(
          value: _SeriesAction.skip,
          child: ListTile(
            leading: Icon(Icons.skip_next_rounded),
            title: Text('Skip next run'),
            contentPadding: EdgeInsets.zero,
          ),
        ),
        const PopupMenuItem(
          value: _SeriesAction.duplicate,
          child: ListTile(
            leading: Icon(Icons.copy_all_rounded),
            title: Text('Duplicate'),
            contentPadding: EdgeInsets.zero,
          ),
        ),
        const PopupMenuItem(
          value: _SeriesAction.archive,
          child: ListTile(
            leading: Icon(Icons.archive_outlined),
            title: Text('Archive'),
            contentPadding: EdgeInsets.zero,
          ),
        ),
        const PopupMenuDivider(),
        const PopupMenuItem(
          value: _SeriesAction.delete,
          child: ListTile(
            leading:
                Icon(Icons.delete_outline_rounded, color: AppColors.danger),
            title: Text('Delete', style: TextStyle(color: AppColors.danger)),
            contentPadding: EdgeInsets.zero,
          ),
        ),
      ],
    );
  }
}

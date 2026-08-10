import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../core/api/api_exception.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../shared/widgets/app_widgets.dart';
import '../auth/session_controller.dart';
import '../projects/projects_providers.dart';
import 'recurring_actions.dart';
import 'recurring_editor_sheet.dart';
import 'recurring_planner_sheet.dart';
import 'recurring_providers.dart';

class RecurringSeriesTab extends ConsumerWidget {
  const RecurringSeriesTab({super.key});

  Future<void> _openCreate(BuildContext context, WidgetRef ref) async {
    final orgId = ref.read(sessionControllerProvider).orgId;
    final projectId = ref.read(recurringSelectedProjectIdProvider);
    if (orgId == null || projectId == null) return;
    if (!canManageRecurring(ref)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Only workspace owners and admins can create planners.'),
        ),
      );
      return;
    }
    await showRecurringEditorSheet(
      context: context,
      organizationId: orgId,
      projectId: projectId,
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final projectsAsync = ref.watch(projectsProvider);
    final projectId = ref.watch(recurringSelectedProjectIdProvider);
    final templatesAsync = ref.watch(recurringTemplatesProvider);

    final projectsLoading =
        projectsAsync.isLoading && projectsAsync.valueOrNull == null;
    final projects = (projectsAsync.valueOrNull ?? const [])
        .where((p) => !p.isArchived)
        .toList();

    if (projectsLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (projects.isEmpty) {
      return const Padding(
        padding: EdgeInsets.all(AppSpacing.lg),
        child: EmptyState(
          title: 'No projects yet',
          message:
              'Create a project first, then add recurring planners for it here.',
          icon: Icons.folder_off_outlined,
        ),
      );
    }

    if (projectId == null) {
      return const Padding(
        padding: EdgeInsets.all(AppSpacing.lg),
        child: EmptyState(
          title: 'Select a project',
          message: 'Choose a project above to view its recurring planners.',
          icon: Icons.folder_open_outlined,
        ),
      );
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
        message: userFacingError(error),
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
                    title: 'No recurring planners',
                    message:
                        'Add a planner series for this project. It stays in Planner and won’t show on Tasks.',
                    icon: Icons.event_repeat_rounded,
                  ),
                  const SizedBox(height: AppSpacing.md),
                  PrimaryButton(
                    label: 'Add planner',
                    expand: false,
                    onPressed: () => _openCreate(context, ref),
                  ),
                ],
              ),
            ),
          );
        }

        return RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(recurringTemplatesProvider);
            await ref.read(recurringTemplatesProvider.future);
          },
          child: ListView.separated(
            padding: const EdgeInsets.all(AppSpacing.md),
            itemCount: templates.length,
            separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.sm),
            itemBuilder: (context, index) {
              final template = templates[index];
              final next = DateTime.tryParse(template.nextDueDate);
              final nextLabel = next != null
                  ? DateFormat('MMM d').format(next.toLocal())
                  : '—';

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
                            color: template.isPaused ? AppColors.warning : AppColors.violet,
                          ),
                        ],
                      ),
                      const SizedBox(height: AppSpacing.xs),
                      Text(
                        'Next: $nextLabel · ${template.completed}/${template.generatedCount} done',
                        style: Theme.of(context).textTheme.bodyMedium,
                      ),
                      if (template.completionHealth != null) ...[
                        const SizedBox(height: AppSpacing.xs),
                        Text(
                          'Health ${(template.completionHealth! * 100).round()}%',
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
                                await ref.read(recurringRepositoryProvider).resumeTemplate(
                                      templateId: template.id,
                                      organizationId: orgId,
                                    );
                                ref.invalidate(recurringTemplatesProvider);
                              },
                              child: const Text('Resume'),
                            )
                          else
                            TextButton(
                              onPressed: () async {
                                final orgId = ref.read(sessionControllerProvider).orgId;
                                if (orgId == null) return;
                                await ref.read(recurringRepositoryProvider).pauseTemplate(
                                      templateId: template.id,
                                      organizationId: orgId,
                                    );
                                ref.invalidate(recurringTemplatesProvider);
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
                          Icon(
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
            },
          ),
        );
      },
    );
  }
}

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../shared/widgets/app_widgets.dart';
import 'recurring_providers.dart';

class RecurringSeriesTab extends ConsumerWidget {
  const RecurringSeriesTab({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final templatesAsync = ref.watch(recurringTemplatesProvider);

    return templatesAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, _) => EmptyState(
        title: 'Series unavailable',
        message: error.toString(),
        icon: Icons.library_books_outlined,
      ),
      data: (templates) {
        if (templates.isEmpty) {
          return const EmptyState(
            title: 'No recurring planners',
            message: 'Create a recurring planner in the web app.',
            icon: Icons.event_repeat_rounded,
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
                              await ref
                                  .read(recurringRepositoryProvider)
                                  .resumeTemplate(template.id);
                              ref.invalidate(recurringTemplatesProvider);
                            },
                            child: const Text('Resume'),
                          )
                        else
                          TextButton(
                            onPressed: () async {
                              await ref
                                  .read(recurringRepositoryProvider)
                                  .pauseTemplate(template.id);
                              ref.invalidate(recurringTemplatesProvider);
                            },
                            child: const Text('Pause'),
                          ),
                      ],
                    ),
                  ],
                ),
              );
            },
          ),
        );
      },
    );
  }
}

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_exception.dart';
import '../../core/constants/epic_colors.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../data/models/epic.dart';
import '../../shared/widgets/app_widgets.dart';
import '../home/my_work_providers.dart';
import 'create_edit_epic_sheet.dart';
import 'epic_providers.dart';

/// Epics tab content for the project board. Not a route — reached as a
/// capsule tab, mirroring web's single epics list page.
class EpicsListSection extends ConsumerWidget {
  const EpicsListSection({
    super.key,
    required this.organizationId,
    required this.projectId,
  });

  final String organizationId;
  final String projectId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final epicsAsync = ref.watch(epicsForProjectProvider(projectId));

    return epicsAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, _) {
        final message = error is ApiException ? error.message : 'Unable to load epics.';
        return EmptyState(
          title: 'Epics unavailable',
          message: message,
          icon: Icons.flag_outlined,
        );
      },
      data: (epics) {
        if (epics.isEmpty) {
          return const EmptyState(
            title: 'No epics yet',
            message: 'Group related tasks under an epic to track progress together.',
            icon: Icons.flag_outlined,
          );
        }
        return RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(epicsForProjectProvider(projectId));
            await ref.read(epicsForProjectProvider(projectId).future);
          },
          child: ListView.separated(
            padding: const EdgeInsets.all(AppSpacing.md),
            itemCount: epics.length,
            separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.sm),
            itemBuilder: (context, index) {
              final epic = epics[index];
              return _EpicCard(
                epic: epic,
                organizationId: organizationId,
                projectId: isAllProjectsSelection(projectId) ? epic.projectId : projectId,
              );
            },
          ),
        );
      },
    );
  }
}

class _EpicCard extends ConsumerWidget {
  const _EpicCard({
    required this.epic,
    required this.organizationId,
    required this.projectId,
  });

  final Epic epic;
  final String organizationId;
  final String projectId;

  Future<void> _delete(BuildContext context, WidgetRef ref) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) {
        return AlertDialog(
          title: const Text('Delete epic'),
          content: Text(
            'Permanently delete "${epic.title}"? '
            'Tasks linked to it keep their history but lose the epic reference.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(false),
              child: const Text('Cancel'),
            ),
            FilledButton(
              style: FilledButton.styleFrom(backgroundColor: AppColors.danger),
              onPressed: () => Navigator.of(dialogContext).pop(true),
              child: const Text('Delete'),
            ),
          ],
        );
      },
    );
    if (confirmed != true) return;

    try {
      await ref
          .read(epicsRepositoryProvider)
          .deleteEpic(organizationId: organizationId, epicId: epic.id);
      ref.invalidate(epicsForProjectProvider(projectId));
    } on ApiException catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
      }
    }
  }

  void _edit(BuildContext context, WidgetRef ref) {
    showCreateEditEpicSheet(
      context: context,
      organizationId: organizationId,
      projectId: epic.projectId,
      epic: epic,
      onSaved: () => ref.invalidate(epicsForProjectProvider(projectId)),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final color = parseEpicColor(epic.color);
    final pct = (epic.progress * 100).round();

    return Material(
      color: AppColors.surface,
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        onTap: () => _edit(context, ref),
        borderRadius: BorderRadius.circular(14),
        child: Container(
          padding: const EdgeInsets.all(AppSpacing.sm),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppColors.border),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    width: 10,
                    height: 10,
                    decoration: BoxDecoration(shape: BoxShape.circle, color: color),
                  ),
                  const SizedBox(width: AppSpacing.xs),
                  Expanded(
                    child: Text(
                      epic.title,
                      style: Theme.of(context).textTheme.titleSmall?.copyWith(
                            fontWeight: FontWeight.w700,
                          ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  _StatusBadge(status: epic.status),
                  PopupMenuButton<String>(
                    icon: const Icon(Icons.more_vert, size: 18, color: AppColors.textMuted),
                    onSelected: (value) {
                      if (value == 'edit') _edit(context, ref);
                      if (value == 'delete') _delete(context, ref);
                    },
                    itemBuilder: (_) => const [
                      PopupMenuItem(value: 'edit', child: Text('Edit')),
                      PopupMenuItem(value: 'delete', child: Text('Delete')),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.xs),
              Text(
                '${epic.taskCount} tasks · $pct% complete',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: AppColors.textMuted,
                    ),
              ),
              const SizedBox(height: AppSpacing.xxs),
              ClipRRect(
                borderRadius: BorderRadius.circular(999),
                child: LinearProgressIndicator(
                  value: epic.progress,
                  minHeight: 6,
                  backgroundColor: AppColors.border,
                  color: color,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _StatusBadge extends StatelessWidget {
  const _StatusBadge({required this.status});

  final String status;

  @override
  Widget build(BuildContext context) {
    final label = kEpicStatusLabels[status] ?? status;
    return Padding(
      padding: const EdgeInsets.only(right: AppSpacing.xxs),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
        decoration: BoxDecoration(
          color: AppColors.textMuted.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(999),
        ),
        child: Text(
          label,
          style: Theme.of(context).textTheme.labelSmall?.copyWith(
                color: AppColors.textSecondary,
              ),
        ),
      ),
    );
  }
}

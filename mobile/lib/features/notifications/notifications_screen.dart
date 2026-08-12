import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../core/api/api_exception.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../data/models/notification.dart';
import '../../data/models/workflow.dart';
import '../../shared/widgets/app_widgets.dart';
import '../kanban/kanban_providers.dart';
import '../kanban/task_detail_sheet.dart';
import 'notifications_providers.dart';

class NotificationsScreen extends ConsumerWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notificationsAsync = ref.watch(notificationsProvider);

    return notificationsAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, _) => EmptyState(
        title: 'Notifications unavailable',
        message: userFacingError(error),
        icon: Icons.notifications_off_outlined,
      ),
      data: (items) {
        if (items.isEmpty) {
          return const EmptyState(
            title: 'All caught up',
            message: 'No notifications yet.',
            icon: Icons.notifications_none_outlined,
          );
        }

        return RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(notificationsProvider);
            await ref.read(notificationsProvider.future);
          },
          child: ListView.separated(
            padding: const EdgeInsets.all(AppSpacing.md),
            itemCount: items.length + 1,
            separatorBuilder: (_, index) => const SizedBox(height: AppSpacing.sm),
            itemBuilder: (context, index) {
              if (index == 0) {
                return Align(
                  alignment: Alignment.centerRight,
                  child: TextButton(
                    onPressed: () async {
                      await ref.read(notificationsRepositoryProvider).markAllAsRead();
                      ref.invalidate(notificationsProvider);
                    },
                    child: const Text('Mark all read'),
                  ),
                );
              }

              final item = items[index - 1];
              final when = DateTime.tryParse(item.createdAt);
              final whenLabel = when != null
                  ? DateFormat('MMM d, h:mm a').format(when.toLocal())
                  : '';
              final canOpenTask = item.taskId != null;

              return SurfaceCard(
                onTap: canOpenTask || !item.isRead
                    ? () => _onNotificationTap(context, ref, item)
                    : null,
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(
                      item.isRead ? Icons.notifications_none : Icons.notifications,
                      color: item.isRead ? AppColors.textMuted : AppColors.primary,
                    ),
                    const SizedBox(width: AppSpacing.sm),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            item.title ?? 'Notification',
                            style: Theme.of(context).textTheme.titleMedium,
                          ),
                          if (item.message != null && item.message!.isNotEmpty) ...[
                            const SizedBox(height: 4),
                            Text(item.message!, style: Theme.of(context).textTheme.bodyMedium),
                          ],
                          const SizedBox(height: 4),
                          Text(whenLabel, style: Theme.of(context).textTheme.labelMedium),
                        ],
                      ),
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

  Future<void> _onNotificationTap(
    BuildContext context,
    WidgetRef ref,
    AppNotification item,
  ) async {
    if (!item.isRead) {
      try {
        await ref.read(notificationsRepositoryProvider).markAsRead(item.id);
        ref.invalidate(notificationsProvider);
      } catch (_) {
        // Still attempt deep-link even if mark-read fails.
      }
    }

    final taskId = item.taskId;
    if (taskId == null || !context.mounted) return;

    try {
      final task = await ref.read(tasksRepositoryProvider).fetchTask(taskId);
      List<WorkflowStatus> statuses = const [];
      try {
        statuses =
            await ref.read(projectWorkflowStatusesProvider(task.projectId).future);
      } catch (_) {
        statuses = const [];
      }
      if (!context.mounted) return;
      await showModalBottomSheet<void>(
        context: context,
        isScrollControlled: true,
        backgroundColor: Colors.transparent,
        builder: (_) {
          return TaskDetailSheet(
            task: task,
            statuses: statuses,
            projectId: task.projectId,
            initialSubtaskId: item.subtaskId,
            onUpdated: () => ref.invalidate(notificationsProvider),
            onDeleted: () => ref.invalidate(notificationsProvider),
          );
        },
      );
    } catch (error) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(userFacingError(error))),
      );
    }
  }
}

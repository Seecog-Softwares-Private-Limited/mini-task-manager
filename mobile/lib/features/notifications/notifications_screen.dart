import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../core/api/api_exception.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../shared/widgets/app_widgets.dart';
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

              return SurfaceCard(
                onTap: item.isRead
                    ? null
                    : () async {
                        await ref
                            .read(notificationsRepositoryProvider)
                            .markAsRead(item.id);
                        ref.invalidate(notificationsProvider);
                      },
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
}

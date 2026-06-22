import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/router/app_router.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../shared/widgets/app_widgets.dart';
import '../auth/session_controller.dart';
import '../projects/projects_providers.dart';

class WorkspacePickerScreen extends ConsumerStatefulWidget {
  const WorkspacePickerScreen({super.key});

  @override
  ConsumerState<WorkspacePickerScreen> createState() => _WorkspacePickerScreenState();
}

class _WorkspacePickerScreenState extends ConsumerState<WorkspacePickerScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() {
      ref.read(sessionControllerProvider.notifier).refreshOrganizations();
    });
  }

  @override
  Widget build(BuildContext context) {
    final session = ref.watch(sessionControllerProvider);
    final organizations = session.organizations;
    final canPop = context.canPop();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Choose workspace'),
        leading: canPop ? const BackButton() : null,
        actions: [
          if (!canPop)
            TextButton(
              onPressed: () async {
                await ref.read(sessionControllerProvider.notifier).logout();
                if (context.mounted) context.go(AppRoutes.login);
              },
              child: const Text('Sign out'),
            ),
        ],
      ),
      body: organizations.isEmpty
          ? const EmptyState(
              title: 'No workspaces found',
              message: 'Create a workspace in the web app, then return here.',
              icon: Icons.business_outlined,
            )
          : ListView.separated(
              padding: const EdgeInsets.all(AppSpacing.md),
              itemCount: organizations.length,
              separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.sm),
              itemBuilder: (context, index) {
                final org = organizations[index];
                final initial = org.name.isNotEmpty ? org.name[0].toUpperCase() : '?';

                return SurfaceCard(
                  onTap: () async {
                    await ref
                        .read(sessionControllerProvider.notifier)
                        .selectOrganization(org.id);
                    if (!context.mounted) return;
                    ref.invalidate(projectsProvider);
                    if (canPop) {
                      context.pop();
                    } else {
                      context.go(AppRoutes.home);
                    }
                  },
                  child: Row(
                    children: [
                      CircleAvatar(
                        backgroundColor: AppColors.primary.withValues(alpha: 0.12),
                        foregroundColor: AppColors.primary,
                        child: Text(initial),
                      ),
                      const SizedBox(width: AppSpacing.sm),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(org.name, style: Theme.of(context).textTheme.titleMedium),
                            const SizedBox(height: 2),
                            Text(
                              org.slug,
                              style: Theme.of(context).textTheme.bodyMedium,
                            ),
                          ],
                        ),
                      ),
                      if (org.myRole != null)
                        StatusChip(
                          label: org.myRole!,
                          color: AppColors.sky,
                        ),
                      const Icon(Icons.chevron_right, color: AppColors.textMuted),
                    ],
                  ),
                );
              },
            ),
    );
  }
}

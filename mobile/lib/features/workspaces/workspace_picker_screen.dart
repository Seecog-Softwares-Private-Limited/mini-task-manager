import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/api_exception.dart';
import '../../core/router/app_router.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../shared/widgets/app_widgets.dart';
import '../../shared/widgets/workspace_avatar.dart';
import '../auth/session_controller.dart';
import '../projects/projects_providers.dart';
import 'create_workspace_sheet.dart';

class WorkspacePickerScreen extends ConsumerStatefulWidget {
  const WorkspacePickerScreen({super.key});

  @override
  ConsumerState<WorkspacePickerScreen> createState() => _WorkspacePickerScreenState();
}

class _WorkspacePickerScreenState extends ConsumerState<WorkspacePickerScreen> {
  bool _loading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    Future.microtask(_load);
  }

  Future<void> _load() async {
    final existing = ref.read(sessionControllerProvider).organizations;
    if (existing.isNotEmpty) {
      if (mounted) {
        setState(() {
          _loading = false;
          _error = null;
        });
      }
      return;
    }

    if (mounted) {
      setState(() {
        _loading = true;
        _error = null;
      });
    }

    try {
      await ref.read(sessionControllerProvider.notifier).refreshOrganizations();
    } on ApiException catch (error) {
      if (mounted) setState(() => _error = error.message);
    } catch (_) {
      if (mounted) {
        setState(() => _error = 'Could not load workspaces. Check your connection and try again.');
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _openCreate() async {
    await showCreateWorkspaceSheet(
      context: context,
      ref: ref,
      onCreated: () async {
        ref.invalidate(projectsProvider);
        await _load();
        if (!mounted) return;
        context.go(AppRoutes.home);
      },
    );
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
          TextButton.icon(
            onPressed: _openCreate,
            icon: const Icon(Icons.add_rounded, size: 18),
            label: const Text('New'),
          ),
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
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(AppSpacing.lg),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          _error!,
                          textAlign: TextAlign.center,
                          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                color: AppColors.danger,
                              ),
                        ),
                        const SizedBox(height: AppSpacing.md),
                        SecondaryButton(label: 'Retry', onPressed: _load),
                      ],
                    ),
                  ),
                )
              : organizations.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const EmptyState(
                            title: 'No workspaces yet',
                            message:
                                'Create your first workspace to start organizing projects and tasks.',
                            icon: Icons.business_outlined,
                          ),
                          const SizedBox(height: AppSpacing.md),
                          PrimaryButton(
                            label: 'Create workspace',
                            expand: false,
                            onPressed: _openCreate,
                          ),
                        ],
                      ),
                    )
                  : ListView.separated(
                      padding: const EdgeInsets.all(AppSpacing.md),
                      itemCount: organizations.length,
                      separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.sm),
                      itemBuilder: (context, index) {
                    final org = organizations[index];

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
                          WorkspaceAvatar(
                            logoUrl: org.logoUrl,
                            name: org.name,
                            size: 44,
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

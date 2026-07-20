import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../data/models/organization.dart';
import '../../shared/widgets/app_widgets.dart';
import '../../shared/widgets/workspace_avatar.dart';
import '../auth/session_controller.dart';
import '../projects/projects_providers.dart';
import 'create_workspace_sheet.dart';
import 'workspace_settings_sheet.dart';

class WorkspaceSwitcherSheet extends ConsumerStatefulWidget {
  const WorkspaceSwitcherSheet({super.key});

  @override
  ConsumerState<WorkspaceSwitcherSheet> createState() => _WorkspaceSwitcherSheetState();
}

class _WorkspaceSwitcherSheetState extends ConsumerState<WorkspaceSwitcherSheet> {
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    Future.microtask(_load);
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await ref.read(sessionControllerProvider.notifier).refreshOrganizations();
    } catch (e) {
      if (mounted) setState(() => _error = 'Could not load workspaces');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _select(Organization org) async {
    final currentOrgId = ref.read(sessionControllerProvider).orgId;
    if (currentOrgId == org.id) {
      if (mounted) Navigator.of(context).pop();
      return;
    }

    await ref.read(sessionControllerProvider.notifier).selectOrganization(org.id);
    ref.invalidate(projectsProvider);
    if (mounted) Navigator.of(context).pop();
  }

  Future<void> _openSettings(Organization org) async {
    final updated = await showWorkspaceSettingsSheet(
      context: context,
      ref: ref,
      organizationId: org.id,
    );
    if (updated == true) {
      await _load();
    }
  }

  Future<void> _openCreate() async {
    await showCreateWorkspaceSheet(
      context: context,
      ref: ref,
      onCreated: () async {
        ref.invalidate(projectsProvider);
        await _load();
      },
    );
  }

  bool _canManage(Organization org) {
    final role = org.myRole?.toLowerCase();
    return role == 'owner' || role == 'admin';
  }

  @override
  Widget build(BuildContext context) {
    final session = ref.watch(sessionControllerProvider);
    final organizations = session.organizations;
    final selectedOrgId = session.orgId;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final surface = isDark ? const Color(0xFF1E293B) : AppColors.surface;

    return Material(
      color: surface,
      borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(AppSpacing.md, AppSpacing.sm, AppSpacing.md, AppSpacing.md),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: AppSpacing.md),
                  decoration: BoxDecoration(
                    color: AppColors.border,
                    borderRadius: BorderRadius.circular(999),
                  ),
                ),
              ),
              Row(
                children: [
                  Expanded(
                    child: Text('Workspaces', style: Theme.of(context).textTheme.titleLarge),
                  ),
                  TextButton.icon(
                    onPressed: _openCreate,
                    icon: const Icon(Icons.add_rounded, size: 18),
                    label: const Text('New'),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.sm),
              if (_loading)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: AppSpacing.xl),
                  child: Center(child: CircularProgressIndicator()),
                )
              else if (_error != null)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: AppSpacing.md),
                  child: Column(
                    children: [
                      Text(_error!, style: Theme.of(context).textTheme.bodyMedium),
                      const SizedBox(height: AppSpacing.sm),
                      SecondaryButton(label: 'Retry', onPressed: _load),
                    ],
                  ),
                )
              else if (organizations.isEmpty)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: AppSpacing.md),
                  child: EmptyState(
                    title: 'No workspaces yet',
                    message: 'Create your first workspace to get started.',
                    icon: Icons.business_outlined,
                  ),
                )
              else
                Flexible(
                  child: ListView.separated(
                    shrinkWrap: true,
                    itemCount: organizations.length,
                    separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.sm),
                    itemBuilder: (context, index) {
                      final org = organizations[index];
                      final selected = org.id == selectedOrgId;

                      return SurfaceCard(
                        onTap: () => _select(org),
                        child: Row(
                          children: [
                            WorkspaceAvatar(
                              logoUrl: org.logoUrl,
                              name: org.name,
                              size: 44,
                            ),
                            const SizedBox(width: AppSpacing.sm),
                            Expanded(
                              child: Text(org.name, style: Theme.of(context).textTheme.titleMedium),
                            ),
                            if (org.myRole != null)
                              StatusChip(label: org.myRole!, color: AppColors.sky),
                            if (_canManage(org))
                              IconButton(
                                tooltip: 'Workspace settings',
                                onPressed: () => _openSettings(org),
                                icon: const Icon(Icons.settings_outlined, size: 20),
                              ),
                            if (selected)
                              const Padding(
                                padding: EdgeInsets.only(left: AppSpacing.xs),
                                child: Icon(Icons.check_circle_rounded, color: AppColors.primary),
                              ),
                          ],
                        ),
                      );
                    },
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

Future<void> showWorkspaceSwitcherSheet({
  required BuildContext context,
  required WidgetRef ref,
}) async {
  await showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    backgroundColor: Colors.transparent,
    builder: (_) {
      final height = MediaQuery.of(context).size.height * 0.72;
      return SizedBox(height: height, child: const WorkspaceSwitcherSheet());
    },
  );
}

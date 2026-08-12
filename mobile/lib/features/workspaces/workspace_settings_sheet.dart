import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_exception.dart';
import '../../core/messaging/app_messenger.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../data/models/organization.dart';
import '../../shared/widgets/app_widgets.dart';
import '../auth/session_controller.dart';
import '../projects/projects_providers.dart';
import 'invite_member_sheet.dart';
import 'workspace_icon_picker.dart';

class WorkspaceSettingsSheet extends ConsumerStatefulWidget {
  const WorkspaceSettingsSheet({
    super.key,
    this.organizationId,
  });

  final String? organizationId;

  @override
  ConsumerState<WorkspaceSettingsSheet> createState() => _WorkspaceSettingsSheetState();
}

class _WorkspaceSettingsSheetState extends ConsumerState<WorkspaceSettingsSheet> {
  final _nameController = TextEditingController();

  Organization? _org;
  String? _logoPreview;
  bool _loading = true;
  bool _saving = false;
  String? _error;

  bool get _isOwner => _org?.myRole?.toLowerCase() == 'owner';
  bool get _canEdit => _isOwner || _org?.myRole?.toLowerCase() == 'admin';

  @override
  void initState() {
    super.initState();
    Future.microtask(_load);
  }

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    final orgId = widget.organizationId ?? ref.read(sessionControllerProvider).orgId;
    if (orgId == null || orgId.isEmpty) {
      if (mounted) {
        setState(() {
          _loading = false;
          _error = 'No workspace selected';
        });
      }
      return;
    }

    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final org = await ref.read(organizationsRepositoryProvider).fetchOrganization(orgId);
      if (!mounted) return;
      _nameController.text = org.name;
      setState(() {
        _org = org;
        _logoPreview = org.logoUrl;
        _loading = false;
      });
    } on ApiException catch (error) {
      if (mounted) setState(() => _error = error.message);
    } catch (_) {
      if (mounted) setState(() => _error = 'Could not load workspace settings');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  bool get _hasChanges {
    final org = _org;
    if (org == null) return false;
    final name = _nameController.text.trim();
    final logoChanged = _isOwner && (_logoPreview ?? '') != (org.logoUrl ?? '');
    return name != org.name || logoChanged;
  }

  Future<void> _save() async {
    final org = _org;
    if (org == null || !_canEdit) return;

    final name = _nameController.text.trim();

    if (name.isEmpty) {
      setState(() => _error = 'Workspace name is required');
      return;
    }

    setState(() {
      _saving = true;
      _error = null;
    });

    try {
      final logoBefore = org.logoUrl ?? '';
      final logoAfter = _logoPreview ?? '';
      await ref.read(sessionControllerProvider.notifier).updateWorkspace(
            orgId: org.id,
            name: name != org.name ? name : null,
            logoUrl: _isOwner && logoBefore != logoAfter ? logoAfter : null,
            clearLogo: _isOwner && logoBefore.isNotEmpty && logoAfter.isEmpty,
          );
      ref.invalidate(projectsProvider);
      if (mounted) Navigator.of(context).pop(true);
    } on ApiException catch (error) {
      setState(() => _error = error.message);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final surface = isDark ? const Color(0xFF1E293B) : AppColors.surface;

    return Material(
      color: surface,
      borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
      child: Padding(
        padding: EdgeInsets.only(
          left: AppSpacing.md,
          right: AppSpacing.md,
          top: AppSpacing.sm,
          bottom: MediaQuery.viewInsetsOf(context).bottom + AppSpacing.md,
        ),
        child: _loading
            ? const SizedBox(
                height: 280,
                child: Center(child: CircularProgressIndicator()),
              )
            : _error != null && _org == null
                ? SizedBox(
                    height: 240,
                    child: Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(_error!, textAlign: TextAlign.center),
                          const SizedBox(height: AppSpacing.md),
                          SecondaryButton(label: 'Retry', onPressed: _load),
                        ],
                      ),
                    ),
                  )
                : SingleChildScrollView(
                    child: Column(
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
                        Text('Workspace settings', style: Theme.of(context).textTheme.titleLarge),
                        const SizedBox(height: AppSpacing.xs),
                        Text(
                          'Update name and icon, or invite teammates.',
                          style: Theme.of(context).textTheme.bodyMedium,
                        ),
                        const SizedBox(height: AppSpacing.lg),
                        WorkspaceIconPicker(
                          name: _nameController.text,
                          logoPreview: _logoPreview,
                          canEdit: _isOwner,
                          uploading: _saving,
                          onLogoChanged: (value) => setState(() => _logoPreview = value),
                        ),
                        const SizedBox(height: AppSpacing.lg),
                        Text(
                          'NAME',
                          style: Theme.of(context).textTheme.labelSmall?.copyWith(
                                color: AppColors.textMuted,
                                letterSpacing: 0.8,
                                fontWeight: FontWeight.w600,
                              ),
                        ),
                        const SizedBox(height: AppSpacing.xs),
                        TextField(
                          controller: _nameController,
                          enabled: _canEdit,
                          textCapitalization: TextCapitalization.words,
                          decoration: const InputDecoration(hintText: 'Workspace name'),
                          onChanged: (_) => setState(() {}),
                        ),
                        if (_error != null && _org != null) ...[
                          const SizedBox(height: AppSpacing.sm),
                          Text(
                            _error!,
                            style: TextStyle(color: Theme.of(context).colorScheme.error),
                          ),
                        ],
                        if (_canEdit) ...[
                          const SizedBox(height: AppSpacing.lg),
                          PrimaryButton(
                            label: 'Save changes',
                            loading: _saving,
                            onPressed: !_hasChanges || _saving ? null : _save,
                          ),
                          const SizedBox(height: AppSpacing.sm),
                          SecondaryButton(
                            label: 'Invite member',
                            onPressed: () {
                              final org = _org;
                              if (org == null) return;
                              showInviteMemberSheet(
                                context: context,
                                organizationId: org.id,
                                organizationName: org.name,
                              );
                            },
                          ),
                        ],
                        const SizedBox(height: AppSpacing.sm),
                        SecondaryButton(
                          label: 'Plans & Pricing',
                          onPressed: () {
                            Navigator.of(context).pop();
                            openPlansBillingScreen();
                          },
                        ),
                      ],
                    ),
                  ),
      ),
    );
  }
}

Future<bool?> showWorkspaceSettingsSheet({
  required BuildContext context,
  required WidgetRef ref,
  String? organizationId,
}) async {
  return showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    backgroundColor: Colors.transparent,
    builder: (_) {
      final height = MediaQuery.of(context).size.height * 0.92;
      return SizedBox(
        height: height,
        child: WorkspaceSettingsSheet(organizationId: organizationId),
      );
    },
  );
}

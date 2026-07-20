import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_exception.dart';
import '../../core/constants/workspace_avatar_presets.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../data/models/organization.dart';
import '../../shared/widgets/app_widgets.dart';
import '../auth/session_controller.dart';
import 'workspace_icon_picker.dart';

class CreateWorkspaceSheet extends ConsumerStatefulWidget {
  const CreateWorkspaceSheet({
    super.key,
    required this.onCreated,
  });

  final ValueChanged<Organization> onCreated;

  @override
  ConsumerState<CreateWorkspaceSheet> createState() => _CreateWorkspaceSheetState();
}

class _CreateWorkspaceSheetState extends ConsumerState<CreateWorkspaceSheet> {
  final _nameController = TextEditingController();

  String? _logoPreview = kDefaultWorkspaceAvatar.dataUrl;
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final name = _nameController.text.trim();

    if (name.isEmpty) {
      setState(() => _error = 'Workspace name is required');
      return;
    }

    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final org = await ref.read(sessionControllerProvider.notifier).createWorkspace(
            name: name,
            logoUrl: resolveWorkspaceLogoUrl(_logoPreview),
          );
      widget.onCreated(org);
      if (mounted) Navigator.of(context).pop();
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _loading = false);
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
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
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
              Text('New workspace', style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: AppSpacing.xs),
              Text(
                'Create a workspace to organize projects and invite your team.',
                style: Theme.of(context).textTheme.bodyMedium,
              ),
              const SizedBox(height: AppSpacing.lg),
              WorkspaceIconPicker(
                name: _nameController.text,
                logoPreview: _logoPreview,
                canEdit: true,
                uploading: _loading,
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
                textCapitalization: TextCapitalization.words,
                decoration: const InputDecoration(
                  hintText: 'Workspace name',
                ),
                onChanged: (_) => setState(() {}),
              ),
              if (_error != null) ...[
                const SizedBox(height: AppSpacing.sm),
                Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
              ],
              const SizedBox(height: AppSpacing.lg),
              PrimaryButton(
                label: 'Create workspace',
                loading: _loading,
                onPressed: _loading ? null : _submit,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

Future<void> showCreateWorkspaceSheet({
  required BuildContext context,
  required WidgetRef ref,
  VoidCallback? onCreated,
}) async {
  await showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    backgroundColor: Colors.transparent,
    builder: (_) {
      final height = MediaQuery.of(context).size.height * 0.92;
      return SizedBox(
        height: height,
        child: CreateWorkspaceSheet(
          onCreated: (_) => onCreated?.call(),
        ),
      );
    },
  );
}

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_exception.dart';
import '../../core/preferences/app_preferences.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/utils/html_plain_text.dart';
import '../../core/utils/workspace_logo.dart';
import '../../data/models/project.dart';
import '../../shared/widgets/app_widgets.dart';
import '../../shared/widgets/project_icon.dart';
import '../kanban/kanban_providers.dart';
import 'projects_providers.dart';

class CreateProjectSheet extends ConsumerStatefulWidget {
  const CreateProjectSheet({
    super.key,
    required this.organizationId,
    this.existing,
    this.onCreated,
    this.onUpdated,
  });

  final String organizationId;
  final Project? existing;
  final ValueChanged<String>? onCreated;
  final ValueChanged<Project>? onUpdated;

  bool get isEditing => existing != null;

  @override
  ConsumerState<CreateProjectSheet> createState() => _CreateProjectSheetState();
}

class _CreateProjectSheetState extends ConsumerState<CreateProjectSheet> {
  late final TextEditingController _nameController;
  late final TextEditingController _descriptionController;

  late String _visibility;
  String? _iconPreview;
  bool _loading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    final existing = widget.existing;
    _nameController = TextEditingController(text: existing?.name ?? '');
    _descriptionController = TextEditingController(
      text: stripHtmlToPlainText(existing?.description),
    );
    _iconPreview = existing?.iconUrl;
    final rawVisibility = (existing?.visibility ?? 'PRIVATE').toUpperCase();
    _visibility = rawVisibility == 'PUBLIC' ||
            rawVisibility == 'TEAM' ||
            rawVisibility == 'ORGANIZATION' ||
            rawVisibility == 'WORKSPACE'
        ? 'PUBLIC'
        : 'PRIVATE';
  }

  @override
  void dispose() {
    _nameController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final name = _nameController.text.trim();
    if (name.isEmpty) {
      setState(() => _error = 'Project name is required');
      return;
    }

    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final repository = ref.read(projectsRepositoryProvider);
      final iconBefore = (widget.existing?.iconUrl ?? '').trim();
      final iconAfter = (_iconPreview ?? '').trim();
      final iconChanged = iconBefore != iconAfter;
      if (widget.isEditing) {
        final project = await repository.updateProject(
          projectId: widget.existing!.id,
          organizationId: widget.organizationId,
          name: name,
          description: _descriptionController.text,
          visibility: _visibility,
          iconUrl: iconChanged && iconAfter.isNotEmpty ? iconAfter : null,
          clearIcon: iconChanged && iconAfter.isEmpty && iconBefore.isNotEmpty,
        );
        widget.onUpdated?.call(project);
      } else {
        final project = await repository.createProject(
          organizationId: widget.organizationId,
          name: name,
          description: _descriptionController.text,
          visibility: _visibility,
          iconUrl: iconAfter.isEmpty ? null : iconAfter,
        );
        widget.onCreated?.call(project.id);
      }
      if (mounted) Navigator.of(context).pop();
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _pickIcon() async {
    try {
      final dataUrl = await pickWorkspaceLogoDataUrl();
      if (!mounted) return;
      setState(() => _iconPreview = dataUrl);
    } on WorkspaceLogoException catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error.message)),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final surface = isDark ? const Color(0xFF1E293B) : AppColors.surface;
    final editing = widget.isEditing;

    return Material(
      color: surface,
      borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
      child: Padding(
        padding: EdgeInsets.only(
          left: AppSpacing.md,
          right: AppSpacing.md,
          top: AppSpacing.sm,
          bottom: MediaQuery.of(context).viewInsets.bottom + AppSpacing.md,
        ),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: AppSpacing.sm),
                  decoration: BoxDecoration(
                    color: AppColors.border,
                    borderRadius: BorderRadius.circular(999),
                  ),
                ),
              ),
              Row(
                children: [
                  Expanded(
                    child: Text(
                      editing ? 'Edit project' : 'Create project',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.w700,
                          ),
                    ),
                  ),
                  IconButton(
                    onPressed: _loading ? null : () => Navigator.of(context).pop(),
                    icon: const Icon(Icons.close_rounded),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.sm),
              Text(
                'PROJECT ICON',
                style: Theme.of(context).textTheme.labelSmall?.copyWith(
                      color: AppColors.textMuted,
                      letterSpacing: 0.8,
                      fontWeight: FontWeight.w600,
                    ),
              ),
              const SizedBox(height: AppSpacing.sm),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  ProjectIcon(
                    name: _nameController.text.trim().isEmpty
                        ? 'Project'
                        : _nameController.text.trim(),
                    iconUrl: _iconPreview,
                    size: 64,
                    borderRadius: 14,
                  ),
                  const SizedBox(width: AppSpacing.md),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        TextButton.icon(
                          onPressed: _loading ? null : _pickIcon,
                          icon: const Icon(Icons.image_outlined, size: 18),
                          label: Text(
                            _iconPreview == null || _iconPreview!.isEmpty
                                ? 'Upload image'
                                : 'Change image',
                          ),
                        ),
                        Text(
                          'PNG, JPG up to 100KB. Optional.',
                          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                color: AppColors.textMuted,
                              ),
                        ),
                        if (_iconPreview != null && _iconPreview!.isNotEmpty)
                          TextButton(
                            onPressed: _loading
                                ? null
                                : () => setState(() => _iconPreview = null),
                            child: const Text('Remove image'),
                          ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.md),
              Text(
                'Name',
                style: Theme.of(context).textTheme.labelLarge?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
              ),
              const SizedBox(height: AppSpacing.xs),
              TextField(
                controller: _nameController,
                autofocus: !editing,
                textCapitalization: TextCapitalization.sentences,
                decoration: const InputDecoration(hintText: 'Project name'),
                onChanged: (_) => setState(() {}),
              ),
              const SizedBox(height: AppSpacing.md),
              Text(
                'Description',
                style: Theme.of(context).textTheme.labelLarge?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
              ),
              const SizedBox(height: AppSpacing.xs),
              TextField(
                controller: _descriptionController,
                minLines: 3,
                maxLines: 5,
                textCapitalization: TextCapitalization.sentences,
                decoration: const InputDecoration(
                  hintText: 'Track features, bugs, and sprints',
                  alignLabelWithHint: true,
                ),
              ),
              const SizedBox(height: AppSpacing.md),
              Text(
                'Visibility',
                style: Theme.of(context).textTheme.labelLarge?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
              ),
              const SizedBox(height: AppSpacing.xs),
              Row(
                children: [
                  Expanded(
                    child: _VisibilityOption(
                      label: 'Private',
                      hint: 'Only invited members',
                      icon: Icons.lock_rounded,
                      selected: _visibility == 'PRIVATE',
                      onTap: _loading
                          ? null
                          : () => setState(() => _visibility = 'PRIVATE'),
                    ),
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(
                    child: _VisibilityOption(
                      label: 'Workspace',
                      hint: 'Visible to workspace',
                      icon: Icons.public_rounded,
                      selected: _visibility == 'PUBLIC',
                      onTap: _loading
                          ? null
                          : () => setState(() => _visibility = 'PUBLIC'),
                    ),
                  ),
                ],
              ),
              if (_error != null) ...[
                const SizedBox(height: AppSpacing.sm),
                Text(
                  _error!,
                  style: TextStyle(color: Theme.of(context).colorScheme.error),
                ),
              ],
              const SizedBox(height: AppSpacing.lg),
              PrimaryButton(
                label: editing ? 'Save changes' : 'Create project',
                loading: _loading,
                onPressed: _submit,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _VisibilityOption extends StatelessWidget {
  const _VisibilityOption({
    required this.label,
    required this.hint,
    required this.icon,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final String hint;
  final IconData icon;
  final bool selected;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: selected
          ? AppColors.violet.withValues(alpha: 0.1)
          : Theme.of(context).cardTheme.color,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(
          color: selected
              ? AppColors.violet.withValues(alpha: 0.45)
              : AppColors.border.withValues(alpha: 0.8),
        ),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.sm),
          child: Row(
            children: [
              Icon(
                icon,
                size: 18,
                color: selected ? AppColors.violet : AppColors.textMuted,
              ),
              const SizedBox(width: AppSpacing.xs),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      label,
                      style: Theme.of(context).textTheme.labelLarge?.copyWith(
                            fontWeight: FontWeight.w600,
                            color: selected ? AppColors.violet : null,
                          ),
                    ),
                    Text(
                      hint,
                      style: Theme.of(context).textTheme.labelSmall?.copyWith(
                            color: AppColors.textMuted,
                          ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

Future<void> showCreateProjectSheet({
  required BuildContext context,
  required WidgetRef ref,
  required String organizationId,
}) async {
  await showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    backgroundColor: Colors.transparent,
    builder: (_) {
      final height = MediaQuery.of(context).size.height * 0.88;
      return SizedBox(
        height: height,
        child: CreateProjectSheet(
          organizationId: organizationId,
          onCreated: (projectId) {
            ref.invalidate(projectsProvider);
            ref.read(lastProjectIdProvider.notifier).setProjectId(projectId);
          },
        ),
      );
    },
  );
}

Future<void> showEditProjectSheet({
  required BuildContext context,
  required WidgetRef ref,
  required String organizationId,
  required Project project,
}) async {
  await showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    backgroundColor: Colors.transparent,
    builder: (_) {
      final height = MediaQuery.of(context).size.height * 0.88;
      return SizedBox(
        height: height,
        child: CreateProjectSheet(
          organizationId: organizationId,
          existing: project,
          onUpdated: (_) {
            ref.invalidate(projectsProvider);
            ref.invalidate(projectBoardProvider(project.id));
          },
        ),
      );
    },
  );
}

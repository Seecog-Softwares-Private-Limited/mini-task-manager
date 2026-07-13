import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_exception.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/utils/html_plain_text.dart';
import '../../data/models/project.dart';
import '../../shared/widgets/app_widgets.dart';
import 'projects_providers.dart';

/// Edit an existing project's name, description, and visibility.
class ProjectSettingsSheet extends ConsumerStatefulWidget {
  const ProjectSettingsSheet({
    super.key,
    required this.organizationId,
    required this.project,
    required this.onSaved,
  });

  final String organizationId;
  final Project project;
  final ValueChanged<Project> onSaved;

  @override
  ConsumerState<ProjectSettingsSheet> createState() =>
      _ProjectSettingsSheetState();
}

class _ProjectSettingsSheetState extends ConsumerState<ProjectSettingsSheet> {
  late final TextEditingController _nameController;
  late final TextEditingController _descriptionController;
  late String _visibility;
  bool _loading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(text: widget.project.name);
    _descriptionController = TextEditingController(
      text: stripHtmlToPlainText(widget.project.description),
    );
    _visibility =
        widget.project.visibility.toUpperCase() == 'PRIVATE' ? 'PRIVATE' : 'PUBLIC';
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
      final updated = await ref.read(projectsRepositoryProvider).updateProject(
            organizationId: widget.organizationId,
            projectId: widget.project.id,
            name: name,
            description: _descriptionController.text,
            visibility: _visibility,
          );
      widget.onSaved(updated);
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
                      'Project settings',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.w700,
                          ),
                    ),
                  ),
                  IconButton(
                    onPressed:
                        _loading ? null : () => Navigator.of(context).pop(),
                    icon: const Icon(Icons.close_rounded),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.sm),
              Text(
                'Name',
                style: Theme.of(context).textTheme.labelLarge?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
              ),
              const SizedBox(height: AppSpacing.xs),
              TextField(
                controller: _nameController,
                textCapitalization: TextCapitalization.sentences,
                decoration: const InputDecoration(hintText: 'Project name'),
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
                label: 'Save changes',
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

Future<void> showProjectSettingsSheet({
  required BuildContext context,
  required WidgetRef ref,
  required String organizationId,
  required Project project,
  ValueChanged<Project>? onSaved,
}) async {
  await showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    backgroundColor: Colors.transparent,
    builder: (_) {
      final height = MediaQuery.of(context).size.height * 0.78;
      return SizedBox(
        height: height,
        child: ProjectSettingsSheet(
          organizationId: organizationId,
          project: project,
          onSaved: (updated) {
            ref.invalidate(projectsProvider);
            ref.invalidate(archivedProjectsProvider);
            onSaved?.call(updated);
          },
        ),
      );
    },
  );
}

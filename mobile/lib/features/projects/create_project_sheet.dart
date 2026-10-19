import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_exception.dart';
import '../../core/preferences/app_preferences.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/utils/html_plain_text.dart';
import '../../core/utils/project_logo.dart';
import '../../data/models/project.dart';
import '../../shared/widgets/app_widgets.dart';
import '../kanban/kanban_providers.dart';
import '../kanban/project_switcher.dart';
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
  bool _iconCleared = false;
  bool _pickingLogo = false;
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

  Future<void> _pickLogo() async {
    if (_loading || _pickingLogo) return;
    setState(() {
      _pickingLogo = true;
      _error = null;
    });
    try {
      final dataUrl = await pickProjectLogoDataUrl();
      if (!mounted) return;
      setState(() {
        _iconPreview = dataUrl;
        _iconCleared = false;
      });
    } on ProjectLogoException catch (e) {
      if (!mounted) return;
      setState(() => _error = e.message);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.message)),
      );
    } finally {
      if (mounted) setState(() => _pickingLogo = false);
    }
  }

  void _clearLogo() {
    setState(() {
      _iconPreview = null;
      _iconCleared = true;
      _error = null;
    });
  }

  void _inspectLogoPreview(BuildContext context, String logo) {
    final provider = projectLogoImageProvider(logo);
    if (provider == null) return;
    showDialog<void>(
      context: context,
      builder: (ctx) {
        return Dialog(
          insetPadding: const EdgeInsets.all(AppSpacing.lg),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 420, maxHeight: 480),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(
                    AppSpacing.md,
                    AppSpacing.sm,
                    AppSpacing.xs,
                    0,
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: Text(
                          'Logo preview',
                          style: Theme.of(ctx).textTheme.titleMedium?.copyWith(
                                fontWeight: FontWeight.w700,
                              ),
                        ),
                      ),
                      IconButton(
                        tooltip: 'Close',
                        onPressed: () => Navigator.of(ctx).pop(),
                        icon: const Icon(Icons.close_rounded),
                      ),
                    ],
                  ),
                ),
                Flexible(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(
                      AppSpacing.md,
                      AppSpacing.sm,
                      AppSpacing.md,
                      AppSpacing.md,
                    ),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: InteractiveViewer(
                        minScale: 1,
                        maxScale: 4,
                        child: Image(
                          image: provider,
                          fit: BoxFit.contain,
                          errorBuilder: (_, __, ___) => const Padding(
                            padding: EdgeInsets.all(AppSpacing.lg),
                            child: Text('Could not load logo preview'),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
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
      // Explicit clear flag (create/edit sheet) + trimmed compare so whitespace-
      // only diffs don't spuriously clear or re-upload icons.
      final iconBefore = (widget.existing?.iconUrl ?? '').trim();
      final iconAfter = (_iconPreview ?? '').trim();
      final iconChanged =
          _iconCleared || (iconBefore != iconAfter);
      if (widget.isEditing) {
        final project = await repository.updateProject(
          projectId: widget.existing!.id,
          organizationId: widget.organizationId,
          name: name,
          description: _descriptionController.text,
          visibility: _visibility,
          clearIcon: _iconCleared,
          iconUrl: (!_iconCleared && iconChanged && iconAfter.isNotEmpty)
              ? iconAfter
              : null,
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
                'Logo',
                style: Theme.of(context).textTheme.labelLarge?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
              ),
              const SizedBox(height: AppSpacing.xs),
              Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  _ProjectLogoPreview(
                    iconPreview: _iconPreview,
                    projectName: _nameController.text,
                    existing: widget.existing,
                    loading: _pickingLogo || _loading,
                    onInspect: (_iconPreview != null &&
                            _iconPreview!.trim().isNotEmpty)
                        ? () => _inspectLogoPreview(context, _iconPreview!)
                        : null,
                  ),
                  const SizedBox(width: AppSpacing.md),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        TextButton.icon(
                          onPressed:
                              _loading || _pickingLogo ? null : _pickLogo,
                          icon: _pickingLogo
                              ? const SizedBox(
                                  width: 16,
                                  height: 16,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                  ),
                                )
                              : const Icon(Icons.image_outlined, size: 18),
                          label: Text(
                            (_iconPreview == null || _iconPreview!.isEmpty)
                                ? 'Upload logo'
                                : 'Change logo',
                          ),
                        ),
                        Text(
                          'PNG or JPG, max 10 MB.',
                          style:
                              Theme.of(context).textTheme.bodySmall?.copyWith(
                                    color: AppColors.textMuted,
                                  ),
                        ),
                        if (_iconPreview != null &&
                            _iconPreview!.trim().isNotEmpty)
                          TextButton(
                            onPressed:
                                _loading || _pickingLogo ? null : _clearLogo,
                            style: TextButton.styleFrom(
                              foregroundColor: AppColors.danger,
                            ),
                            child: const Text('Remove logo'),
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

class _ProjectLogoPreview extends StatelessWidget {
  const _ProjectLogoPreview({
    required this.iconPreview,
    required this.projectName,
    required this.existing,
    required this.loading,
    this.onInspect,
  });

  final String? iconPreview;
  final String projectName;
  final Project? existing;
  final bool loading;
  final VoidCallback? onInspect;

  @override
  Widget build(BuildContext context) {
    final hasLogo =
        iconPreview != null && iconPreview!.trim().isNotEmpty;
    final provider = projectLogoImageProvider(iconPreview);
    // Prefer existing ProjectThumb when preview is the stored URL (handles
    // network/data logos the same way as the rest of the app).
    final useExistingThumb = hasLogo &&
        existing != null &&
        iconPreview == existing!.iconUrl &&
        !(iconPreview!.startsWith('data:'));

    final Widget thumb;
    if (useExistingThumb) {
      thumb = ProjectThumb(project: existing!, size: 64, radius: 14);
    } else if (provider != null) {
      thumb = ClipRRect(
        borderRadius: BorderRadius.circular(14),
        child: Image(
          image: provider,
          width: 64,
          height: 64,
          fit: BoxFit.cover,
          errorBuilder: (_, __, ___) => existing != null && hasLogo
              ? ProjectThumb(project: existing!, size: 64, radius: 14)
              : _LetterThumb(name: projectName),
        ),
      );
    } else {
      thumb = _LetterThumb(name: projectName);
    }

    return SizedBox(
      width: 64,
      height: 64,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          thumb,
          if (loading)
            const Positioned.fill(
              child: ColoredBox(
                color: Color(0x66000000),
                child: Center(
                  child: SizedBox(
                    width: 22,
                    height: 22,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.white,
                    ),
                  ),
                ),
              ),
            ),
          if (hasLogo && onInspect != null && !loading)
            Positioned(
              right: -4,
              bottom: -4,
              child: Material(
                color: Theme.of(context).colorScheme.surface,
                shape: const CircleBorder(),
                elevation: 1,
                child: InkWell(
                  customBorder: const CircleBorder(),
                  onTap: onInspect,
                  child: const Padding(
                    padding: EdgeInsets.all(4),
                    child: Icon(
                      Icons.visibility_rounded,
                      size: 16,
                      color: AppColors.textMuted,
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _LetterThumb extends StatelessWidget {
  const _LetterThumb({required this.name});

  final String name;

  @override
  Widget build(BuildContext context) {
    final initial = name.trim().isEmpty
        ? '?'
        : name.trim().characters.first.toUpperCase();
    return Container(
      width: 64,
      height: 64,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: AppColors.primary.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border.withValues(alpha: 0.7)),
      ),
      child: Text(
        initial,
        style: Theme.of(context).textTheme.titleLarge?.copyWith(
              color: AppColors.primary,
              fontWeight: FontWeight.w700,
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
            ref.invalidate(projectsForOrganizationProvider(organizationId));
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
            ref.invalidate(projectsForOrganizationProvider(organizationId));
            ref.invalidate(projectBoardProvider(project.id));
          },
        ),
      );
    },
  );
}

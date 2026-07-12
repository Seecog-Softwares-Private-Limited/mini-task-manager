import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_exception.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../data/models/project.dart';
import '../auth/session_controller.dart';
import '../home/home_providers.dart';
import '../kanban/kanban_providers.dart';
import 'projects_providers.dart';

/// True when the current user's org role can manage projects (owner/admin).
/// Matches the backend RolesGuard on delete.
bool canManageProjects(WidgetRef ref) {
  final role = ref.read(selectedOrgProvider)?.myRole?.toLowerCase();
  return role == 'owner' || role == 'admin';
}

void _invalidateProjectData(WidgetRef ref) {
  ref.invalidate(projectsProvider);
  ref.invalidate(archivedProjectsProvider);
  ref.invalidate(homeDashboardProvider);
}

/// Archive or unarchive a project, with an Undo snackbar.
Future<void> setProjectArchived({
  required BuildContext context,
  required WidgetRef ref,
  required String organizationId,
  required Project project,
  required bool archived,
}) async {
  final messenger = ScaffoldMessenger.of(context);
  try {
    await ref.read(projectsRepositoryProvider).updateProject(
          organizationId: organizationId,
          projectId: project.id,
          isArchived: archived,
        );
    _invalidateProjectData(ref);
    messenger
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Text(archived
              ? '"${project.name}" archived'
              : '"${project.name}" restored'),
          action: SnackBarAction(
            label: 'Undo',
            onPressed: () async {
              try {
                await ref.read(projectsRepositoryProvider).updateProject(
                      organizationId: organizationId,
                      projectId: project.id,
                      isArchived: !archived,
                    );
                _invalidateProjectData(ref);
              } catch (_) {
                // Undo is best-effort; the list will reflect server state.
              }
            },
          ),
        ),
      );
  } on ApiException catch (e) {
    messenger.showSnackBar(SnackBar(content: Text(e.message)));
  }
}

/// Shows the guarded delete dialog. Returns true if the project was deleted.
Future<bool> confirmDeleteProject({
  required BuildContext context,
  required WidgetRef ref,
  required String organizationId,
  required Project project,
}) async {
  final deleted = await showDialog<bool>(
    context: context,
    builder: (_) => _DeleteProjectDialog(
      organizationId: organizationId,
      project: project,
      ref: ref,
    ),
  );
  if (deleted == true) {
    _invalidateProjectData(ref);
  }
  return deleted == true;
}

class _DeleteProjectDialog extends StatefulWidget {
  const _DeleteProjectDialog({
    required this.organizationId,
    required this.project,
    required this.ref,
  });

  final String organizationId;
  final Project project;
  final WidgetRef ref;

  @override
  State<_DeleteProjectDialog> createState() => _DeleteProjectDialogState();
}

class _DeleteProjectDialogState extends State<_DeleteProjectDialog> {
  final _controller = TextEditingController();
  int? _taskCount;
  bool _loadingCount = true;
  bool _deleting = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _controller.addListener(() => setState(() {}));
    _loadCount();
  }

  Future<void> _loadCount() async {
    try {
      final result = await widget.ref.read(tasksRepositoryProvider).fetchByProject(
            projectId: widget.project.id,
            organizationId: widget.organizationId,
            limit: 1,
          );
      if (mounted) {
        setState(() {
          _taskCount = result.meta.total;
          _loadingCount = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loadingCount = false);
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  bool get _confirmed =>
      _controller.text.trim() == widget.project.name.trim();

  Future<void> _delete() async {
    setState(() {
      _deleting = true;
      _error = null;
    });
    try {
      await widget.ref.read(projectsRepositoryProvider).deleteProject(
            organizationId: widget.organizationId,
            projectId: widget.project.id,
          );
      if (mounted) Navigator.of(context).pop(true);
    } on ApiException catch (e) {
      if (mounted) {
        setState(() {
          _error = e.message;
          _deleting = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final impact = _loadingCount
        ? 'Checking how many tasks will be removed...'
        : _taskCount == null
            ? 'This permanently deletes the project and all its tasks and attachments.'
            : 'This permanently deletes "${widget.project.name}" and its '
                '${_taskCount == 1 ? '1 task' : '$_taskCount tasks'} and attachments.';

    return AlertDialog(
      title: const Row(
        children: [
          Icon(Icons.warning_amber_rounded, color: AppColors.danger),
          SizedBox(width: AppSpacing.xs),
          Expanded(child: Text('Delete project')),
        ],
      ),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(impact),
          const SizedBox(height: AppSpacing.xs),
          Text(
            'This cannot be undone.',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: AppColors.danger,
                  fontWeight: FontWeight.w600,
                ),
          ),
          const SizedBox(height: AppSpacing.md),
          Text(
            'Type the project name to confirm:',
            style: Theme.of(context).textTheme.labelMedium,
          ),
          const SizedBox(height: AppSpacing.xs),
          TextField(
            controller: _controller,
            autofocus: true,
            enabled: !_deleting,
            decoration: InputDecoration(
              hintText: widget.project.name,
              border: const OutlineInputBorder(),
            ),
          ),
          if (_error != null) ...[
            const SizedBox(height: AppSpacing.sm),
            Text(
              _error!,
              style: TextStyle(color: Theme.of(context).colorScheme.error),
            ),
          ],
        ],
      ),
      actions: [
        TextButton(
          onPressed: _deleting ? null : () => Navigator.of(context).pop(false),
          child: const Text('Cancel'),
        ),
        FilledButton(
          onPressed: (_confirmed && !_deleting) ? _delete : null,
          style: FilledButton.styleFrom(backgroundColor: AppColors.danger),
          child: _deleting
              ? const SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(
                      strokeWidth: 2, color: Colors.white),
                )
              : const Text('Delete forever'),
        ),
      ],
    );
  }
}

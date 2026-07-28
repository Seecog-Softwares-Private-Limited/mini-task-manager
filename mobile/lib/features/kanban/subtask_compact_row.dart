import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../core/api/api_client.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../data/models/project_member.dart';
import '../../data/models/task.dart';
import '../../shared/widgets/user_avatar.dart';
import 'assignee_picker_sheet.dart';
import 'subtask_row_style.dart';

/// Compact subtask row: accent + checkbox (complete only) + title (opens edit) + assignees.
class SubtaskCompactRow extends StatelessWidget {
  const SubtaskCompactRow({
    super.key,
    required this.subtask,
    required this.members,
    required this.expanded,
    required this.enabled,
    required this.canComplete,
    required this.onToggleComplete,
    required this.onExpand,
    required this.onAssigneesChanged,
    this.canExpand = true,
    this.canChangeAssignees = true,
    this.showUnassignedChip = true,
  });

  final TaskSubtask subtask;
  final List<ProjectMember> members;
  final bool expanded;
  final bool enabled;
  final bool canComplete;
  final ValueChanged<bool> onToggleComplete;
  final VoidCallback onExpand;
  final ValueChanged<List<String>> onAssigneesChanged;

  /// When false, title is display-only (no expand-to-edit).
  final bool canExpand;

  /// When false, assignee avatars are not tappable.
  final bool canChangeAssignees;

  /// When false, hide the person+ chip if nobody is assigned.
  final bool showUnassignedChip;

  @override
  Widget build(BuildContext context) {
    final rowStyle = subtaskRowStyle(subtask, expanded: expanded);
    final title =
        subtask.title.trim().isEmpty ? 'New subtask' : subtask.title.trim();
    final isEmptyTitle = subtask.title.trim().isEmpty;
    final assigneeIds = _assigneeIdsOf(subtask);
    final assigneeMembers = assigneeIds
        .map(_findMember)
        .whereType<ProjectMember>()
        .toList();
    final showAssignees =
        assigneeMembers.isNotEmpty || (showUnassignedChip && canChangeAssignees);
    final doneAtLabel = _completedAtLabel(subtask);

    return Container(
      margin: const EdgeInsets.only(bottom: AppSpacing.sm),
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        color: rowStyle.backgroundColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: rowStyle.borderColor.withValues(alpha: 0.7)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: expanded ? 0.07 : 0.04),
            blurRadius: expanded ? 14 : 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: IntrinsicHeight(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Container(width: 4, color: rowStyle.accentColor),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(10, 8, 10, 8),
                child: Row(
                  children: [
                    SizedBox(
                      width: 22,
                      height: 22,
                      child: Checkbox(
                        value: subtask.completed,
                        onChanged: !enabled || !canComplete || isEmptyTitle
                            ? null
                            : (value) {
                                if (value == null) return;
                                onToggleComplete(value);
                              },
                        materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        visualDensity: VisualDensity.compact,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(5),
                        ),
                        side: BorderSide(
                          color: AppColors.border.withValues(alpha: 0.9),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Material(
                        color: Colors.transparent,
                        child: InkWell(
                          borderRadius: BorderRadius.circular(8),
                          onTap: !canExpand
                              ? null
                              : () {
                                  FocusManager.instance.primaryFocus?.unfocus();
                                  onExpand();
                                },
                          child: Padding(
                            padding: const EdgeInsets.symmetric(
                              vertical: 6,
                              horizontal: 2,
                            ),
                            child: Text(
                              title,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: Theme.of(context)
                                  .textTheme
                                  .bodyMedium
                                  ?.copyWith(
                                    fontWeight: FontWeight.w500,
                                    letterSpacing: -0.1,
                                    height: 1.25,
                                    color: isEmptyTitle
                                        ? AppColors.textMuted
                                        : subtask.completed
                                            ? AppColors.textMuted
                                            : AppColors.textPrimary,
                                    fontStyle: isEmptyTitle
                                        ? FontStyle.italic
                                        : FontStyle.normal,
                                    decoration: subtask.completed
                                        ? TextDecoration.lineThrough
                                        : TextDecoration.none,
                                    decorationColor:
                                        AppColors.textMuted.withValues(alpha: 0.5),
                                  ),
                            ),
                          ),
                        ),
                      ),
                    ),
                    if (doneAtLabel != null) ...[
                      const SizedBox(width: 6),
                      _DoneAtChip(label: doneAtLabel),
                    ],
                    if (showAssignees) ...[
                      const SizedBox(width: 6),
                      _AssigneeChip(
                        members: assigneeMembers,
                        enabled: enabled && canChangeAssignees,
                        onTap: () => _pickAssignees(context, assigneeIds),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  ProjectMember? _findMember(String userId) {
    final norm = normalizeAssigneeUserId(userId);
    for (final member in members) {
      if (normalizeAssigneeUserId(member.userId) == norm) return member;
    }
    return null;
  }

  Future<void> _pickAssignees(
    BuildContext context,
    List<String> selected,
  ) async {
    if (!enabled) return;
    await showAssigneePickerSheet(
      context: context,
      members: members,
      selectedAssigneeIds: selected,
      enabled: enabled,
      title: 'Assignees',
      showDoneButton: true,
      onSelectionChanged: onAssigneesChanged,
    );
  }
}

class _AssigneeChip extends StatelessWidget {
  const _AssigneeChip({
    required this.members,
    required this.enabled,
    required this.onTap,
  });

  final List<ProjectMember> members;
  final bool enabled;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: enabled ? onTap : null,
        customBorder: const CircleBorder(),
        child: members.isEmpty
            ? Container(
                width: 28,
                height: 28,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: AppColors.border,
                    style: BorderStyle.solid,
                  ),
                  color: AppColors.surface,
                ),
                child: const Icon(
                  Icons.person_add_alt_1_rounded,
                  size: 14,
                  color: AppColors.textMuted,
                ),
              )
            : members.length == 1
                ? _CircleAvatar(member: members.first, size: 28)
                : SizedBox(
                    width: 40,
                    height: 28,
                    child: Stack(
                      clipBehavior: Clip.none,
                      children: [
                        Positioned(
                          left: 0,
                          child: _CircleAvatar(member: members[0], size: 28),
                        ),
                        Positioned(
                          left: 12,
                          child: _CircleAvatar(member: members[1], size: 28),
                        ),
                      ],
                    ),
                  ),
      ),
    );
  }
}

class _CircleAvatar extends ConsumerWidget {
  const _CircleAvatar({required this.member, required this.size});

  final ProjectMember member;
  final double size;

  Widget _initialsAvatar(String initials) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: AppColors.primaryGradient,
        border: Border.all(color: Colors.white, width: 1.5),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.08),
            blurRadius: 4,
            offset: const Offset(0, 1),
          ),
        ],
      ),
      alignment: Alignment.center,
      child: Text(
        initials.isEmpty ? '?' : initials,
        style: TextStyle(
          color: Colors.white,
          fontWeight: FontWeight.w700,
          fontSize: size * 0.34,
          height: 1,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final name = member.user?.fullName.trim();
    final label = (name != null && name.isNotEmpty)
        ? name
        : (member.user?.email ?? 'User');
    final initials = label
        .split(RegExp(r'\s+'))
        .where((p) => p.isNotEmpty)
        .take(2)
        .map((p) => p[0].toUpperCase())
        .join();

    final config = ref.watch(appConfigProvider);
    final imageUrl = resolveUserAvatarUrl(
      config.apiBaseUrl,
      member.user?.avatarUrl,
    );
    final cacheSize = (size * MediaQuery.devicePixelRatioOf(context)).round();

    if (imageUrl.isEmpty) {
      return _initialsAvatar(initials);
    }

    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        border: Border.all(color: Colors.white, width: 1.5),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.08),
            blurRadius: 4,
            offset: const Offset(0, 1),
          ),
        ],
      ),
      child: ClipOval(
        child: Image.network(
          imageUrl,
          width: size,
          height: size,
          fit: BoxFit.cover,
          cacheWidth: cacheSize,
          cacheHeight: cacheSize,
          errorBuilder: (_, __, ___) => _initialsAvatar(initials),
        ),
      ),
    );
  }
}

List<String> _assigneeIdsOf(TaskSubtask subtask) {
  if (subtask.assigneeIds.isNotEmpty) return List.of(subtask.assigneeIds);
  if (subtask.assigneeId != null && subtask.assigneeId!.isNotEmpty) {
    return [subtask.assigneeId!];
  }
  return const [];
}

String? _completedAtLabel(TaskSubtask subtask) {
  if (!subtask.completed) return null;
  final raw = subtask.completionRecord?.completedAt.trim();
  if (raw == null || raw.isEmpty) return null;
  final parsed = DateTime.tryParse(raw);
  if (parsed == null) return null;
  return DateFormat('h:mm a').format(parsed.toLocal());
}

class _DoneAtChip extends StatelessWidget {
  const _DoneAtChip({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: AppColors.success.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(
            Icons.check_circle_rounded,
            size: 11,
            color: AppColors.success,
          ),
          const SizedBox(width: 4),
          Text(
            label,
            style: const TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w700,
              color: AppColors.success,
            ),
          ),
        ],
      ),
    );
  }
}

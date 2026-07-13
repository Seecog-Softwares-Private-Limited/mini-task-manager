import 'package:flutter/material.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../data/models/project_member.dart';
import '../../data/models/task.dart';
import 'assignee_picker_sheet.dart';
import 'subtask_row_style.dart';

/// Mobile compact subtask row: accent + checkbox + title + assignee circle + expand.
/// Status / due chips stay web-only; edit those in the expanded panel.
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
  });

  final TaskSubtask subtask;
  final List<ProjectMember> members;
  final bool expanded;
  final bool enabled;
  final bool canComplete;
  final ValueChanged<bool> onToggleComplete;
  final VoidCallback onExpand;
  final ValueChanged<List<String>> onAssigneesChanged;

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
                padding: const EdgeInsets.fromLTRB(10, 8, 4, 8),
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
                          onTap: () {
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
                    const SizedBox(width: 6),
                    _AssigneeChip(
                      members: assigneeMembers,
                      enabled: enabled,
                      onTap: () => _pickAssignees(context, assigneeIds),
                    ),
                    IconButton(
                      onPressed: onExpand,
                      visualDensity: VisualDensity.compact,
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(
                        minWidth: 28,
                        minHeight: 28,
                      ),
                      icon: Icon(
                        expanded
                            ? Icons.keyboard_arrow_up_rounded
                            : Icons.keyboard_arrow_down_rounded,
                        size: 20,
                        color: AppColors.textMuted,
                      ),
                    ),
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

class _CircleAvatar extends StatelessWidget {
  const _CircleAvatar({required this.member, required this.size});

  final ProjectMember member;
  final double size;

  @override
  Widget build(BuildContext context) {
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
}

List<String> _assigneeIdsOf(TaskSubtask subtask) {
  if (subtask.assigneeIds.isNotEmpty) return List.of(subtask.assigneeIds);
  if (subtask.assigneeId != null && subtask.assigneeId!.isNotEmpty) {
    return [subtask.assigneeId!];
  }
  return const [];
}

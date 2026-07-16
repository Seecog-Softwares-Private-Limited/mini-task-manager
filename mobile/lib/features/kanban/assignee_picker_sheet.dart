import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/utils/workspace_logo.dart';
import '../../data/models/login_response.dart';
import '../../data/models/project_member.dart';
import '../../shared/widgets/app_widgets.dart';

String normalizeAssigneeUserId(String id) =>
    id.trim().toLowerCase().replaceAll('-', '');

bool areAllAssigneesSelected(
  Iterable<String> selectedIds,
  List<ProjectMember> members,
) {
  if (members.isEmpty) return false;
  final selected = selectedIds.map(normalizeAssigneeUserId).toSet();
  return members.every((m) => selected.contains(normalizeAssigneeUserId(m.userId)));
}

List<String> toggleSelectAllAssignees(
  List<String> currentIds,
  List<ProjectMember> members,
) {
  if (members.isEmpty) return currentIds;
  if (areAllAssigneesSelected(currentIds, members)) {
    final memberNorm = members.map((m) => normalizeAssigneeUserId(m.userId)).toSet();
    return currentIds
        .where((id) => !memberNorm.contains(normalizeAssigneeUserId(id)))
        .toList();
  }
  final merged = <String, String>{};
  for (final id in currentIds) {
    merged[normalizeAssigneeUserId(id)] = id;
  }
  for (final member in members) {
    merged[normalizeAssigneeUserId(member.userId)] = member.userId;
  }
  return merged.values.toList();
}

Future<void> showAssigneePickerSheet({
  required BuildContext context,
  required List<ProjectMember> members,
  required List<String> selectedAssigneeIds,
  AuthUser? sessionUser,
  bool enabled = true,
  String title = 'Assign members',
  bool showDoneButton = true,
  ValueChanged<List<String>>? onSelectionChanged,
}) async {
  await showModalBottomSheet<void>(
    context: context,
    showDragHandle: true,
    isScrollControlled: true,
    builder: (sheetContext) {
      var selected = selectedAssigneeIds
          .map(normalizeAssigneeUserId)
          .toSet();
      final idByNorm = <String, String>{
        for (final id in selectedAssigneeIds)
          normalizeAssigneeUserId(id): id,
      };

      String resolveId(String userId) =>
          idByNorm[normalizeAssigneeUserId(userId)] ?? userId;

      List<String> selectedList() {
        return members
            .map((m) => m.userId)
            .where((id) => selected.contains(normalizeAssigneeUserId(id)))
            .map(resolveId)
            .toList();
      }

      void notify() {
        onSelectionChanged?.call(selectedList());
      }

      return SafeArea(
        child: StatefulBuilder(
          builder: (context, setSheetState) {
            final selectedCount = members
                .where((m) => selected.contains(normalizeAssigneeUserId(m.userId)))
                .length;
            final allSelected = members.isNotEmpty && selectedCount == members.length;
            final partialSelection =
                selectedCount > 0 && selectedCount < members.length;

            void toggleMember(String userId) {
              if (!enabled) return;
              setSheetState(() {
                final norm = normalizeAssigneeUserId(userId);
                if (selected.contains(norm)) {
                  selected.remove(norm);
                  idByNorm.remove(norm);
                } else {
                  selected.add(norm);
                  idByNorm[norm] = userId;
                }
              });
              notify();
            }

            void toggleSelectAll() {
              if (!enabled) return;
              final next = toggleSelectAllAssignees(selectedList(), members);
              setSheetState(() {
                selected = next.map(normalizeAssigneeUserId).toSet();
                idByNorm
                  ..clear()
                  ..addEntries(
                    next.map((id) => MapEntry(normalizeAssigneeUserId(id), id)),
                  );
              });
              notify();
            }

            void clearAll() {
              if (!enabled) return;
              setSheetState(() {
                selected.clear();
                idByNorm.clear();
              });
              notify();
              if (!showDoneButton) {
                Navigator.pop(sheetContext);
              }
            }

            return ConstrainedBox(
              constraints: BoxConstraints(
                maxHeight: MediaQuery.of(context).size.height * 0.85,
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Padding(
                    padding: const EdgeInsets.fromLTRB(
                      AppSpacing.md,
                      AppSpacing.sm,
                      AppSpacing.md,
                      AppSpacing.sm,
                    ),
                    child: Align(
                      alignment: Alignment.centerLeft,
                      child: Text(
                        title,
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.w700,
                            ),
                      ),
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
                    child: _AssigneeBulkActionsCard(
                      memberCount: members.length,
                      selectedCount: selectedCount,
                      allSelected: allSelected,
                      partialSelection: partialSelection,
                      enabled: enabled,
                      onToggleSelectAll: toggleSelectAll,
                      onClear: clearAll,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  Flexible(
                    child: members.isEmpty
                        ? Padding(
                            padding: const EdgeInsets.all(AppSpacing.lg),
                            child: Text(
                              'No project members available.',
                              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                    color: AppColors.textMuted,
                                  ),
                            ),
                          )
                        : ListView.separated(
                            shrinkWrap: true,
                            padding: const EdgeInsets.fromLTRB(
                              AppSpacing.md,
                              0,
                              AppSpacing.md,
                              AppSpacing.sm,
                            ),
                            itemCount: members.length,
                            separatorBuilder: (_, __) => const SizedBox(height: 4),
                            itemBuilder: (context, index) {
                              final member = members[index];
                              final userId = member.userId;
                              final checked =
                                  selected.contains(normalizeAssigneeUserId(userId));
                              final name = _memberDisplayName(member, sessionUser: sessionUser);
                              final email = member.user?.email.trim() ?? '';
                              return _AssigneeMemberRow(
                                name: name,
                                email: email,
                                userId: userId,
                                avatarUrl: member.user?.avatarUrl,
                                checked: checked,
                                enabled: enabled,
                                onTap: () => toggleMember(userId),
                              );
                            },
                          ),
                  ),
                  if (showDoneButton)
                    Padding(
                      padding: const EdgeInsets.all(AppSpacing.md),
                      child: PrimaryButton(
                        label: 'Done',
                        expand: true,
                        onPressed: () => Navigator.pop(sheetContext),
                      ),
                    ),
                ],
              ),
            );
          },
        ),
      );
    },
  );
}

String _memberDisplayName(ProjectMember member, {AuthUser? sessionUser}) {
  var name = member.user?.fullName.trim() ?? '';
  if (name.isEmpty &&
      sessionUser != null &&
      normalizeAssigneeUserId(member.userId) ==
          normalizeAssigneeUserId(sessionUser.id)) {
    name = sessionUser.fullName.trim();
  }
  if (name.isNotEmpty) return name;
  final email = member.user?.email.trim() ?? '';
  if (email.isNotEmpty) return email;
  return member.userId;
}

class _AssigneeBulkActionsCard extends StatelessWidget {
  const _AssigneeBulkActionsCard({
    required this.memberCount,
    required this.selectedCount,
    required this.allSelected,
    required this.partialSelection,
    required this.enabled,
    required this.onToggleSelectAll,
    required this.onClear,
  });

  final int memberCount;
  final int selectedCount;
  final bool allSelected;
  final bool partialSelection;
  final bool enabled;
  final VoidCallback onToggleSelectAll;
  final VoidCallback onClear;

  @override
  Widget build(BuildContext context) {
    if (memberCount == 0) return const SizedBox.shrink();

    final memberLabel = memberCount == 1 ? '1 member' : '$memberCount members';
    final selectionLabel = selectedCount > 0
        ? '$memberLabel · $selectedCount of $memberCount selected'
        : memberLabel;

    return Container(
      decoration: BoxDecoration(
        color: AppColors.border.withValues(alpha: 0.18),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border.withValues(alpha: 0.65)),
      ),
      child: Column(
        children: [
          Material(
            color: allSelected
                ? AppColors.primary.withValues(alpha: 0.06)
                : Colors.transparent,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(11)),
            child: InkWell(
              onTap: enabled ? onToggleSelectAll : null,
              borderRadius: const BorderRadius.vertical(top: Radius.circular(11)),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                child: Row(
                  children: [
                    Container(
                      width: 32,
                      height: 32,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: allSelected
                            ? AppColors.primary.withValues(alpha: 0.15)
                            : partialSelection
                                ? AppColors.warning.withValues(alpha: 0.12)
                                : AppColors.primary.withValues(alpha: 0.1),
                      ),
                      child: Icon(
                        Icons.people_outline_rounded,
                        size: 18,
                        color: partialSelection && !allSelected
                            ? AppColors.warning
                            : AppColors.primary,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Select all',
                            style: Theme.of(context).textTheme.labelLarge?.copyWith(
                                  fontWeight: FontWeight.w700,
                                ),
                          ),
                          Text(
                            selectionLabel,
                            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                  color: AppColors.textMuted,
                                ),
                          ),
                        ],
                      ),
                    ),
                    _AssigneeCheckbox(
                      checked: allSelected,
                      partial: partialSelection && !allSelected,
                    ),
                  ],
                ),
              ),
            ),
          ),
          Divider(height: 1, color: AppColors.border.withValues(alpha: 0.55)),
          Material(
            color: Colors.transparent,
            child: InkWell(
              onTap: enabled ? onClear : null,
              borderRadius: const BorderRadius.vertical(bottom: Radius.circular(11)),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.person_off_outlined,
                      size: 16,
                      color: AppColors.textMuted,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      'Clear assignment',
                      style: Theme.of(context).textTheme.labelMedium?.copyWith(
                            color: AppColors.textMuted,
                            fontWeight: FontWeight.w600,
                          ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _AssigneeMemberRow extends ConsumerWidget {
  const _AssigneeMemberRow({
    required this.name,
    required this.email,
    required this.userId,
    required this.avatarUrl,
    required this.checked,
    required this.enabled,
    required this.onTap,
  });

  final String name;
  final String email;
  final String userId;
  final String? avatarUrl;
  final bool checked;
  final bool enabled;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final apiBaseUrl = ref.watch(appConfigProvider).apiBaseUrl;
    final imageUrl = _resolveAvatarUrl(apiBaseUrl, avatarUrl, userId);

    return Material(
      color: checked ? AppColors.primary.withValues(alpha: 0.04) : Colors.transparent,
      borderRadius: BorderRadius.circular(10),
      child: InkWell(
        onTap: enabled ? onTap : null,
        borderRadius: BorderRadius.circular(10),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
          child: Row(
            children: [
              CircleAvatar(
                radius: 18,
                backgroundColor: AppColors.primary.withValues(alpha: 0.12),
                child: imageUrl.isEmpty
                    ? Text(
                        workspaceInitials(name),
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: AppColors.primary,
                        ),
                      )
                    : ClipOval(
                        child: Image.network(
                          imageUrl,
                          width: 36,
                          height: 36,
                          fit: BoxFit.cover,
                          errorBuilder: (context, error, stackTrace) {
                            return Center(
                              child: Text(
                                workspaceInitials(name),
                                style: const TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.primary,
                                ),
                              ),
                            );
                          },
                        ),
                      ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.titleSmall?.copyWith(
                            fontWeight: FontWeight.w600,
                          ),
                    ),
                    if (email.isNotEmpty)
                      Text(
                        email,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: AppColors.textMuted,
                            ),
                      ),
                  ],
                ),
              ),
              _AssigneeCheckbox(checked: checked),
            ],
          ),
        ),
      ),
    );
  }
}

class _AssigneeCheckbox extends StatelessWidget {
  const _AssigneeCheckbox({
    required this.checked,
    this.partial = false,
  });

  final bool checked;
  final bool partial;

  @override
  Widget build(BuildContext context) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 150),
      width: 20,
      height: 20,
      decoration: BoxDecoration(
        color: checked
            ? AppColors.primary
            : partial
                ? AppColors.warning.withValues(alpha: 0.15)
                : Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(5),
        border: Border.all(
          color: checked
              ? AppColors.primary
              : partial
                  ? AppColors.warning.withValues(alpha: 0.6)
                  : AppColors.border,
          width: 1.5,
        ),
      ),
      child: checked
          ? const Icon(Icons.check_rounded, size: 14, color: Colors.white)
          : partial
              ? Center(
                  child: Container(
                    width: 8,
                    height: 8,
                    decoration: BoxDecoration(
                      color: AppColors.warning,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                )
              : null,
    );
  }
}

String _resolveAvatarUrl(String apiBaseUrl, String? avatarUrl, String userId) {
  if (avatarUrl != null && avatarUrl.isNotEmpty) {
    if (avatarUrl.startsWith('http')) return avatarUrl;
    final origin = apiBaseUrl.replaceAll(RegExp(r'/api/v1$'), '');
    if (avatarUrl.startsWith('/')) return '$origin$avatarUrl';
    return '$origin/$avatarUrl';
  }
  if (userId.isEmpty) return '';
  final origin = apiBaseUrl.replaceAll(RegExp(r'/api/v1$'), '');
  return '$origin/api/v1/users/avatar/$userId';
}

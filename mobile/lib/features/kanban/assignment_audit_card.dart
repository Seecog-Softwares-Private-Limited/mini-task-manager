import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../core/api/api_client.dart';
import '../../core/theme/app_colors.dart';
import '../../core/utils/workspace_logo.dart';
import '../../data/models/project_member.dart';
import '../../shared/widgets/user_avatar.dart' show resolveUserAvatarUrl;
import '../auth/session_controller.dart';

String _normalizeUserId(String? id) => (id ?? '').trim().toLowerCase();

String formatAuditDateTime(String? raw) {
  if (raw == null || raw.trim().isEmpty) return '';
  final parsed = DateTime.tryParse(raw.trim());
  if (parsed == null) return raw.trim();
  final local = parsed.toLocal();
  final day = local.day;
  final suffix = (day >= 11 && day <= 13)
      ? 'th'
      : switch (day % 10) {
          1 => 'st',
          2 => 'nd',
          3 => 'rd',
          _ => 'th',
        };
  final monthYear = DateFormat('MMM yyyy').format(local);
  final time = DateFormat('h:mm a').format(local).toLowerCase();
  return '$day$suffix $monthYear, $time';
}

String formatOrgRoleLabel(String? role) {
  final r = (role ?? '').trim().toLowerCase();
  if (r.isEmpty) return '';
  if (r == 'owner') return 'owner';
  if (r == 'admin') return 'admin';
  if (r == 'member') return 'member';
  if (r == 'contributor') return 'member';
  if (r == 'viewer') return 'viewer';
  return r;
}

/// Lavender audit card: Raised By / Last Updated / Assigned To.
class AssignmentAuditCard extends ConsumerWidget {
  const AssignmentAuditCard({
    super.key,
    required this.members,
    this.raisedByUserId,
    this.raisedAt,
    this.updatedByUserId,
    this.updatedAt,
    this.assigneeIds = const [],
    this.assignedAt,
  });

  final List<ProjectMember> members;
  final String? raisedByUserId;
  final String? raisedAt;
  final String? updatedByUserId;
  final String? updatedAt;
  final List<String> assigneeIds;
  final String? assignedAt;

  ProjectMember? _memberFor(String? userId) {
    if (userId == null || userId.trim().isEmpty) return null;
    final normalized = _normalizeUserId(userId);
    for (final member in members) {
      if (_normalizeUserId(member.userId) == normalized) return member;
    }
    return null;
  }

  String _displayName(WidgetRef ref, String? userId) {
    if (userId == null || userId.trim().isEmpty) return 'Unknown';
    final match = _memberFor(userId);
    final memberUser = match?.user;
    if (memberUser != null) {
      return memberUser.fullName.trim().isNotEmpty
          ? memberUser.fullName
          : memberUser.email;
    }
    final currentUser = ref.read(sessionControllerProvider).user;
    if (currentUser != null &&
        _normalizeUserId(currentUser.id) == _normalizeUserId(userId)) {
      return currentUser.fullName.trim().isNotEmpty
          ? currentUser.fullName
          : currentUser.email;
    }
    return 'Unknown';
  }

  String? _avatarUrl(WidgetRef ref, String? userId) {
    final match = _memberFor(userId);
    if (match?.user?.avatarUrl != null) return match!.user!.avatarUrl;
    final currentUser = ref.read(sessionControllerProvider).user;
    if (currentUser != null &&
        userId != null &&
        _normalizeUserId(currentUser.id) == _normalizeUserId(userId)) {
      return currentUser.avatarUrl;
    }
    return null;
  }

  String _roleFor(String? userId) => formatOrgRoleLabel(_memberFor(userId)?.role);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cleanAssignees = assigneeIds
        .map((id) => id.trim())
        .where((id) => id.isNotEmpty)
        .toList();
    final hasRaised =
        (raisedByUserId != null && raisedByUserId!.trim().isNotEmpty) ||
            (raisedAt != null && raisedAt!.trim().isNotEmpty);
    final hasRealUpdate =
        updatedByUserId != null && updatedByUserId!.trim().isNotEmpty;
    final hasAssigned = cleanAssignees.isNotEmpty ||
        (assignedAt != null && assignedAt!.trim().isNotEmpty);
    if (!hasRaised && !hasRealUpdate && !hasAssigned) {
      return const SizedBox.shrink();
    }

    final avatarUserId = (raisedByUserId != null && raisedByUserId!.trim().isNotEmpty)
        ? raisedByUserId
        : (cleanAssignees.isNotEmpty ? cleanAssignees.first : updatedByUserId);
    final apiBaseUrl = ref.watch(appConfigProvider).apiBaseUrl;
    final imageUrl = resolveUserAvatarUrl(apiBaseUrl, _avatarUrl(ref, avatarUserId));
    final raisedName = hasRaised
        ? _displayName(ref, raisedByUserId)
        : 'Unknown';
    final raisedRole = _roleFor(raisedByUserId);

    String? updatedName;
    String? updatedRole;
    if (hasRealUpdate) {
      updatedName = _displayName(ref, updatedByUserId);
      updatedRole = _roleFor(updatedByUserId);
    }

    String? assignedName;
    String? assignedRole;
    String? assignedExtra;
    if (cleanAssignees.isEmpty) {
      assignedName = hasAssigned ? 'Unassigned' : null;
    } else {
      assignedName = _displayName(ref, cleanAssignees.first);
      assignedRole = _roleFor(cleanAssignees.first);
      if (cleanAssignees.length > 1) {
        assignedExtra = '+${cleanAssignees.length - 1}';
      }
    }

    Widget divider() => Padding(
          padding: const EdgeInsets.symmetric(vertical: 6),
          child: Divider(
            height: 1,
            thickness: 1,
            color: AppColors.primary.withValues(alpha: 0.14),
          ),
        );

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(10, 10, 10, 10),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            AppColors.primary.withValues(alpha: 0.10),
            AppColors.violet.withValues(alpha: 0.08),
          ],
        ),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.primary.withValues(alpha: 0.18)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(top: 2),
            child: _AuditAvatar(name: raisedName, imageUrl: imageUrl, size: 36),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (hasRaised)
                  _AuditRow(
                    label: 'Raised By',
                    name: raisedName,
                    role: raisedRole,
                    dateTime: formatAuditDateTime(raisedAt),
                  ),
                if (hasRaised) divider(),
                _AuditRow(
                  label: 'Last Updated',
                  name: hasRealUpdate ? updatedName! : 'none',
                  role: hasRealUpdate ? updatedRole : null,
                  dateTime: hasRealUpdate ? formatAuditDateTime(updatedAt) : null,
                  plainValue: !hasRealUpdate,
                ),
                if (hasAssigned) divider(),
                if (hasAssigned)
                  _AuditRow(
                    label: 'Assigned To',
                    name: assignedName ?? 'Unassigned',
                    role: assignedRole,
                    dateTime: formatAuditDateTime(assignedAt),
                    trailing: assignedExtra,
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Two-line audit row:
/// Line 1 — label
/// Line 2 — Name (role) · date time   [or just "none"]
class _AuditRow extends StatelessWidget {
  const _AuditRow({
    required this.label,
    required this.name,
    this.role,
    this.dateTime,
    this.trailing,
    this.plainValue = false,
  });

  final String label;
  final String name;
  final String? role;
  final String? dateTime;
  final String? trailing;
  final bool plainValue;

  @override
  Widget build(BuildContext context) {
    final labelStyle = Theme.of(context).textTheme.labelSmall?.copyWith(
          color: AppColors.textMuted,
          fontWeight: FontWeight.w600,
          letterSpacing: 0.15,
          height: 1.2,
        );
    final nameStyle = Theme.of(context).textTheme.bodyMedium?.copyWith(
          fontWeight: FontWeight.w700,
          height: 1.3,
          color: Theme.of(context).colorScheme.onSurface,
        );
    final mutedStyle = Theme.of(context).textTheme.bodySmall?.copyWith(
          color: AppColors.textMuted,
          fontWeight: FontWeight.w500,
          height: 1.3,
        );

    if (plainValue) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('$label :', style: labelStyle),
          const SizedBox(height: 2),
          Text(name, style: nameStyle),
        ],
      );
    }

    final when = dateTime?.trim() ?? '';
    final roleText = (role ?? '').trim();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('$label :', style: labelStyle),
        const SizedBox(height: 2),
        // Line 1: name + grey role + optional +N
        Text.rich(
          TextSpan(
            style: nameStyle,
            children: [
              TextSpan(text: name),
              if (roleText.isNotEmpty)
                TextSpan(
                  text: ' ($roleText)',
                  style: mutedStyle?.copyWith(
                    fontWeight: FontWeight.w600,
                    fontSize: nameStyle?.fontSize,
                  ),
                ),
              if (trailing != null && trailing!.isNotEmpty)
                TextSpan(
                  text: ' $trailing',
                  style: mutedStyle?.copyWith(
                    fontWeight: FontWeight.w700,
                    fontSize: nameStyle?.fontSize,
                  ),
                ),
            ],
          ),
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
        ),
        // Line 2: date · time
        if (when.isNotEmpty) ...[
          const SizedBox(height: 1),
          Text(
            when,
            style: mutedStyle,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ],
    );
  }
}

class _AuditAvatar extends StatelessWidget {
  const _AuditAvatar({
    required this.name,
    required this.imageUrl,
    required this.size,
  });

  final String name;
  final String imageUrl;
  final double size;

  @override
  Widget build(BuildContext context) {
    if (imageUrl.isNotEmpty) {
      return ClipOval(
        child: Image.network(
          imageUrl,
          width: size,
          height: size,
          fit: BoxFit.cover,
          errorBuilder: (_, __, ___) => _initials(),
        ),
      );
    }
    return _initials();
  }

  Widget _initials() {
    return Container(
      width: size,
      height: size,
      decoration: const BoxDecoration(
        shape: BoxShape.circle,
        gradient: LinearGradient(
          colors: [AppColors.primary, AppColors.violet],
        ),
      ),
      alignment: Alignment.center,
      child: Text(
        workspaceInitials(name),
        style: TextStyle(
          color: Colors.white,
          fontWeight: FontWeight.w700,
          fontSize: size * 0.36,
        ),
      ),
    );
  }
}

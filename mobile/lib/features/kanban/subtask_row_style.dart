import 'package:flutter/material.dart';

import '../../core/theme/app_colors.dart';
import '../../data/models/task.dart';
import 'subtask_completion_utils.dart';

class SubtaskRowStyle {
  const SubtaskRowStyle({
    required this.borderColor,
    required this.backgroundColor,
  });

  final Color borderColor;
  final Color backgroundColor;
}

String resolveSubtaskStatusValue(TaskSubtask subtask) {
  final raw = subtask.status?.toUpperCase();
  if (raw == 'TODO' || raw == 'IN_PROGRESS' || raw == 'DONE') return raw!;
  if (isSubtaskDone(subtask)) return 'DONE';
  return 'TODO';
}

bool isSubtaskOverdue(TaskSubtask subtask) {
  final dueDate = subtask.dueDate;
  if (dueDate == null || dueDate.isEmpty) return false;
  if (isSubtaskDone(subtask)) return false;

  final parsed = DateTime.tryParse(dueDate);
  if (parsed == null) return false;

  final dueTime = subtask.dueTime;
  if (dueTime != null && dueTime.isNotEmpty) {
    final parts = dueTime.split(':');
    if (parts.length >= 2) {
      final hours = int.tryParse(parts[0]);
      final minutes = int.tryParse(parts[1]);
      if (hours != null && minutes != null) {
        final due = DateTime(
          parsed.year,
          parsed.month,
          parsed.day,
          hours,
          minutes,
        );
        return due.isBefore(DateTime.now());
      }
    }
  }

  final now = DateTime.now();
  final today = DateTime(now.year, now.month, now.day);
  final due = DateTime(parsed.year, parsed.month, parsed.day);
  return due.isBefore(today);
}

SubtaskRowStyle subtaskRowStyle(TaskSubtask subtask, {bool expanded = false}) {
  if (isSubtaskOverdue(subtask)) {
    return const SubtaskRowStyle(
      borderColor: Color(0xFF991B1B),
      backgroundColor: Color(0xFFFECACA),
    );
  }

  switch (resolveSubtaskStatusValue(subtask)) {
    case 'TODO':
      return SubtaskRowStyle(
        borderColor: AppColors.danger.withValues(alpha: 0.45),
        backgroundColor: AppColors.dangerSoft.withValues(alpha: 0.75),
      );
    case 'IN_PROGRESS':
    case 'DONE':
      return SubtaskRowStyle(
        borderColor: AppColors.success.withValues(alpha: 0.35),
        backgroundColor: AppColors.successSoft.withValues(alpha: 0.85),
      );
    default:
      return SubtaskRowStyle(
        borderColor: expanded ? AppColors.primary : AppColors.border,
        backgroundColor: AppColors.surface,
      );
  }
}

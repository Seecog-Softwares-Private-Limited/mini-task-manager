import 'package:flutter/material.dart';

import '../../core/theme/app_colors.dart';
import '../../data/models/task.dart';
import 'subtask_completion_utils.dart';

class SubtaskRowStyle {
  const SubtaskRowStyle({
    required this.borderColor,
    required this.backgroundColor,
    required this.accentColor,
  });

  final Color borderColor;
  final Color backgroundColor;
  final Color accentColor;
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

/// Kanban-card style: thick left accent + neutral body + subtle gray border.
/// - To Do → light red
/// - In Progress → light yellow
/// - Done → light green
/// - Overdue → dark red
SubtaskRowStyle subtaskRowStyle(TaskSubtask subtask, {bool expanded = false}) {
  final surface = AppColors.surface;
  final grayBorder = AppColors.border;

  if (isSubtaskOverdue(subtask)) {
    return SubtaskRowStyle(
      borderColor: grayBorder,
      backgroundColor: surface,
      accentColor: const Color(0xFFB91C1C), // red-700
    );
  }

  switch (resolveSubtaskStatusValue(subtask)) {
    case 'TODO':
      return SubtaskRowStyle(
        borderColor: grayBorder,
        backgroundColor: surface,
        accentColor: const Color(0xFFF87171), // red-400
      );
    case 'IN_PROGRESS':
      return SubtaskRowStyle(
        borderColor: grayBorder,
        backgroundColor: surface,
        accentColor: const Color(0xFFEAB308), // yellow-500
      );
    case 'DONE':
      return SubtaskRowStyle(
        borderColor: grayBorder,
        backgroundColor: surface,
        accentColor: const Color(0xFF34D399), // emerald-400
      );
    default:
      return SubtaskRowStyle(
        borderColor: expanded ? AppColors.primary : grayBorder,
        backgroundColor: surface,
        accentColor: expanded ? AppColors.primary : grayBorder,
      );
  }
}

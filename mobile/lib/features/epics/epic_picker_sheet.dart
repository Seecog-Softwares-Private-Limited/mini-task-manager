import 'package:flutter/material.dart';

import '../../core/constants/epic_colors.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../data/models/epic.dart';

/// Single-selection "None" + epic list, mirroring web's epic dropdown
/// (color dot + title, checkmark on the current selection).
Future<void> showEpicPickerSheet({
  required BuildContext context,
  required List<Epic> epics,
  required String? selectedEpicId,
  required ValueChanged<String?> onSelected,
}) async {
  await showModalBottomSheet<void>(
    context: context,
    showDragHandle: true,
    isScrollControlled: true,
    builder: (sheetContext) {
      return SafeArea(
        child: ListView(
          shrinkWrap: true,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(
                AppSpacing.md,
                0,
                AppSpacing.md,
                AppSpacing.xs,
              ),
              child: Text('Epic', style: Theme.of(sheetContext).textTheme.titleMedium),
            ),
            ListTile(
              leading: const Icon(Icons.block, color: AppColors.textMuted),
              title: const Text('None'),
              trailing: selectedEpicId == null
                  ? const Icon(Icons.check, color: AppColors.primary)
                  : null,
              onTap: () {
                onSelected(null);
                Navigator.of(sheetContext).pop();
              },
            ),
            for (final epic in epics)
              ListTile(
                leading: Container(
                  width: 12,
                  height: 12,
                  margin: const EdgeInsets.all(4),
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: parseEpicColor(epic.color),
                  ),
                ),
                title: Text(epic.title),
                trailing: epic.id == selectedEpicId
                    ? const Icon(Icons.check, color: AppColors.primary)
                    : null,
                onTap: () {
                  onSelected(epic.id);
                  Navigator.of(sheetContext).pop();
                },
              ),
          ],
        ),
      );
    },
  );
}

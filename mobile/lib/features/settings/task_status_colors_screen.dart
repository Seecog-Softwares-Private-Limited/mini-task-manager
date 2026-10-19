import 'package:flutter/material.dart';
import 'package:flutter_colorpicker/flutter_colorpicker.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../shared/widgets/app_widgets.dart';

/// Default workflow status labels for the UI-only color picker.
/// Not persisted and not applied to boards yet.
const _kDefaultStatuses = <({String key, String label, Color seed})>[
  (key: 'TODO', label: 'To Do', seed: AppColors.sky),
  (key: 'IN_PROGRESS', label: 'In Progress', seed: AppColors.warning),
  (key: 'DONE', label: 'Done', seed: AppColors.success),
];

/// Quick-pick presets shown alongside the full color wheel.
const _kQuickPicks = <Color>[
  AppColors.sky,
  AppColors.primary,
  AppColors.violet,
  AppColors.success,
  AppColors.warning,
  AppColors.danger,
];

String _colorHex(Color color) {
  final rgb = color.toARGB32() & 0xFFFFFF;
  return '#${rgb.toRadixString(16).padLeft(6, '0').toUpperCase()}';
}

/// Settings → Task status colors (visual only; no save / no board wiring).
class TaskStatusColorsScreen extends StatefulWidget {
  const TaskStatusColorsScreen({super.key});

  @override
  State<TaskStatusColorsScreen> createState() => _TaskStatusColorsScreenState();
}

class _TaskStatusColorsScreenState extends State<TaskStatusColorsScreen> {
  late final Map<String, Color> _colors = {
    for (final status in _kDefaultStatuses) status.key: status.seed,
  };

  Future<void> _pickColor(String key, String label) async {
    final current = _colors[key] ?? AppColors.primary;
    final selected = await showModalBottomSheet<Color>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (ctx) => _StatusColorWheelSheet(
        title: label,
        current: current,
      ),
    );
    if (selected == null || !mounted) return;
    setState(() => _colors[key] = selected);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Task status colors')),
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.md),
        children: [
          Text(
            'Choose a color for each status. These choices are for preview only '
            'and are not saved yet.',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: AppColors.textMuted,
                ),
          ),
          const SizedBox(height: AppSpacing.md),
          for (final status in _kDefaultStatuses) ...[
            SurfaceCard(
              onTap: () => _pickColor(status.key, status.label),
              child: Row(
                children: [
                  Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      color: _colors[status.key],
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: AppColors.border.withValues(alpha: 0.8),
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: (_colors[status.key] ?? AppColors.primary)
                              .withValues(alpha: 0.35),
                          blurRadius: 8,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: AppSpacing.md),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          status.label,
                          style:
                              Theme.of(context).textTheme.titleSmall?.copyWith(
                                    fontWeight: FontWeight.w700,
                                  ),
                        ),
                        Text(
                          'Tap to pick a color',
                          style:
                              Theme.of(context).textTheme.bodySmall?.copyWith(
                                    color: AppColors.textMuted,
                                  ),
                        ),
                      ],
                    ),
                  ),
                  OutlinedButton(
                    onPressed: () => _pickColor(status.key, status.label),
                    child: const Text('Pick color'),
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.sm),
          ],
        ],
      ),
    );
  }
}

class _StatusColorWheelSheet extends StatefulWidget {
  const _StatusColorWheelSheet({
    required this.title,
    required this.current,
  });

  final String title;
  final Color current;

  @override
  State<_StatusColorWheelSheet> createState() => _StatusColorWheelSheetState();
}

class _StatusColorWheelSheetState extends State<_StatusColorWheelSheet> {
  late Color _color = widget.current;
  /// Bumped when a quick pick is chosen so the wheel remounts to that color.
  int _wheelEpoch = 0;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: SingleChildScrollView(
        padding: EdgeInsets.fromLTRB(
          AppSpacing.md,
          0,
          AppSpacing.md,
          MediaQuery.viewInsetsOf(context).bottom + AppSpacing.md,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'Color for ${widget.title}',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
            ),
            const SizedBox(height: AppSpacing.xs),
            Text(
              'Use a quick pick or the wheel for any color. Nothing is saved yet.',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: AppColors.textMuted,
                  ),
            ),
            const SizedBox(height: AppSpacing.md),
            Text(
              'Quick picks',
              style: Theme.of(context).textTheme.labelLarge?.copyWith(
                    fontWeight: FontWeight.w700,
                    color: AppColors.textMuted,
                  ),
            ),
            const SizedBox(height: AppSpacing.sm),
            Wrap(
              spacing: 10,
              runSpacing: 10,
              children: [
                for (final color in _kQuickPicks)
                  _QuickPickSwatch(
                    color: color,
                    selected: color == _color,
                    onTap: () => setState(() {
                      _color = color;
                      _wheelEpoch++;
                    }),
                  ),
              ],
            ),
            const SizedBox(height: AppSpacing.md),
            Text(
              'Color wheel',
              style: Theme.of(context).textTheme.labelLarge?.copyWith(
                    fontWeight: FontWeight.w700,
                    color: AppColors.textMuted,
                  ),
            ),
            const SizedBox(height: AppSpacing.sm),
            Center(
              child: HueRingPicker(
                key: ValueKey(_wheelEpoch),
                pickerColor: _color,
                onColorChanged: (color) => setState(() => _color = color),
                enableAlpha: false,
                displayThumbColor: true,
                portraitOnly: true,
              ),
            ),
            const SizedBox(height: AppSpacing.md),
            Row(
              children: [
                Container(
                  width: 28,
                  height: 28,
                  decoration: BoxDecoration(
                    color: _color,
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: AppColors.border.withValues(alpha: 0.8),
                    ),
                  ),
                ),
                const SizedBox(width: AppSpacing.sm),
                Expanded(
                  child: Text(
                    _colorHex(_color),
                    style: Theme.of(context).textTheme.labelLarge?.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                  ),
                ),
                TextButton(
                  onPressed: () => Navigator.of(context).pop(),
                  child: const Text('Cancel'),
                ),
                const SizedBox(width: AppSpacing.xs),
                FilledButton(
                  onPressed: () => Navigator.of(context).pop(_color),
                  child: const Text('Use color'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _QuickPickSwatch extends StatelessWidget {
  const _QuickPickSwatch({
    required this.color,
    required this.selected,
    required this.onTap,
  });

  final Color color;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: color,
      shape: CircleBorder(
        side: BorderSide(
          color: selected ? Colors.white : Colors.black.withValues(alpha: 0.12),
          width: selected ? 3 : 1,
        ),
      ),
      elevation: selected ? 2 : 0,
      child: InkWell(
        customBorder: const CircleBorder(),
        onTap: onTap,
        child: SizedBox(
          width: 40,
          height: 40,
          child: selected
              ? const Icon(Icons.check_rounded, color: Colors.white, size: 20)
              : null,
        ),
      ),
    );
  }
}

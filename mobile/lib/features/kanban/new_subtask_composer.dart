import 'package:flutter/material.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../shared/widgets/app_widgets.dart';
import 'subtask_detail_panel.dart';

/// Shared "Add an item…" composer used by task detail and planner editors.
class NewSubtaskComposer extends StatefulWidget {
  const NewSubtaskComposer({
    super.key,
    required this.enabled,
    required this.onSubmit,
    this.loading = false,
    this.hintText = 'Add an item…',
  });

  final bool enabled;
  final bool loading;
  final String hintText;
  final Future<void> Function(String title) onSubmit;

  @override
  State<NewSubtaskComposer> createState() => _NewSubtaskComposerState();
}

class _NewSubtaskComposerState extends State<NewSubtaskComposer> {
  final _controller = TextEditingController();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final title = _controller.text.trim();
    if (title.isEmpty || !widget.enabled || widget.loading) return;
    await widget.onSubmit(title);
    if (mounted) _controller.clear();
  }

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<TextEditingValue>(
      valueListenable: _controller,
      builder: (context, value, _) {
        final canSubmit =
            widget.enabled && !widget.loading && value.text.trim().isNotEmpty;
        return Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: TextField(
                controller: _controller,
                enabled: widget.enabled,
                maxLength: subtaskTitleMaxLength,
                decoration: InputDecoration(
                  hintText: widget.hintText,
                  counterText: '',
                  prefixIcon: Icon(
                    Icons.add_rounded,
                    color: AppColors.textMuted.withValues(alpha: 0.7),
                  ),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: 14,
                    vertical: 14,
                  ),
                ),
                onSubmitted: (_) => _submit(),
              ),
            ),
            const SizedBox(width: AppSpacing.sm),
            PrimaryButton(
              label: 'Add',
              expand: false,
              height: 44,
              borderRadius: 12,
              loading: widget.loading,
              onPressed: canSubmit ? _submit : null,
            ),
          ],
        );
      },
    );
  }
}

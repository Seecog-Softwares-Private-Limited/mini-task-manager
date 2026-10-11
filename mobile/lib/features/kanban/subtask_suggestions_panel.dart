import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_exception.dart';
import '../../core/messaging/app_messenger.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../data/repositories/ai_repository.dart';
import '../../shared/widgets/app_widgets.dart';

enum SubtaskSuggestionsVariant {
  /// Create sheet: Suggest under the task title / checklist.
  create,

  /// Existing task: optional purpose box, then Suggest.
  panel,
}

/// Mirrors web `SubtaskSuggestionsPanel` — AI checklist suggestions via
/// `POST /ai/subtask-suggestions`. Suggestions stay separate until accepted.
class SubtaskSuggestionsPanel extends ConsumerStatefulWidget {
  const SubtaskSuggestionsPanel({
    super.key,
    required this.organizationId,
    required this.onAccept,
    this.taskId,
    this.draftTitle,
    this.draftDescription,
    this.existingTitles = const [],
    this.disabled = false,
    this.disabledReason,
    this.note,
    this.variant = SubtaskSuggestionsVariant.panel,
    this.purposeInput = false,
    this.reportAcceptErrors = true,
  });

  final String organizationId;

  /// Existing saved task — mutually exclusive with [draftTitle].
  final String? taskId;

  /// Unsaved create/edit draft title (create + purpose flows).
  final String? draftTitle;
  final String? draftDescription;
  final List<String> existingTitles;
  final bool disabled;
  final String? disabledReason;
  final String? note;
  final SubtaskSuggestionsVariant variant;
  final bool purposeInput;
  final bool reportAcceptErrors;
  final Future<void> Function(List<String> titles) onAccept;

  @override
  ConsumerState<SubtaskSuggestionsPanel> createState() =>
      _SubtaskSuggestionsPanelState();
}

class _SubtaskSuggestionsPanelState
    extends ConsumerState<SubtaskSuggestionsPanel> {
  final _purposeController = TextEditingController();
  List<String> _suggestions = const [];
  bool _loading = false;
  bool _saving = false;
  bool _asked = false;

  @override
  void dispose() {
    _purposeController.dispose();
    super.dispose();
  }

  @override
  void didUpdateWidget(covariant SubtaskSuggestionsPanel oldWidget) {
    super.didUpdateWidget(oldWidget);
    final next = withoutExisting(_suggestions, widget.existingTitles);
    if (next.length != _suggestions.length ||
        !_listEquals(next, _suggestions)) {
      setState(() => _suggestions = next);
    }
  }

  bool get _busy => _loading || _saving || widget.disabled;

  Future<void> _suggest() async {
    if (_busy) return;
    final purposeText = _purposeController.text.trim();
    if (widget.purposeInput && purposeText.isEmpty) return;

    setState(() => _loading = true);
    try {
      final shown = _suggestions
          .map((t) => t.trim())
          .where((t) => t.isNotEmpty)
          .toList();

      final List<String> result;
      if (widget.purposeInput) {
        result = await ref.read(aiRepositoryProvider).suggestSubtasks(
              organizationId: widget.organizationId,
              draftTitle: purposeText,
              draftDescription: widget.draftDescription,
              draftSubtaskTitles: widget.existingTitles,
              excludeTitles: shown,
            );
      } else if (widget.taskId != null && widget.taskId!.trim().isNotEmpty) {
        result = await ref.read(aiRepositoryProvider).suggestSubtasks(
              organizationId: widget.organizationId,
              taskId: widget.taskId,
              excludeTitles: shown,
            );
      } else {
        final title = (widget.draftTitle ?? '').trim();
        if (title.isEmpty) return;
        result = await ref.read(aiRepositoryProvider).suggestSubtasks(
              organizationId: widget.organizationId,
              draftTitle: title,
              draftDescription: widget.draftDescription,
              draftSubtaskTitles: widget.existingTitles,
              excludeTitles: shown,
            );
      }

      if (!mounted) return;
      setState(() {
        _suggestions = withoutExisting(result, widget.existingTitles);
        _asked = true;
      });
    } catch (error) {
      if (!mounted) return;
      showAppMessage(
        _suggestionRequestError(error),
        isError: true,
      );
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _accept(List<String> titles) async {
    if (titles.isEmpty || _saving) return;
    setState(() => _saving = true);
    try {
      await widget.onAccept(titles);
      if (!mounted) return;
      final accepted = titles.toSet();
      setState(() {
        _suggestions =
            _suggestions.where((title) => !accepted.contains(title)).toList();
      });
    } catch (error) {
      if (widget.reportAcceptErrors && mounted) {
        showAppMessage(userFacingError(error), isError: true);
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  void _dismiss() {
    setState(() {
      _suggestions = const [];
      _asked = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final purposeEmpty =
        widget.purposeInput && _purposeController.text.trim().isEmpty;
    final canSuggest = !_busy && !purposeEmpty;

    final suggestButton = OutlinedButton.icon(
      onPressed: canSuggest ? _suggest : null,
      icon: _loading
          ? const SizedBox(
              width: 14,
              height: 14,
              child: CircularProgressIndicator(strokeWidth: 2),
            )
          : const Icon(Icons.auto_awesome_rounded, size: 16),
      label: const Text('Suggest'),
      style: OutlinedButton.styleFrom(
        foregroundColor: AppColors.sky,
        side: BorderSide(
          color: AppColors.sky.withValues(alpha: isDark ? 0.35 : 0.45),
        ),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      ),
    );

    final list = _SuggestionList(
      asked: _asked,
      loading: _loading,
      saving: _saving,
      busy: _busy,
      suggestions: _suggestions,
      disabledReason:
          widget.disabled ? widget.disabledReason : null,
      onAddOne: (title) => _accept([title]),
      onAddAll: () => _accept(_suggestions),
      onDismiss: _dismiss,
      onClearAsked: () => setState(() => _asked = false),
    );

    if (widget.variant == SubtaskSuggestionsVariant.create) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Align(alignment: Alignment.centerRight, child: suggestButton),
          if (_asked || _suggestions.isNotEmpty) ...[
            const SizedBox(height: AppSpacing.sm),
            _AiCard(
              isDark: isDark,
              showHeader: true,
              note: widget.note ??
                  'Suggestions stay separate until you add them.',
              child: list,
            ),
          ] else if (widget.disabled && widget.disabledReason != null) ...[
            const SizedBox(height: AppSpacing.xs),
            Text(
              widget.disabledReason!,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: AppColors.textMuted,
                  ),
            ),
          ],
        ],
      );
    }

    return _AiCard(
      isDark: isDark,
      showHeader: false,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          width: 28,
                          height: 28,
                          decoration: BoxDecoration(
                            color: AppColors.sky.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Icon(
                            Icons.auto_awesome_rounded,
                            size: 16,
                            color: AppColors.sky,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          'AI Suggested subtasks',
                          style:
                              Theme.of(context).textTheme.titleSmall?.copyWith(
                                    fontWeight: FontWeight.w600,
                                    color: isDark
                                        ? const Color(0xFFE0F2FE)
                                        : const Color(0xFF0C4A6E),
                                  ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      widget.note ??
                          'Suggestions stay separate until you add them.',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: isDark
                                ? const Color(0xFFBAE6FD)
                                    .withValues(alpha: 0.75)
                                : const Color(0xFF0C4A6E)
                                    .withValues(alpha: 0.7),
                          ),
                    ),
                    if (widget.purposeInput) ...[
                      const SizedBox(height: AppSpacing.sm),
                      TextField(
                        controller: _purposeController,
                        enabled: !_busy,
                        maxLength: 300,
                        maxLines: 2,
                        minLines: 2,
                        onChanged: (_) => setState(() {}),
                        decoration: InputDecoration(
                          hintText: 'I want to repair my bike',
                          counterText: '',
                          filled: true,
                          fillColor: isDark
                              ? Theme.of(context).colorScheme.surface
                              : Colors.white,
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: BorderSide(
                              color: AppColors.sky.withValues(alpha: 0.35),
                            ),
                          ),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: BorderSide(
                              color: AppColors.sky.withValues(alpha: 0.35),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(width: AppSpacing.sm),
              suggestButton,
            ],
          ),
          list,
        ],
      ),
    );
  }
}

class _AiCard extends StatelessWidget {
  const _AiCard({
    required this.isDark,
    required this.child,
    this.showHeader = false,
    this.note,
  });

  final bool isDark;
  final Widget child;
  final bool showHeader;
  final String? note;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(AppSpacing.sm + 2),
      decoration: BoxDecoration(
        color: isDark
            ? AppColors.sky.withValues(alpha: 0.06)
            : const Color(0xFFF0F9FF).withValues(alpha: 0.85),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: AppColors.sky.withValues(alpha: isDark ? 0.25 : 0.35),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (showHeader) ...[
            Text(
              'AI Suggested subtasks',
              style: Theme.of(context).textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w600,
                    color: isDark
                        ? const Color(0xFFE0F2FE)
                        : const Color(0xFF0C4A6E),
                  ),
            ),
            if (note != null) ...[
              const SizedBox(height: 4),
              Text(
                note!,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: isDark
                          ? const Color(0xFFBAE6FD).withValues(alpha: 0.75)
                          : const Color(0xFF0C4A6E).withValues(alpha: 0.7),
                    ),
              ),
            ],
          ],
          child,
        ],
      ),
    );
  }
}

class _SuggestionList extends StatelessWidget {
  const _SuggestionList({
    required this.asked,
    required this.loading,
    required this.saving,
    required this.busy,
    required this.suggestions,
    required this.onAddOne,
    required this.onAddAll,
    required this.onDismiss,
    required this.onClearAsked,
    this.disabledReason,
  });

  final bool asked;
  final bool loading;
  final bool saving;
  final bool busy;
  final List<String> suggestions;
  final String? disabledReason;
  final Future<void> Function(String title) onAddOne;
  final Future<void> Function() onAddAll;
  final VoidCallback onDismiss;
  final VoidCallback onClearAsked;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (disabledReason != null) ...[
          const SizedBox(height: AppSpacing.xs),
          Text(
            disabledReason!,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: AppColors.textMuted,
                ),
          ),
        ],
        if (asked && suggestions.isEmpty && !loading) ...[
          const SizedBox(height: AppSpacing.sm),
          Text(
            'No additional subtasks to suggest.',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: isDark
                      ? const Color(0xFFE0F2FE).withValues(alpha: 0.85)
                      : const Color(0xFF0C4A6E).withValues(alpha: 0.8),
                ),
          ),
        ],
        if (suggestions.isNotEmpty) ...[
          const SizedBox(height: AppSpacing.sm),
          ...suggestions.map((title) {
            return Padding(
              padding: const EdgeInsets.only(bottom: AppSpacing.xs),
              child: Container(
                padding: const EdgeInsets.fromLTRB(12, 8, 8, 8),
                decoration: BoxDecoration(
                  color: isDark
                      ? Theme.of(context).colorScheme.surface.withValues(alpha: 0.4)
                      : Colors.white.withValues(alpha: 0.85),
                  borderRadius: BorderRadius.circular(12),
                  border: Border(
                    left: const BorderSide(color: AppColors.sky, width: 4),
                    top: BorderSide(
                      color: AppColors.sky.withValues(alpha: 0.25),
                    ),
                    right: BorderSide(
                      color: AppColors.sky.withValues(alpha: 0.25),
                    ),
                    bottom: BorderSide(
                      color: AppColors.sky.withValues(alpha: 0.25),
                    ),
                  ),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 8,
                      height: 8,
                      decoration: const BoxDecoration(
                        color: AppColors.sky,
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        title,
                        style: Theme.of(context).textTheme.bodyMedium,
                      ),
                    ),
                    TextButton(
                      onPressed: busy ? null : () { onAddOne(title); },
                      child: const Text('Add'),
                    ),
                  ],
                ),
              ),
            );
          }),
          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              TextButton.icon(
                onPressed: busy ? null : onDismiss,
                icon: const Icon(Icons.close_rounded, size: 16),
                label: const Text('Dismiss'),
              ),
              const SizedBox(width: 4),
              PrimaryButton(
                label: 'Add all',
                expand: false,
                height: 36,
                borderRadius: 10,
                loading: saving,
                onPressed: busy ? null : () { onAddAll(); },
              ),
            ],
          ),
        ] else if (asked)
          Align(
            alignment: Alignment.centerRight,
            child: TextButton(
              onPressed: onClearAsked,
              child: const Text('Dismiss'),
            ),
          ),
      ],
    );
  }
}

String normalizeSuggestionTitle(String title) {
  return title
      .trim()
      .toLowerCase()
      .replaceAll(RegExp(r'[^a-z0-9\s]'), ' ')
      .replaceAll(RegExp(r'\s+'), ' ')
      .trim();
}

List<String> withoutExisting(List<String> titles, List<String> existingTitles) {
  final taken = existingTitles
      .map(normalizeSuggestionTitle)
      .where((t) => t.isNotEmpty)
      .toSet();
  final kept = <String>[];
  for (final title in titles) {
    final key = normalizeSuggestionTitle(title);
    if (key.isEmpty || taken.contains(key)) continue;
    taken.add(key);
    kept.add(title.trim());
  }
  return kept;
}

String clampSubtaskTitle(String title) {
  final trimmed = title.trim();
  if (trimmed.length <= 200) return trimmed;
  return trimmed.substring(0, 200);
}

String _suggestionRequestError(Object error) {
  final status = error is ApiException ? error.statusCode : null;
  if (status == 503 || status == 504) {
    return 'AI suggestions are unavailable right now. Try again later.';
  }
  if (status == 422) {
    return 'AI returned an unusable response. Try again.';
  }
  return userFacingError(
    error,
    fallback: 'Could not suggest subtasks. Please try again.',
  );
}

bool _listEquals(List<String> a, List<String> b) {
  if (a.length != b.length) return false;
  for (var i = 0; i < a.length; i++) {
    if (a[i] != b[i]) return false;
  }
  return true;
}

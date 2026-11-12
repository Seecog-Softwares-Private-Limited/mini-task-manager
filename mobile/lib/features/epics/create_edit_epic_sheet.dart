import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../core/api/api_exception.dart';
import '../../core/constants/epic_colors.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../data/models/epic.dart';
import '../../shared/widgets/app_widgets.dart';
import 'epic_providers.dart';

/// Create or edit an epic. `projectId` is fixed and not editable — matches
/// the backend (an epic's project can't be changed after creation).
class CreateEditEpicSheet extends ConsumerStatefulWidget {
  const CreateEditEpicSheet({
    super.key,
    required this.organizationId,
    required this.projectId,
    required this.onSaved,
    this.epic,
  });

  final String organizationId;
  final String projectId;
  final Epic? epic;
  final VoidCallback onSaved;

  bool get isEdit => epic != null;

  @override
  ConsumerState<CreateEditEpicSheet> createState() => _CreateEditEpicSheetState();
}

class _CreateEditEpicSheetState extends ConsumerState<CreateEditEpicSheet> {
  late final _titleController = TextEditingController(text: widget.epic?.title ?? '');
  late final _descriptionController =
      TextEditingController(text: widget.epic?.description ?? '');

  late String _status = widget.epic?.status ?? 'TODO';
  late String _color = widget.epic?.color ?? kEpicColors.first.hex;
  DateTime? _startDate;
  DateTime? _dueDate;

  bool _loading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _startDate = _parseDate(widget.epic?.startDate);
    _dueDate = _parseDate(widget.epic?.dueDate);
  }

  DateTime? _parseDate(String? value) {
    if (value == null || value.isEmpty) return null;
    return DateTime.tryParse(value);
  }

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  Future<void> _pickDate({required bool isStart}) async {
    final initial = (isStart ? _startDate : _dueDate) ?? DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: DateTime.now().subtract(const Duration(days: 365 * 2)),
      lastDate: DateTime.now().add(const Duration(days: 365 * 5)),
    );
    if (picked == null) return;
    setState(() {
      if (isStart) {
        _startDate = picked;
      } else {
        _dueDate = picked;
      }
    });
  }

  Future<void> _submit() async {
    final title = _titleController.text.trim();
    if (title.isEmpty) {
      setState(() => _error = 'Title is required');
      return;
    }

    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final repo = ref.read(epicsRepositoryProvider);
      final dateFormat = DateFormat('yyyy-MM-dd');
      if (widget.isEdit) {
        await repo.updateEpic(
          organizationId: widget.organizationId,
          epicId: widget.epic!.id,
          title: title,
          description: _descriptionController.text,
          clearDescription: _descriptionController.text.trim().isEmpty,
          color: _color,
          status: _status,
          startDate: _startDate == null ? null : dateFormat.format(_startDate!),
          clearStartDate: _startDate == null,
          dueDate: _dueDate == null ? null : dateFormat.format(_dueDate!),
          clearDueDate: _dueDate == null,
        );
      } else {
        await repo.createEpic(
          organizationId: widget.organizationId,
          projectId: widget.projectId,
          title: title,
          description: _descriptionController.text,
          color: _color,
          status: _status,
          startDate: _startDate == null ? null : dateFormat.format(_startDate!),
          dueDate: _dueDate == null ? null : dateFormat.format(_dueDate!),
        );
      }
      widget.onSaved();
      if (mounted) Navigator.of(context).pop();
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final surface = isDark ? const Color(0xFF1E293B) : AppColors.surface;
    final dateFormat = DateFormat('d MMM yyyy');

    return Material(
      color: surface,
      borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
      child: Padding(
        padding: EdgeInsets.only(
          left: AppSpacing.md,
          right: AppSpacing.md,
          top: AppSpacing.sm,
          bottom: MediaQuery.viewInsetsOf(context).bottom + AppSpacing.md,
        ),
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: AppSpacing.md),
                  decoration: BoxDecoration(
                    color: AppColors.border,
                    borderRadius: BorderRadius.circular(999),
                  ),
                ),
              ),
              Text(
                widget.isEdit ? 'Edit epic' : 'New epic',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: AppSpacing.lg),
              _SectionLabel('TITLE'),
              const SizedBox(height: AppSpacing.xs),
              TextField(
                controller: _titleController,
                decoration: const InputDecoration(hintText: 'Epic title'),
              ),
              const SizedBox(height: AppSpacing.lg),
              _SectionLabel('DESCRIPTION'),
              const SizedBox(height: AppSpacing.xs),
              TextField(
                controller: _descriptionController,
                minLines: 2,
                maxLines: 4,
                decoration: const InputDecoration(hintText: 'Optional'),
              ),
              const SizedBox(height: AppSpacing.lg),
              _SectionLabel('STATUS'),
              const SizedBox(height: AppSpacing.xs),
              Wrap(
                spacing: AppSpacing.xs,
                children: kEpicStatusLabels.entries.map((entry) {
                  final selected = _status == entry.key;
                  return ChoiceChip(
                    label: Text(entry.value),
                    selected: selected,
                    onSelected: (_) => setState(() => _status = entry.key),
                  );
                }).toList(),
              ),
              const SizedBox(height: AppSpacing.lg),
              _SectionLabel('COLOR'),
              const SizedBox(height: AppSpacing.xs),
              Wrap(
                spacing: AppSpacing.xs,
                children: kEpicColors.map((option) {
                  final selected = _color == option.hex;
                  return InkWell(
                    onTap: () => setState(() => _color = option.hex),
                    borderRadius: BorderRadius.circular(999),
                    child: Container(
                      width: 32,
                      height: 32,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: option.color,
                        border: selected
                            ? Border.all(color: AppColors.textPrimary, width: 2)
                            : null,
                      ),
                      child: selected
                          ? const Icon(Icons.check, size: 16, color: Colors.white)
                          : null,
                    ),
                  );
                }).toList(),
              ),
              const SizedBox(height: AppSpacing.lg),
              Row(
                children: [
                  Expanded(
                    child: _DateField(
                      label: 'START DATE',
                      value: _startDate == null ? null : dateFormat.format(_startDate!),
                      onTap: () => _pickDate(isStart: true),
                      onClear: _startDate == null ? null : () => setState(() => _startDate = null),
                    ),
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(
                    child: _DateField(
                      label: 'DUE DATE',
                      value: _dueDate == null ? null : dateFormat.format(_dueDate!),
                      onTap: () => _pickDate(isStart: false),
                      onClear: _dueDate == null ? null : () => setState(() => _dueDate = null),
                    ),
                  ),
                ],
              ),
              if (_error != null) ...[
                const SizedBox(height: AppSpacing.sm),
                Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
              ],
              const SizedBox(height: AppSpacing.lg),
              PrimaryButton(
                label: widget.isEdit ? 'Save changes' : 'Create epic',
                loading: _loading,
                onPressed: _loading ? null : _submit,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SectionLabel extends StatelessWidget {
  const _SectionLabel(this.text);

  final String text;

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: Theme.of(context).textTheme.labelSmall?.copyWith(
            color: AppColors.textMuted,
            letterSpacing: 0.8,
            fontWeight: FontWeight.w600,
          ),
    );
  }
}

class _DateField extends StatelessWidget {
  const _DateField({
    required this.label,
    required this.value,
    required this.onTap,
    this.onClear,
  });

  final String label;
  final String? value;
  final VoidCallback onTap;
  final VoidCallback? onClear;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _SectionLabel(label),
        const SizedBox(height: AppSpacing.xs),
        InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(10),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm, vertical: 12),
            decoration: BoxDecoration(
              border: Border.all(color: AppColors.border),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    value ?? 'Not set',
                    style: TextStyle(
                      color: value == null ? AppColors.textMuted : AppColors.textPrimary,
                    ),
                  ),
                ),
                if (onClear != null)
                  InkWell(
                    onTap: onClear,
                    child: const Icon(Icons.close, size: 16, color: AppColors.textMuted),
                  ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

Future<void> showCreateEditEpicSheet({
  required BuildContext context,
  required String organizationId,
  required String projectId,
  required VoidCallback onSaved,
  Epic? epic,
}) async {
  await showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    backgroundColor: Colors.transparent,
    builder: (_) {
      return CreateEditEpicSheet(
        organizationId: organizationId,
        projectId: projectId,
        epic: epic,
        onSaved: onSaved,
      );
    },
  );
}

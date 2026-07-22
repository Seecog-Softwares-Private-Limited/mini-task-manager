import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../core/api/api_exception.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/utils/client_id.dart';
import '../../data/models/project_member.dart';
import '../../data/models/recurring.dart';
import '../../data/models/task.dart';
import '../../shared/widgets/app_widgets.dart';
import '../auth/session_controller.dart';
import '../kanban/assignee_picker_sheet.dart';
import '../kanban/kanban_providers.dart';
import '../kanban/new_subtask_composer.dart';
import '../kanban/subtask_compact_row.dart';
import '../kanban/subtask_detail_panel.dart';
import '../projects/projects_providers.dart';
import 'recurring_actions.dart';
import 'recurring_providers.dart';

const _frequencies = <String, String>{
  'DAILY': 'Daily',
  'WEEKLY': 'Weekly',
  'MONTHLY': 'Monthly',
  'YEARLY': 'Yearly',
};

const _priorities = <String, String>{
  'LOW': 'Low',
  'MEDIUM': 'Medium',
  'HIGH': 'High',
  'CRITICAL': 'Critical',
};

// 0=Sun ... 6=Sat (matches backend weeklyDays convention).
const _weekdayLabels = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const _weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

class RecurringEditorSheet extends ConsumerStatefulWidget {
  const RecurringEditorSheet({
    super.key,
    required this.organizationId,
    required this.projectId,
    this.template,
  });

  final String organizationId;
  final String projectId;

  /// When provided, the sheet edits an existing series; otherwise it creates.
  final RecurringTemplate? template;

  @override
  ConsumerState<RecurringEditorSheet> createState() =>
      _RecurringEditorSheetState();
}

class _RecurringEditorSheetState extends ConsumerState<RecurringEditorSheet> {
  late final TextEditingController _titleController;
  late final TextEditingController _intervalController;
  late final TextEditingController _occurrencesController;
  late final TextEditingController _descriptionController;

  String _frequency = 'WEEKLY';
  String _priority = 'MEDIUM';
  final Set<int> _weeklyDays = {};
  DateTime _startDate = DateTime.now();
  String _endType = 'NEVER';
  DateTime? _endDate;
  TimeOfDay? _dueTime;

  final List<TaskSubtask> _checklist = [];
  int? _expandedSubtaskIndex;
  List<ProjectMember> _members = const [];
  List<String> _assigneeIds = [];

  bool _loading = false;
  String? _error;

  bool get _isEdit => widget.template != null;

  @override
  void initState() {
    super.initState();
    final t = widget.template;
    _titleController = TextEditingController(text: t?.title ?? '');
    _intervalController =
        TextEditingController(text: (t?.interval ?? 1).toString());
    _occurrencesController = TextEditingController(
      text: (t?.endAfterOccurrences ?? 10).toString(),
    );
    _descriptionController = TextEditingController(text: t?.description ?? '');
    if (t != null) {
      _frequency =
          _frequencies.containsKey(t.repeatType) ? t.repeatType : 'WEEKLY';
      _priority =
          _priorities.containsKey(t.priority) ? t.priority! : 'MEDIUM';
      _assigneeIds = List<String>.from(t.assigneeIds);
      _weeklyDays.addAll(t.weeklyDays);
      _startDate = DateTime.tryParse(t.startDueDate ?? '') ?? DateTime.now();
      _endType = t.endType ?? 'NEVER';
      _endDate = DateTime.tryParse(t.endDate ?? '');
      final rawTime = t.rawRuleConfig?['dueTime']?.toString().trim();
      if (rawTime != null && rawTime.isNotEmpty) {
        final parts = rawTime.split(':');
        final hour = int.tryParse(parts[0]);
        final minute =
            parts.length > 1 ? int.tryParse(parts[1]) : 0;
        if (hour != null &&
            hour >= 0 &&
            hour <= 23 &&
            minute != null &&
            minute >= 0 &&
            minute <= 59) {
          _dueTime = TimeOfDay(hour: hour, minute: minute);
        }
      }
      for (final item in t.templateSubtasks) {
        final title = item.title.trim();
        if (title.isEmpty) continue;
        _checklist.add(
          TaskSubtask(
            id: (item.id != null && item.id!.isNotEmpty)
                ? item.id!
                : generateClientId(),
            title: title,
            completed: false,
            status: 'TODO',
            priority: item.priority ?? 'MEDIUM',
            description: item.description,
            dueTime: item.dueTime,
            assigneeIds: item.assigneeIds,
            assigneeId: item.assigneeId ??
                (item.assigneeIds.isNotEmpty ? item.assigneeIds.first : null),
          ),
        );
      }
    }
    if (_weeklyDays.isEmpty) {
      _weeklyDays.add(DateTime.now().weekday % 7);
    }
    _endDate ??= DateTime.now().add(const Duration(days: 90));
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadMembers();
      if (_isEdit && _checklist.isEmpty) {
        _hydrateChecklistFromRun();
      }
    });
  }

  Future<void> _hydrateChecklistFromRun() async {
    try {
      final repo = ref.read(recurringRepositoryProvider);
      final history = await repo.fetchTemplateHistory(
        templateId: widget.template!.id,
        organizationId: widget.organizationId,
      );
      final withTask = history
          .where((o) => o.taskId != null && o.taskId!.isNotEmpty)
          .toList()
        ..sort((a, b) => a.sequenceNumber.compareTo(b.sequenceNumber));
      if (withTask.isEmpty) return;
      final task = await ref
          .read(tasksRepositoryProvider)
          .fetchTask(withTask.first.taskId!);
      if (!mounted || _checklist.isNotEmpty || task.subtasks.isEmpty) return;
      setState(() {
        for (final item in task.subtasks) {
          final title = item.title.trim();
          if (title.isEmpty) continue;
          _checklist.add(
            TaskSubtask(
              id: item.id.isNotEmpty ? item.id : generateClientId(),
              title: title,
              completed: false,
              status: 'TODO',
              priority: item.priority ?? 'MEDIUM',
              description: item.description,
              dueTime: item.dueTime,
              assigneeIds: item.assigneeIds.isNotEmpty
                  ? item.assigneeIds
                  : (item.assigneeId != null && item.assigneeId!.isNotEmpty
                      ? [item.assigneeId!]
                      : const []),
              assigneeId: item.assigneeId,
            ),
          );
        }
      });
    } catch (_) {
      // Optional hydration — ignore failures.
    }
  }

  Future<void> _loadMembers() async {
    try {
      final members = await ref.read(projectsRepositoryProvider).fetchProjectMembers(
            projectId: widget.projectId,
            organizationId: widget.organizationId,
          );
      if (mounted) setState(() => _members = members);
    } catch (_) {
      // Assignee is optional; ignore load failures.
    }
  }

  @override
  void dispose() {
    _titleController.dispose();
    _intervalController.dispose();
    _occurrencesController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  String _ymd(DateTime d) => DateFormat('yyyy-MM-dd').format(d);

  int get _interval {
    final n = int.tryParse(_intervalController.text.trim()) ?? 1;
    return n < 1 ? 1 : n;
  }

  Map<String, dynamic> _buildRecurrence() {
    // Preserve advanced settings from the original rule when editing.
    final base = _isEdit
        ? Map<String, dynamic>.from(widget.template!.rawRuleConfig ?? const {})
        : <String, dynamic>{};
    base['repeat'] = _frequency;
    base['interval'] = _interval;
    if (_frequency == 'WEEKLY') {
      base['weeklyDays'] = _weeklyDays.toList()..sort();
    }
    base['endType'] = _endType;
    if (_endType == 'ON_DATE' && _endDate != null) {
      base['endDate'] = _ymd(_endDate!);
    } else {
      base.remove('endDate');
    }
    if (_endType == 'AFTER_OCCURRENCES') {
      base['endAfterOccurrences'] =
          int.tryParse(_occurrencesController.text.trim()) ?? 1;
    } else {
      base.remove('endAfterOccurrences');
    }
    if (_dueTime != null) {
      final h = _dueTime!.hour.toString().padLeft(2, '0');
      final m = _dueTime!.minute.toString().padLeft(2, '0');
      base['dueTime'] = '$h:$m';
      base['dueLogic'] = 'DUE_TIME';
    } else {
      base.remove('dueTime');
      if (base['dueLogic'] == 'DUE_TIME') {
        base['dueLogic'] = 'DUE_DATE';
      }
    }
    return base;
  }

  List<Map<String, dynamic>> _buildSubtasks() {
    final result = <Map<String, dynamic>>[];
    for (final item in _checklist) {
      final title = item.title.trim();
      if (title.isEmpty) continue;
      final assigneeIds = item.assigneeIds.isNotEmpty
          ? item.assigneeIds
          : (item.assigneeId != null && item.assigneeId!.isNotEmpty
              ? [item.assigneeId!]
              : <String>[]);
      result.add({
        'id': item.id,
        'title': title,
        'completed': false,
        'status': 'TODO',
        'priority': item.priority ?? 'MEDIUM',
        if (item.description != null && item.description!.trim().isNotEmpty)
          'description': item.description,
        if (assigneeIds.isNotEmpty) 'assigneeIds': assigneeIds,
        if (assigneeIds.isNotEmpty) 'assigneeId': assigneeIds.first,
        if (item.dueTime != null && item.dueTime!.trim().isNotEmpty)
          'dueTime': item.dueTime,
      });
    }
    return result;
  }

  Future<void> _appendChecklistItem(String rawTitle) async {
    final title = rawTitle.trim();
    if (title.isEmpty || title.length > subtaskTitleMaxLength || _loading) {
      return;
    }
    setState(() {
      _checklist.insert(
        0,
        TaskSubtask(
          id: generateClientId(),
          title: title,
          completed: false,
          status: 'TODO',
          priority: 'MEDIUM',
        ),
      );
      _expandedSubtaskIndex = 0;
    });
  }

  void _toggleChecklistExpanded(int index) {
    setState(() {
      _expandedSubtaskIndex =
          _expandedSubtaskIndex == index ? null : index;
    });
  }

  void _saveChecklistItem(int index, TaskSubtask updated) {
    setState(() {
      _checklist[index] = updated;
      _expandedSubtaskIndex = null;
    });
  }

  void _deleteChecklistItem(int index) {
    setState(() {
      _checklist.removeAt(index);
      if (_expandedSubtaskIndex == index) {
        _expandedSubtaskIndex = null;
      } else if (_expandedSubtaskIndex != null &&
          _expandedSubtaskIndex! > index) {
        _expandedSubtaskIndex = _expandedSubtaskIndex! - 1;
      }
    });
  }

  void _quickUpdateChecklistAssignees(int index, List<String> assigneeIds) {
    final item = _checklist[index];
    setState(() {
      _checklist[index] = item.copyWith(
        assigneeIds: assigneeIds,
        assigneeId: assigneeIds.isNotEmpty ? assigneeIds.first : null,
      );
    });
  }

  Future<void> _submit() async {
    final title = _titleController.text.trim();
    if (title.isEmpty) {
      setState(() => _error = 'Title is required');
      return;
    }
    if (_frequency == 'WEEKLY' && _weeklyDays.isEmpty) {
      setState(() => _error = 'Pick at least one weekday');
      return;
    }
    if (_endType == 'ON_DATE' &&
        _endDate != null &&
        !_endDate!.isAfter(_startDate)) {
      setState(() => _error = 'End date must be after the start date');
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    final repo = ref.read(recurringRepositoryProvider);
    try {
      if (_isEdit) {
        await repo.updateTemplate(
          templateId: widget.template!.id,
          organizationId: widget.organizationId,
          title: title,
          description: _descriptionController.text,
          priority: _priority,
          assigneeIds: _assigneeIds,
          recurrence: _buildRecurrence(),
          subtasks: _buildSubtasks(),
        );
      } else {
        await repo.createRecurringSeries(
          organizationId: widget.organizationId,
          projectId: widget.projectId,
          title: title,
          startDueDate: _ymd(_startDate),
          recurrence: _buildRecurrence(),
          priority: _priority,
          description: _descriptionController.text,
          assigneeIds: _assigneeIds,
          subtasks: _buildSubtasks(),
        );
      }
      invalidateRecurringData(ref);
      if (mounted) Navigator.of(context).pop(true);
    } on ApiException catch (e) {
      if (mounted) {
        setState(() {
          _error = e.message;
          _loading = false;
        });
      }
    }
  }

  Future<void> _pickStartDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _startDate,
      firstDate: DateTime.now().subtract(const Duration(days: 365)),
      lastDate: DateTime.now().add(const Duration(days: 365 * 5)),
    );
    if (picked != null) setState(() => _startDate = picked);
  }

  Future<void> _pickEndDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _endDate ?? DateTime.now(),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365 * 10)),
    );
    if (picked != null) setState(() => _endDate = picked);
  }

  Future<void> _pickDueTime() async {
    final picked = await showTimePicker(
      context: context,
      initialTime: _dueTime ?? const TimeOfDay(hour: 9, minute: 0),
    );
    if (picked != null) setState(() => _dueTime = picked);
  }

  void _openAssignees() {
    showAssigneePickerSheet(
      context: context,
      members: _members,
      selectedAssigneeIds: _assigneeIds,
      sessionUser: ref.read(sessionControllerProvider).user,
      title: 'Assign members',
      onSelectionChanged: (ids) => setState(() => _assigneeIds = ids),
    );
  }

  /// Next occurrence dates from the current config, for the preview card.
  List<DateTime> _previewRuns({int count = 3}) {
    final runs = <DateTime>[];
    var cursor = DateTime(_startDate.year, _startDate.month, _startDate.day);
    final end = _endType == 'ON_DATE' ? _endDate : null;
    var guard = 0;
    while (runs.length < count && guard < 500) {
      guard++;
      var matches = true;
      if (_frequency == 'WEEKLY' && _weeklyDays.isNotEmpty) {
        matches = _weeklyDays.contains(cursor.weekday % 7);
      }
      if (matches && !cursor.isBefore(_startDate)) {
        if (end != null && cursor.isAfter(end)) break;
        runs.add(cursor);
      }
      cursor = _stepPreview(cursor);
    }
    return runs;
  }

  DateTime _stepPreview(DateTime from) {
    switch (_frequency) {
      case 'DAILY':
        return from.add(Duration(days: _interval));
      case 'WEEKLY':
        // Step day-by-day so weeklyDays filtering can catch each matching day.
        return from.add(const Duration(days: 1));
      case 'MONTHLY':
        return DateTime(from.year, from.month + _interval, from.day);
      case 'YEARLY':
        return DateTime(from.year + _interval, from.month, from.day);
      default:
        return from.add(const Duration(days: 1));
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final surface = isDark ? const Color(0xFF1E293B) : AppColors.surface;
    final labelStyle = Theme.of(context).textTheme.labelLarge?.copyWith(
          fontWeight: FontWeight.w600,
        );

    return Material(
      color: surface,
      borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
      child: Padding(
        padding: EdgeInsets.only(
          left: AppSpacing.md,
          right: AppSpacing.md,
          top: AppSpacing.sm,
          bottom: MediaQuery.of(context).viewInsets.bottom + AppSpacing.md,
        ),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: AppSpacing.sm),
                  decoration: BoxDecoration(
                    color: AppColors.border,
                    borderRadius: BorderRadius.circular(999),
                  ),
                ),
              ),
              Row(
                children: [
                  Expanded(
                    child: Text(
                      _isEdit ? 'Edit planner' : 'New recurring series',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.w700,
                          ),
                    ),
                  ),
                  IconButton(
                    onPressed:
                        _loading ? null : () => Navigator.of(context).pop(),
                    icon: const Icon(Icons.close_rounded),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.sm),
              Text('Title', style: labelStyle),
              const SizedBox(height: AppSpacing.xs),
              TextField(
                controller: _titleController,
                autofocus: !_isEdit,
                decoration: const InputDecoration(
                  hintText: 'e.g. Morning workout',
                ),
              ),
              const SizedBox(height: AppSpacing.md),
              Text('Description', style: labelStyle),
              const SizedBox(height: AppSpacing.xs),
              TextField(
                controller: _descriptionController,
                minLines: 2,
                maxLines: 4,
                decoration: const InputDecoration(
                  hintText: 'Optional details for this series',
                  alignLabelWithHint: true,
                ),
              ),
              const SizedBox(height: AppSpacing.md),
              Text('Priority', style: labelStyle),
              const SizedBox(height: AppSpacing.xs),
              Wrap(
                spacing: AppSpacing.xs,
                children: _priorities.entries.map((e) {
                  return ChoiceChip(
                    label: Text(e.value),
                    selected: _priority == e.key,
                    onSelected: _loading
                        ? null
                        : (_) => setState(() => _priority = e.key),
                  );
                }).toList(),
              ),
              const SizedBox(height: AppSpacing.md),
              Text('Repeats', style: labelStyle),
              const SizedBox(height: AppSpacing.xs),
              Wrap(
                spacing: AppSpacing.xs,
                children: _frequencies.entries.map((e) {
                  return ChoiceChip(
                    label: Text(e.value),
                    selected: _frequency == e.key,
                    onSelected: _loading
                        ? null
                        : (_) => setState(() => _frequency = e.key),
                  );
                }).toList(),
              ),
              const SizedBox(height: AppSpacing.md),
              Row(
                children: [
                  Text('Every', style: labelStyle),
                  const SizedBox(width: AppSpacing.sm),
                  SizedBox(
                    width: 72,
                    child: TextField(
                      controller: _intervalController,
                      keyboardType: TextInputType.number,
                      textAlign: TextAlign.center,
                      onChanged: (_) => setState(() {}),
                      decoration: const InputDecoration(isDense: true),
                    ),
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  Text(
                    _intervalUnitLabel(),
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                ],
              ),
              if (_frequency == 'WEEKLY') ...[
                const SizedBox(height: AppSpacing.md),
                Text('On days', style: labelStyle),
                const SizedBox(height: AppSpacing.xs),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: List.generate(7, (i) {
                    final selected = _weeklyDays.contains(i);
                    return Tooltip(
                      message: _weekdayNames[i],
                      child: GestureDetector(
                        onTap: _loading
                            ? null
                            : () => setState(() {
                                  if (selected) {
                                    _weeklyDays.remove(i);
                                  } else {
                                    _weeklyDays.add(i);
                                  }
                                }),
                        child: CircleAvatar(
                          radius: 18,
                          backgroundColor: selected
                              ? AppColors.violet
                              : AppColors.violet.withValues(alpha: 0.08),
                          child: Text(
                            _weekdayLabels[i],
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                              color: selected
                                  ? Colors.white
                                  : AppColors.textMuted,
                            ),
                          ),
                        ),
                      ),
                    );
                  }),
                ),
              ],
              if (!_isEdit) ...[
                const SizedBox(height: AppSpacing.md),
                Text('Starts', style: labelStyle),
                const SizedBox(height: AppSpacing.xs),
                _TapField(
                  icon: Icons.calendar_today_rounded,
                  label: DateFormat('EEE, MMM d, yyyy').format(_startDate),
                  onTap: _loading ? null : _pickStartDate,
                ),
              ],
              const SizedBox(height: AppSpacing.md),
              Text('Due time (optional)', style: labelStyle),
              const SizedBox(height: AppSpacing.xs),
              Row(
                children: [
                  Expanded(
                    child: _TapField(
                      icon: Icons.schedule_rounded,
                      label: _dueTime != null
                          ? _dueTime!.format(context)
                          : 'No specific time',
                      onTap: _loading ? null : _pickDueTime,
                    ),
                  ),
                  if (_dueTime != null)
                    IconButton(
                      tooltip: 'Clear time',
                      onPressed:
                          _loading ? null : () => setState(() => _dueTime = null),
                      icon: const Icon(Icons.clear_rounded),
                    ),
                ],
              ),
              const SizedBox(height: AppSpacing.md),
              Text('Assignees', style: labelStyle),
              const SizedBox(height: AppSpacing.xs),
              _TapField(
                icon: Icons.people_alt_rounded,
                label: _assigneeIds.isEmpty
                    ? 'Unassigned'
                    : '${_assigneeIds.length} assigned',
                onTap: _loading || _members.isEmpty ? null : _openAssignees,
              ),
              const SizedBox(height: AppSpacing.md),
              Row(
                children: [
                  Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      color: AppColors.primary.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(
                      Icons.check_box_outlined,
                      size: 18,
                      color: AppColors.primary,
                    ),
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Checklist',
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                        Text(
                          'Copied into every run · tap to edit',
                          style:
                              Theme.of(context).textTheme.bodySmall?.copyWith(
                                    color: AppColors.textMuted,
                                  ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.md),
              NewSubtaskComposer(
                enabled: !_loading,
                onSubmit: _appendChecklistItem,
              ),
              const SizedBox(height: AppSpacing.sm),
              if (_checklist.isEmpty)
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(AppSpacing.md),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: AppColors.border.withValues(alpha: 0.8),
                    ),
                  ),
                  child: Text(
                    'Break the planner into checklist steps. Each item can have its own owners and due time.',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: AppColors.textMuted,
                        ),
                  ),
                ),
              ...List.generate(_checklist.length, (index) {
                final item = _checklist[index];
                final expanded = _expandedSubtaskIndex == index;
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    SubtaskCompactRow(
                      subtask: item,
                      members: _members,
                      expanded: expanded,
                      enabled: !_loading,
                      canComplete: false,
                      onToggleComplete: (_) {},
                      onExpand: () {
                        FocusManager.instance.primaryFocus?.unfocus();
                        _toggleChecklistExpanded(index);
                      },
                      onAssigneesChanged: (ids) =>
                          _quickUpdateChecklistAssignees(index, ids),
                    ),
                    if (expanded)
                      Padding(
                        padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                        child: Material(
                          color: AppColors.surface,
                          elevation: 1,
                          shadowColor: Colors.black.withValues(alpha: 0.06),
                          borderRadius: BorderRadius.circular(12),
                          child: Padding(
                            padding: const EdgeInsets.all(AppSpacing.sm),
                            child: SubtaskDetailPanel(
                              subtask: item,
                              members: _members,
                              taskId: widget.template?.id ?? 'template-draft',
                              organizationId: widget.organizationId,
                              saving: false,
                              canComplete: false,
                              templateMode: true,
                              onRequestCompletion: ({
                                required String subtaskId,
                                required String subtaskTitle,
                                required String? subtaskPriority,
                              }) async =>
                                  null,
                              onCancel: () {
                                setState(() {
                                  if (_checklist[index].title.trim().isEmpty) {
                                    _checklist.removeAt(index);
                                  }
                                  _expandedSubtaskIndex = null;
                                });
                              },
                              onSave: (updated) =>
                                  _saveChecklistItem(index, updated),
                              onDelete: () => _deleteChecklistItem(index),
                            ),
                          ),
                        ),
                      ),
                  ],
                );
              }),
              const SizedBox(height: AppSpacing.md),
              Text('Ends', style: labelStyle),
              const SizedBox(height: AppSpacing.xs),
              Wrap(
                spacing: AppSpacing.xs,
                children: const [
                  _EndChip(value: 'NEVER', label: 'Never'),
                  _EndChip(value: 'ON_DATE', label: 'On date'),
                  _EndChip(value: 'AFTER_OCCURRENCES', label: 'After'),
                ]
                    .map((chip) => ChoiceChip(
                          label: Text(chip.label),
                          selected: _endType == chip.value,
                          onSelected: _loading
                              ? null
                              : (_) => setState(() => _endType = chip.value),
                        ))
                    .toList(),
              ),
              if (_endType == 'ON_DATE') ...[
                const SizedBox(height: AppSpacing.sm),
                _TapField(
                  icon: Icons.event_rounded,
                  label: _endDate != null
                      ? DateFormat('EEE, MMM d, yyyy').format(_endDate!)
                      : 'Pick a date',
                  onTap: _loading ? null : _pickEndDate,
                ),
              ],
              if (_endType == 'AFTER_OCCURRENCES') ...[
                const SizedBox(height: AppSpacing.sm),
                Row(
                  children: [
                    SizedBox(
                      width: 72,
                      child: TextField(
                        controller: _occurrencesController,
                        keyboardType: TextInputType.number,
                        textAlign: TextAlign.center,
                        decoration: const InputDecoration(isDense: true),
                      ),
                    ),
                    const SizedBox(width: AppSpacing.sm),
                    Text(
                      'occurrences',
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                  ],
                ),
              ],
              const SizedBox(height: AppSpacing.md),
              _PreviewCard(runs: _previewRuns()),
              if (_error != null) ...[
                const SizedBox(height: AppSpacing.sm),
                Text(
                  _error!,
                  style: TextStyle(color: Theme.of(context).colorScheme.error),
                ),
              ],
              const SizedBox(height: AppSpacing.lg),
              PrimaryButton(
                label: _isEdit ? 'Save changes' : 'Create series',
                loading: _loading,
                onPressed: _submit,
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _intervalUnitLabel() {
    final plural = _interval > 1;
    switch (_frequency) {
      case 'DAILY':
        return plural ? 'days' : 'day';
      case 'WEEKLY':
        return plural ? 'weeks' : 'week';
      case 'MONTHLY':
        return plural ? 'months' : 'month';
      case 'YEARLY':
        return plural ? 'years' : 'year';
      default:
        return '';
    }
  }
}

class _EndChip {
  const _EndChip({required this.value, required this.label});
  final String value;
  final String label;
}

class _TapField extends StatelessWidget {
  const _TapField({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(12),
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.sm,
          vertical: AppSpacing.sm,
        ),
        decoration: BoxDecoration(
          border: Border.all(color: AppColors.border),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: [
            Icon(icon, size: 18, color: AppColors.textMuted),
            const SizedBox(width: AppSpacing.sm),
            Expanded(
              child: Text(label, style: Theme.of(context).textTheme.bodyMedium),
            ),
            if (onTap != null)
              const Icon(Icons.chevron_right_rounded,
                  size: 18, color: AppColors.textMuted),
          ],
        ),
      ),
    );
  }
}

class _PreviewCard extends StatelessWidget {
  const _PreviewCard({required this.runs});

  final List<DateTime> runs;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.sm),
      decoration: BoxDecoration(
        color: AppColors.violet.withValues(alpha: 0.06),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.violet.withValues(alpha: 0.18)),
      ),
      child: Row(
        children: [
          const Icon(Icons.event_repeat_rounded,
              size: 18, color: AppColors.violet),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Next runs',
                  style: Theme.of(context)
                      .textTheme
                      .labelSmall
                      ?.copyWith(color: AppColors.textMuted),
                ),
                const SizedBox(height: 2),
                Text(
                  runs.isEmpty
                      ? 'No runs match this schedule'
                      : runs
                          .map((d) => DateFormat('EEE, MMM d').format(d))
                          .join('  ·  '),
                  style: Theme.of(context)
                      .textTheme
                      .bodySmall
                      ?.copyWith(fontWeight: FontWeight.w600),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Opens the create/edit sheet. Returns true when a mutation succeeded.
Future<bool> showRecurringEditorSheet({
  required BuildContext context,
  required String organizationId,
  required String projectId,
  RecurringTemplate? template,
}) async {
  final result = await showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    backgroundColor: Colors.transparent,
    builder: (_) {
      final height = MediaQuery.of(context).size.height * 0.9;
      return SizedBox(
        height: height,
        child: RecurringEditorSheet(
          organizationId: organizationId,
          projectId: projectId,
          template: template,
        ),
      );
    },
  );
  return result == true;
}

import '../../data/models/task.dart';

bool isRecurringTask(Task task) {
  final templateId = task.recurringTemplateId;
  if (templateId != null && templateId.isNotEmpty) {
    return true;
  }
  final type = task.recurrenceType?.toUpperCase();
  return type != null && type.isNotEmpty && type != 'NONE';
}

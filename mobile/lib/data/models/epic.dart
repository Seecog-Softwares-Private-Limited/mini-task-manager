class Epic {
  const Epic({
    required this.id,
    required this.organizationId,
    required this.projectId,
    required this.title,
    required this.status,
    required this.taskCount,
    required this.completedTaskCount,
    required this.createdBy,
    required this.createdAt,
    required this.updatedAt,
    this.description,
    this.color,
    this.startDate,
    this.dueDate,
  });

  final String id;
  final String organizationId;
  final String projectId;
  final String title;
  final String? description;
  final String? color;
  final String status;
  final String? startDate;
  final String? dueDate;
  final int taskCount;
  final int completedTaskCount;
  final String createdBy;
  final String createdAt;
  final String updatedAt;

  double get progress => taskCount == 0 ? 0 : completedTaskCount / taskCount;

  factory Epic.fromJson(Map<String, dynamic> json) {
    return Epic(
      id: _asString(json['id']),
      organizationId: _asString(json['organizationId']),
      projectId: _asString(json['projectId']),
      title: _asString(json['title']),
      description: _nullableString(json['description']),
      color: _nullableString(json['color']),
      status: _asString(json['status'], fallback: 'TODO'),
      startDate: _nullableString(json['startDate']),
      dueDate: _nullableString(json['dueDate']),
      taskCount: _nullableInt(json['taskCount']) ?? 0,
      completedTaskCount: _nullableInt(json['completedTaskCount']) ?? 0,
      createdBy: _asString(json['createdBy']),
      createdAt: _asString(json['createdAt']),
      updatedAt: _asString(json['updatedAt']),
    );
  }
}

String _asString(dynamic value, {String fallback = ''}) {
  if (value == null) return fallback;
  return value.toString();
}

String? _nullableString(dynamic value) {
  if (value == null) return null;
  final text = value.toString().trim();
  return text.isEmpty ? null : text;
}

int? _nullableInt(dynamic value) {
  if (value == null) return null;
  if (value is int) return value;
  return int.tryParse(value.toString());
}

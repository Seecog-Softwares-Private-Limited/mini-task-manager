class Workflow {
  const Workflow({
    required this.id,
    required this.projectId,
    required this.name,
    required this.isDefault,
  });

  final String id;
  final String projectId;
  final String name;
  final bool isDefault;

  factory Workflow.fromJson(Map<String, dynamic> json) {
    return Workflow(
      id: json['id'] as String,
      projectId: json['projectId'] as String,
      name: json['name'] as String,
      isDefault: json['isDefault'] as bool? ?? false,
    );
  }
}

class WorkflowStatus {
  const WorkflowStatus({
    required this.id,
    required this.workflowId,
    required this.name,
    required this.position,
    required this.type,
    this.color,
  });

  final String id;
  final String workflowId;
  final String name;
  final int position;
  final String type;
  final String? color;

  factory WorkflowStatus.fromJson(Map<String, dynamic> json) {
    return WorkflowStatus(
      id: json['id'] as String,
      workflowId: json['workflowId'] as String,
      name: json['name'] as String,
      position: json['position'] as int? ?? 0,
      type: json['type'] as String? ?? 'todo',
      color: json['color'] as String?,
    );
  }
}

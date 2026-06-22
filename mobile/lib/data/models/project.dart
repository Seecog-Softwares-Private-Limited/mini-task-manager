import 'package:equatable/equatable.dart';

class Project extends Equatable {
  const Project({
    required this.id,
    required this.organizationId,
    required this.name,
    required this.visibility,
    required this.isArchived,
    required this.createdBy,
    this.description,
    this.iconUrl,
    this.createdAt,
    this.updatedAt,
  });

  final String id;
  final String organizationId;
  final String name;
  final String? description;
  final String? iconUrl;
  final String visibility;
  final bool isArchived;
  final String createdBy;
  final String? createdAt;
  final String? updatedAt;

  factory Project.fromJson(Map<String, dynamic> json) {
    return Project(
      id: json['id'] as String,
      organizationId: json['organizationId'] as String,
      name: json['name'] as String,
      description: json['description'] as String?,
      iconUrl: json['iconUrl'] as String?,
      visibility: json['visibility'] as String? ?? 'private',
      isArchived: json['isArchived'] as bool? ?? false,
      createdBy: json['createdBy'] as String,
      createdAt: json['createdAt'] as String?,
      updatedAt: json['updatedAt'] as String?,
    );
  }

  @override
  List<Object?> get props => [
        id,
        organizationId,
        name,
        description,
        iconUrl,
        visibility,
        isArchived,
        createdBy,
        createdAt,
        updatedAt,
      ];
}

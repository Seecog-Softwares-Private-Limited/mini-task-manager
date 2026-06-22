import 'package:equatable/equatable.dart';

class Organization extends Equatable {
  const Organization({
    required this.id,
    required this.name,
    required this.slug,
    required this.ownerId,
    this.logoUrl,
    this.myRole,
    this.isArchived = false,
  });

  final String id;
  final String name;
  final String slug;
  final String ownerId;
  final String? logoUrl;
  final String? myRole;
  final bool isArchived;

  factory Organization.fromJson(Map<String, dynamic> json) {
    return Organization(
      id: json['id'] as String,
      name: json['name'] as String,
      slug: json['slug'] as String,
      ownerId: json['ownerId'] as String,
      logoUrl: json['logoUrl'] as String?,
      myRole: json['myRole'] as String?,
      isArchived: json['isArchived'] as bool? ?? false,
    );
  }

  @override
  List<Object?> get props => [id, name, slug, ownerId, logoUrl, myRole, isArchived];
}

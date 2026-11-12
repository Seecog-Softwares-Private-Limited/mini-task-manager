import 'package:equatable/equatable.dart';

/// An industry edition offered at workspace-creation time (see
/// `GET /organizations/industries`). Only relabels the picker itself —
/// the backend's per-industry `words` are not used anywhere on mobile yet.
class IndustryOption extends Equatable {
  const IndustryOption({
    required this.key,
    required this.label,
    required this.description,
  });

  final String key;
  final String label;
  final String description;

  factory IndustryOption.fromJson(Map<String, dynamic> json) {
    return IndustryOption(
      key: json['key'] as String,
      label: json['label'] as String? ?? '',
      description: json['description'] as String? ?? '',
    );
  }

  @override
  List<Object?> get props => [key, label, description];
}

class PaginatedMeta {
  const PaginatedMeta({
    required this.total,
    required this.page,
    required this.limit,
    required this.totalPages,
    required this.hasNext,
    required this.hasPrev,
  });

  final int total;
  final int page;
  final int limit;
  final int totalPages;
  final bool hasNext;
  final bool hasPrev;

  factory PaginatedMeta.fromJson(Map<String, dynamic> json) {
    return PaginatedMeta(
      total: json['total'] as int? ?? 0,
      page: json['page'] as int? ?? 1,
      limit: json['limit'] as int? ?? 20,
      totalPages: json['totalPages'] as int? ?? 1,
      hasNext: json['hasNext'] as bool? ?? false,
      hasPrev: json['hasPrev'] as bool? ?? false,
    );
  }
}

class PaginatedResult<T> {
  const PaginatedResult({required this.data, required this.meta});

  final List<T> data;
  final PaginatedMeta meta;
}

String nameToSlug(String name) {
  return name
      .trim()
      .toLowerCase()
      .replaceAll(RegExp(r'[^a-z0-9\s-]'), '')
      .replaceAll(RegExp(r'\s+'), '-')
      .replaceAll(RegExp(r'-+'), '-')
      .replaceAll(RegExp(r'^-|-$'), '');
}

bool isValidSlug(String slug) {
  return slug.isNotEmpty && RegExp(r'^[a-z0-9-]+$').hasMatch(slug);
}

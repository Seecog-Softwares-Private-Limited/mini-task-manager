/// Calendar due dates (MySQL DATE / YYYY-MM-DD) — not timezone instants.
DateTime? parseCalendarDate(String? raw) {
  if (raw == null) return null;
  final text = raw.trim();
  if (text.isEmpty) return null;

  final match = RegExp(r'^(\d{4})-(\d{2})-(\d{2})').firstMatch(text);
  if (match != null) {
    final hasZone =
        text.contains(RegExp(r'[zZ]')) || RegExp(r'[+-]\d{2}:?\d{2}$').hasMatch(text);
    if (!hasZone) {
      final year = int.tryParse(match.group(1)!);
      final month = int.tryParse(match.group(2)!);
      final day = int.tryParse(match.group(3)!);
      if (year == null || month == null || day == null) return null;
      return DateTime(year, month, day);
    }
  }

  final parsed = DateTime.tryParse(text);
  if (parsed == null) return null;
  final local = parsed.toLocal();
  return DateTime(local.year, local.month, local.day);
}

/// Normalize API dueDate values to YYYY-MM-DD for stable comparisons.
String? calendarDateString(dynamic value) {
  if (value == null) return null;
  final text =
      value is DateTime ? value.toIso8601String() : value.toString().trim();
  if (text.isEmpty) return null;
  final parsed = parseCalendarDate(text);
  if (parsed == null) return null;
  final y = parsed.year.toString().padLeft(4, '0');
  final m = parsed.month.toString().padLeft(2, '0');
  final d = parsed.day.toString().padLeft(2, '0');
  return '$y-$m-$d';
}

bool isCalendarDateBeforeToday(String? raw) {
  final due = parseCalendarDate(raw);
  if (due == null) return false;
  final now = DateTime.now();
  final today = DateTime(now.year, now.month, now.day);
  return due.isBefore(today);
}

bool isCalendarDateToday(String? raw) {
  final due = parseCalendarDate(raw);
  if (due == null) return false;
  final now = DateTime.now();
  final today = DateTime(now.year, now.month, now.day);
  return due == today;
}

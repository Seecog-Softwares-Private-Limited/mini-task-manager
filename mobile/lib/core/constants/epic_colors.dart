import 'package:flutter/material.dart';

/// Epic color swatch palette — matches web's `EPIC_COLORS`
/// (frontend/src/lib/epic-badges.ts) so epics look the same on both platforms.
class EpicColorOption {
  const EpicColorOption(this.hex, this.label);

  final String hex;
  final String label;

  Color get color => Color(int.parse('FF${hex.replaceAll('#', '')}', radix: 16));
}

const kEpicColors = [
  EpicColorOption('#7c3aed', 'Violet'),
  EpicColorOption('#0ea5e9', 'Sky'),
  EpicColorOption('#f59e0b', 'Amber'),
  EpicColorOption('#16a34a', 'Green'),
  EpicColorOption('#dc2626', 'Red'),
  EpicColorOption('#64748b', 'Slate'),
];

Color parseEpicColor(String? hex) {
  if (hex == null || hex.isEmpty) return kEpicColors.first.color;
  var value = hex.replaceAll('#', '');
  if (value.length == 6) value = 'FF$value';
  final parsed = int.tryParse(value, radix: 16);
  return parsed == null ? kEpicColors.first.color : Color(parsed);
}

const kEpicStatusLabels = {
  'TODO': 'Not started',
  'IN_PROGRESS': 'In progress',
  'DONE': 'Done',
};

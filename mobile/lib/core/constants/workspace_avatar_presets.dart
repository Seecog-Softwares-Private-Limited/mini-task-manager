import 'package:flutter/material.dart';

class WorkspaceAvatarPreset {
  const WorkspaceAvatarPreset({
    required this.id,
    required this.label,
    required this.dataUrl,
    required this.color1,
    required this.color2,
    required this.emoji,
  });

  final String id;
  final String label;
  final String dataUrl;
  final Color color1;
  final Color color2;
  final String emoji;
}

Color _hex(String value) {
  final hex = value.replaceFirst('#', '');
  return Color(int.parse('FF$hex', radix: 16));
}

String _svgGradientEmoji(String color1, String color2, String emoji) {
  final svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="$color1"/><stop offset="100%" stop-color="$color2"/></linearGradient></defs><rect width="64" height="64" rx="14" fill="url(#g)"/><text x="32" y="40" text-anchor="middle" font-size="30">$emoji</text></svg>';
  return 'data:image/svg+xml;charset=utf-8,${Uri.encodeComponent(svg)}';
}

WorkspaceAvatarPreset _preset({
  required String id,
  required String label,
  required String c1,
  required String c2,
  required String emoji,
}) {
  return WorkspaceAvatarPreset(
    id: id,
    label: label,
    color1: _hex(c1),
    color2: _hex(c2),
    emoji: emoji,
    dataUrl: _svgGradientEmoji(c1, c2, emoji),
  );
}

final List<WorkspaceAvatarPreset> kWorkspaceAvatarPresets = [
  _preset(id: 'violet-office', label: 'Violet office', c1: '#6366f1', c2: '#8b5cf6', emoji: '🏢'),
  _preset(id: 'blue-rocket', label: 'Blue rocket', c1: '#2563eb', c2: '#06b6d4', emoji: '🚀'),
  _preset(id: 'green-nature', label: 'Green nature', c1: '#059669', c2: '#34d399', emoji: '🌿'),
  _preset(id: 'amber-spark', label: 'Amber spark', c1: '#d97706', c2: '#f59e0b', emoji: '✨'),
  _preset(id: 'rose-creative', label: 'Rose creative', c1: '#db2777', c2: '#f472b6', emoji: '🎨'),
  _preset(id: 'slate-target', label: 'Slate target', c1: '#475569', c2: '#64748b', emoji: '🎯'),
  _preset(id: 'indigo-idea', label: 'Indigo idea', c1: '#4f46e5', c2: '#818cf8', emoji: '💡'),
  _preset(id: 'teal-bolt', label: 'Teal bolt', c1: '#0d9488', c2: '#2dd4bf', emoji: '⚡'),
  _preset(id: 'red-chart', label: 'Red chart', c1: '#dc2626', c2: '#f87171', emoji: '📊'),
  _preset(id: 'purple-handshake', label: 'Purple handshake', c1: '#7c3aed', c2: '#a78bfa', emoji: '🤝'),
  _preset(id: 'sky-code', label: 'Sky code', c1: '#0284c7', c2: '#38bdf8', emoji: '💻'),
  _preset(id: 'orange-flame', label: 'Orange flame', c1: '#ea580c', c2: '#fb923c', emoji: '🔥'),
];

WorkspaceAvatarPreset? findPresetByDataUrl(String? dataUrl) {
  if (dataUrl == null || dataUrl.isEmpty) return null;
  for (final preset in kWorkspaceAvatarPresets) {
    if (preset.dataUrl == dataUrl) return preset;
  }
  return null;
}

/// Default logo applied on create and when a workspace has no custom icon.
final WorkspaceAvatarPreset kDefaultWorkspaceAvatar = kWorkspaceAvatarPresets.first;

String resolveWorkspaceLogoUrl(String? logoUrl) {
  final trimmed = logoUrl?.trim();
  if (trimmed == null || trimmed.isEmpty) return kDefaultWorkspaceAvatar.dataUrl;
  return trimmed;
}

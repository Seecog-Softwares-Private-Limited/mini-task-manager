import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../core/api/api_exception.dart';
import '../../core/platform/clipboard_image.dart';
import '../../core/services/device_info_service.dart';
import '../../core/services/geofence_service.dart';
import '../../core/services/location_service.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../data/models/login_response.dart';
import '../../data/models/pending_attachment.dart';
import '../../data/models/subtask_completion_record.dart';
import '../../data/models/task_attachment.dart';
import '../../shared/voice_dictation/voice_note_recorder_sheet.dart';
import '../../shared/widgets/app_widgets.dart';
import 'attachment_file_meta.dart';
import 'attachment_picker_section.dart';
import 'attachment_preview.dart';
import 'voice_note_player.dart';

class SubtaskCompletionResult {
  const SubtaskCompletionResult({
    required this.record,
    required this.attachments,
  });

  final SubtaskCompletionRecord record;
  final List<PendingAttachment> attachments;
}

Future<SubtaskCompletionResult?> showSubtaskCompletionSheet({
  required BuildContext context,
  required String subtaskTitle,
  required String projectId,
  required AuthUser employee,
  required bool requireVideo,
  bool requireLocation = false,
  /// When set, opens in edit mode (notes + attachments) without re-capturing GPS.
  SubtaskCompletionRecord? existingRecord,
  String organizationId = '',
  List<TaskAttachment> existingAttachments = const [],
}) {
  FocusManager.instance.primaryFocus?.unfocus();
  return showModalBottomSheet<SubtaskCompletionResult>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    useRootNavigator: true,
    builder: (context) => _SubtaskCompletionSheet(
      subtaskTitle: subtaskTitle,
      projectId: projectId,
      employee: employee,
      requireVideo: requireVideo,
      requireLocation: requireLocation,
      existingRecord: existingRecord,
      organizationId: organizationId,
      existingAttachments: existingAttachments,
    ),
  );
}

class _SubtaskCompletionSheet extends ConsumerStatefulWidget {
  const _SubtaskCompletionSheet({
    required this.subtaskTitle,
    required this.projectId,
    required this.employee,
    required this.requireVideo,
    required this.requireLocation,
    this.existingRecord,
    this.organizationId = '',
    this.existingAttachments = const [],
  });

  final String subtaskTitle;
  final String projectId;
  final AuthUser employee;
  final bool requireVideo;
  final bool requireLocation;
  final SubtaskCompletionRecord? existingRecord;
  final String organizationId;
  final List<TaskAttachment> existingAttachments;

  @override
  ConsumerState<_SubtaskCompletionSheet> createState() =>
      _SubtaskCompletionSheetState();
}

class _SubtaskCompletionSheetState
    extends ConsumerState<_SubtaskCompletionSheet> {
  final _notesController = TextEditingController();
  final _notesFocus = FocusNode();
  void Function()? _detachPaste;

  bool _loading = true;
  bool _submitting = false;
  String? _error;

  CapturedLocation? _location;
  GeofenceValidation? _geofence;
  Map<String, dynamic>? _deviceInfo;
  late final DateTime _timestamp;

  final List<PendingAttachment> _beforePhotos = [];
  final List<PendingAttachment> _afterPhotos = [];
  final List<PendingAttachment> _voiceNotes = [];
  PendingAttachment? _video;

  /// Existing completion filenames kept/removed in edit mode.
  late List<String> _keptBeforeNames;
  late List<String> _keptAfterNames;
  String? _keptVoiceName;
  String? _keptVideoName;

  bool get _isEdit => widget.existingRecord != null;

  int get _beforeCount => _keptBeforeNames.length + _beforePhotos.length;
  int get _afterCount => _keptAfterNames.length + _afterPhotos.length;
  int get _voiceCount =>
      _voiceNotes.length + (_keptVoiceName != null && _voiceNotes.isEmpty ? 1 : 0);

  @override
  void initState() {
    super.initState();
    final existing = widget.existingRecord;
    _timestamp = existing != null
        ? (DateTime.tryParse(existing.completedAt)?.toUtc() ??
            DateTime.now().toUtc())
        : DateTime.now().toUtc();
    _keptBeforeNames = List<String>.from(existing?.beforePhotoFileNames ?? const []);
    _keptAfterNames = List<String>.from(existing?.afterPhotoFileNames ?? const []);
    _keptVoiceName = existing?.voiceNoteFileName;
    _keptVideoName = existing?.videoFileName;
    if (existing?.notes != null) {
      _notesController.text = existing!.notes!;
    }
    if (ClipboardImagePaste.isSupported) {
      // Modal is on top — accept image paste while this sheet is open so
      // Cmd/Ctrl+V works as After proof without requiring notes focus.
      _detachPaste = ClipboardImagePaste.attach(_onClipboardImagePasted);
    }
    _bootstrap();
  }

  @override
  void dispose() {
    _detachPaste?.call();
    _notesController.dispose();
    _notesFocus.dispose();
    super.dispose();
  }

  void _onClipboardImagePasted(ClipboardImage image) {
    if (!mounted || _loading || _submitting) return;
    final picked = AttachmentPickerUtils.fromClipboardImage(image);
    final renamed = PendingAttachment(
      clientId: picked.clientId,
      fileName: 'after-${picked.fileName}',
      bytes: picked.bytes,
      path: picked.path,
      mimeType: picked.mimeType,
    );
    setState(() {
      _afterPhotos.add(renamed);
      _error = null;
    });
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Screenshot attached as After proof')),
    );
  }

  Future<void> _bootstrap() async {
    // Edit mode keeps the original completion stamp / GPS — only notes & proof change.
    if (_isEdit) {
      final existing = widget.existingRecord!;
      if (!mounted) return;
      setState(() {
        _deviceInfo = existing.deviceInfo.isEmpty
            ? const {'platform': 'unknown'}
            : existing.deviceInfo;
        _loading = false;
      });
      return;
    }

    Map<String, dynamic> deviceInfo = const {'platform': 'unknown'};
    try {
      deviceInfo = await DeviceInfoService.capture();
    } catch (_) {
      // Keep a minimal payload so Complete stays usable.
    }

    CapturedLocation? location;
    GeofenceValidation? geofence;
    String? locationError;

    if (widget.requireLocation) {
      try {
        location = await LocationService.captureCurrent();
        geofence = await GeofenceService.validate(
          projectId: widget.projectId,
          latitude: location.latitude,
          longitude: location.longitude,
        );
        if (!geofence.valid) {
          locationError =
              'You are outside the work site (${geofence.distanceMeters.round()} m away, limit ${geofence.radiusMeters.round()} m).';
        }
      } on LocationCaptureException catch (e) {
        locationError = e.message;
      } catch (e) {
        locationError = 'Could not capture location: $e';
      }
    }

    if (!mounted) return;
    setState(() {
      _deviceInfo = deviceInfo;
      _location = location;
      _geofence = geofence;
      _error = locationError;
      _loading = false;
    });
  }

  bool get _canSubmit {
    if (_loading || _submitting) return false;
    if (_isEdit) return true;
    if (_deviceInfo == null) return false;
    if (widget.requireLocation) {
      if (_location == null || _geofence == null) return false;
      if (!_geofence!.valid) return false;
    }
    if (widget.requireVideo && _video == null) return false;
    return true;
  }

  String? get _submitBlockedReason {
    if (_loading) return 'Still preparing…';
    if (_submitting || _isEdit) return null;
    if (_deviceInfo == null) return 'Device info missing. Close and try again.';
    if (widget.requireLocation) {
      if (_location == null || _geofence == null) {
        return 'Location is required to complete this subtask.';
      }
      if (!_geofence!.valid) {
        return 'Move inside the work site to complete this subtask.';
      }
    }
    if (widget.requireVideo && _video == null) {
      return 'Attach a video to complete this critical subtask.';
    }
    return null;
  }

  Future<void> _pickPhoto({required bool before}) async {
    _notesFocus.unfocus();
    // Multi-select gallery / file picker so several proofs can be added at once.
    final picked = await AttachmentPickerUtils.pickProofImages();
    if (picked.isEmpty) return;
    final prefix = before ? 'before' : 'after';
    final renamed = [
      for (final file in picked)
        PendingAttachment(
          clientId: file.clientId,
          fileName: '$prefix-${file.fileName}',
          bytes: file.bytes,
          path: file.path,
          mimeType: file.mimeType,
        ),
    ];
    setState(() {
      if (before) {
        _beforePhotos.addAll(renamed);
      } else {
        _afterPhotos.addAll(renamed);
      }
    });
  }

  Future<void> _pickVideo() async {
    _notesFocus.unfocus();
    final picked = await AttachmentPickerUtils.captureVideo();
    if (picked == null) return;
    setState(() {
      _video = picked;
      _keptVideoName = null;
    });
  }

  Future<void> _recordVoiceNote() async {
    _notesFocus.unfocus();
    final picked = await showVoiceNoteRecorderSheet(context);
    if (picked == null || !mounted) return;
    final raw = picked.bytes;
    if (raw == null || raw.isEmpty) {
      setState(() => _error = 'Voice note was empty. Please record again.');
      return;
    }
    // Own a stable copy so web blob views cannot clear later.
    final stable = PendingAttachment(
      clientId: picked.clientId,
      fileName: picked.fileName,
      path: picked.path,
      bytes: Uint8List.fromList(raw),
      mimeType: picked.mimeType,
    );
    setState(() {
      _voiceNotes
        ..clear()
        ..add(stable);
      _keptVoiceName = null;
      _error = null;
    });
  }

  void _removeVoiceNote(String clientId) {
    setState(() {
      _voiceNotes.removeWhere((n) => n.clientId == clientId);
    });
  }

  Future<void> _submit() async {
    final blocked = _submitBlockedReason;
    if (blocked != null) {
      setState(() => _error = blocked);
      return;
    }
    if (!_canSubmit) return;
    _notesFocus.unfocus();
    FocusManager.instance.primaryFocus?.unfocus();
    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      final notes = _notesController.text.trim();
      final notesOrNull = notes.isEmpty ? null : notes;
      final beforeNames = [
        ..._keptBeforeNames,
        ..._beforePhotos.map((f) => f.fileName),
      ];
      final afterNames = [
        ..._keptAfterNames,
        ..._afterPhotos.map((f) => f.fileName),
      ];
      final voiceName = _voiceNotes.isNotEmpty
          ? _voiceNotes.first.fileName
          : _keptVoiceName;
      final videoName = _video?.fileName ?? _keptVideoName;

      final SubtaskCompletionRecord record;
      if (_isEdit) {
        record = widget.existingRecord!.copyWith(
          notes: notesOrNull,
          clearNotes: notesOrNull == null,
          beforePhotoFileNames: beforeNames,
          afterPhotoFileNames: afterNames,
          voiceNoteFileName: voiceName,
          clearVoiceNoteFileName: voiceName == null,
          videoFileName: videoName,
          clearVideoFileName: videoName == null,
        );
      } else {
        final location = _location;
        final geofence = _geofence;
        record = SubtaskCompletionRecord(
          completedAt: _timestamp.toIso8601String(),
          employeeId: widget.employee.id,
          employeeName: widget.employee.fullName,
          employeeEmail: widget.employee.email,
          latitude: location?.latitude ?? 0,
          longitude: location?.longitude ?? 0,
          accuracyMeters: location?.accuracyMeters,
          geofenceValid:
              widget.requireLocation ? (geofence?.valid ?? false) : true,
          geofenceDistanceMeters: geofence?.distanceMeters,
          geofenceRadiusMeters: geofence?.radiusMeters,
          geofenceSiteId: widget.requireLocation ? widget.projectId : null,
          deviceInfo: _deviceInfo ?? const {'platform': 'unknown'},
          notes: notesOrNull,
          beforePhotoFileNames: beforeNames,
          afterPhotoFileNames: afterNames,
          voiceNoteFileName: voiceName,
          videoFileName: videoName,
        );
      }

      // Only newly picked files need upload; kept names are already on the server.
      final attachments = <PendingAttachment>[
        ..._beforePhotos,
        ..._afterPhotos,
        ..._voiceNotes,
        if (_video != null) _video!,
      ];

      if (!mounted) return;
      Navigator.of(context).pop(
        SubtaskCompletionResult(record: record, attachments: attachments),
      );
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _submitting = false;
        _error = userFacingError(
          e,
          fallback: _isEdit
              ? 'Could not save completion edits. Please try again.'
              : 'Could not complete this item. Please try again.',
        );
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final timestampLabel = DateFormat('MMM d, yyyy · h:mm a').format(_timestamp.toLocal());
    final bottomInset = MediaQuery.viewInsetsOf(context).bottom;

    return GestureDetector(
      onTap: () => FocusScope.of(context).unfocus(),
      behavior: HitTestBehavior.deferToChild,
      child: Padding(
        padding: EdgeInsets.only(
          left: AppSpacing.md,
          right: AppSpacing.md,
          top: AppSpacing.sm,
          bottom: bottomInset + AppSpacing.lg,
        ),
        child: SingleChildScrollView(
          keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 42,
                  height: 4,
                  decoration: BoxDecoration(
                    color: AppColors.border,
                    borderRadius: BorderRadius.circular(999),
                  ),
                ),
              ),
              const SizedBox(height: AppSpacing.md),
              Text(
                _isEdit ? 'Edit completion' : 'Complete subtask',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: AppSpacing.xs),
              Text(
                widget.subtaskTitle,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppColors.textMuted),
              ),
              const SizedBox(height: AppSpacing.md),
              if (_loading)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: AppSpacing.lg),
                  child: Center(child: CircularProgressIndicator()),
                )
              else ...[
                if (_isEdit) ...[
                  _InfoTile(
                    icon: Icons.schedule_rounded,
                    label: 'Completed',
                    value: timestampLabel,
                  ),
                  _InfoTile(
                    icon: Icons.person_rounded,
                    label: 'By',
                    value: widget.existingRecord!.employeeName,
                  ),
                ] else ...[
                  _InfoTile(
                    icon: Icons.schedule_rounded,
                    label: 'Timestamp',
                    value: timestampLabel,
                  ),
                  _InfoTile(
                    icon: Icons.person_rounded,
                    label: 'Employee',
                    value: widget.employee.fullName,
                  ),
                  _InfoTile(
                    icon: Icons.phone_android_rounded,
                    label: 'Device',
                    value: _deviceSummary(_deviceInfo),
                  ),
                  if (widget.requireLocation) ...[
                    _InfoTile(
                      icon: Icons.location_on_rounded,
                      label: 'GPS',
                      value: _location == null
                          ? 'Unavailable'
                          : '${_location!.latitude.toStringAsFixed(5)}, ${_location!.longitude.toStringAsFixed(5)}'
                              '${_location!.accuracyMeters != null ? ' (±${_location!.accuracyMeters!.round()} m)' : ''}',
                    ),
                    _InfoTile(
                      icon: Icons.fence_rounded,
                      label: 'Geofence',
                      value: _geofence == null
                          ? 'Checking...'
                          : _geofence!.valid
                              ? 'Inside site (${_geofence!.distanceMeters.round()} m from center)'
                              : 'Outside site (${_geofence!.distanceMeters.round()} m / ${_geofence!.radiusMeters.round()} m)',
                      valueColor: _geofence?.valid == true ? AppColors.success : AppColors.danger,
                    ),
                  ] else
                    const _InfoTile(
                      icon: Icons.location_off_rounded,
                      label: 'Location',
                      value: 'Not required for this subtask',
                    ),
                ],
                const SizedBox(height: AppSpacing.md),
                TextField(
                  controller: _notesController,
                  focusNode: _notesFocus,
                  enabled: !_submitting,
                  minLines: 2,
                  maxLines: 4,
                  textInputAction: TextInputAction.done,
                  onTapOutside: (_) => _notesFocus.unfocus(),
                  onEditingComplete: _notesFocus.unfocus,
                  decoration: InputDecoration(
                    labelText: 'Notes (optional)',
                    hintText: ClipboardImagePaste.isSupported
                        ? 'Add notes — paste a screenshot for After proof'
                        : 'Add completion notes...',
                    border: const OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: AppSpacing.md),
                Text(
                  ClipboardImagePaste.isSupported
                      ? 'Attachments (optional) · paste screenshot for After'
                      : 'Attachments (optional)',
                  style: Theme.of(context).textTheme.titleSmall,
                ),
                const SizedBox(height: AppSpacing.sm),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: _submitting ? null : () => _pickPhoto(before: true),
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(horizontal: 8),
                          visualDensity: VisualDensity.compact,
                        ),
                        icon: const Icon(Icons.photo_library_outlined, size: 16),
                        label: Text(
                          'Before ($_beforeCount)',
                          overflow: TextOverflow.ellipsis,
                          maxLines: 1,
                        ),
                      ),
                    ),
                    const SizedBox(width: 6),
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: _submitting ? null : () => _pickPhoto(before: false),
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(horizontal: 8),
                          visualDensity: VisualDensity.compact,
                        ),
                        icon: const Icon(Icons.photo_library_outlined, size: 16),
                        label: Text(
                          'After ($_afterCount)',
                          overflow: TextOverflow.ellipsis,
                          maxLines: 1,
                        ),
                      ),
                    ),
                    const SizedBox(width: 6),
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: _submitting ? null : _recordVoiceNote,
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(horizontal: 8),
                          visualDensity: VisualDensity.compact,
                        ),
                        icon: const Icon(Icons.mic_rounded, size: 16),
                        label: Text(
                          'Voice ($_voiceCount)',
                          overflow: TextOverflow.ellipsis,
                          maxLines: 1,
                        ),
                      ),
                    ),
                    if (widget.requireVideo || _keptVideoName != null || _video != null) ...[
                      const SizedBox(width: 6),
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: _submitting ? null : _pickVideo,
                          style: OutlinedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(horizontal: 8),
                            visualDensity: VisualDensity.compact,
                          ),
                          icon: const Icon(Icons.videocam_rounded, size: 16),
                          label: Text(
                            (_video != null || _keptVideoName != null) ? 'Video ✓' : 'Video',
                            overflow: TextOverflow.ellipsis,
                            maxLines: 1,
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
                if (_proofPreviewEntries.isNotEmpty) ...[
                  const SizedBox(height: AppSpacing.sm),
                  AttachmentGrid(
                    organizationId: widget.organizationId,
                    enabled: !_submitting,
                    items: _proofPreviewEntries,
                  ),
                ],
                if (_unmatchedKeptNameChips.isNotEmpty) ...[
                  const SizedBox(height: AppSpacing.sm),
                  Wrap(
                    spacing: 6,
                    runSpacing: 6,
                    children: _unmatchedKeptNameChips,
                  ),
                ],
                if (_pendingImageTiles.isNotEmpty) ...[
                  const SizedBox(height: AppSpacing.sm),
                  Wrap(
                    spacing: AppSpacing.sm,
                    runSpacing: AppSpacing.sm,
                    children: _pendingImageTiles,
                  ),
                ],
                if (_keptVoiceName != null && _voiceNotes.isEmpty) ...[
                  const SizedBox(height: AppSpacing.sm),
                  _keptVoiceTile(),
                ],
                if (_voiceNotes.isNotEmpty) ...[
                  const SizedBox(height: AppSpacing.sm),
                  ..._voiceNotes.map((note) {
                    final bytes = note.bytes;
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.center,
                        children: [
                          Expanded(
                            child: bytes == null || bytes.isEmpty
                                ? Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 12,
                                      vertical: 10,
                                    ),
                                    decoration: BoxDecoration(
                                      color: AppColors.background,
                                      borderRadius: BorderRadius.circular(10),
                                      border: Border.all(color: AppColors.border),
                                    ),
                                    child: Text(
                                      note.fileName,
                                      style: Theme.of(context)
                                          .textTheme
                                          .bodySmall
                                          ?.copyWith(color: AppColors.textMuted),
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  )
                                : VoiceNotePlayer(
                                    key: ValueKey(note.clientId),
                                    bytes: bytes,
                                    mimeType: note.mimeType ?? 'audio/webm',
                                    fileName: note.fileName,
                                    compact: true,
                                  ),
                          ),
                          const SizedBox(width: 4),
                          IconButton(
                            tooltip: 'Delete voice note',
                            visualDensity: VisualDensity.compact,
                            onPressed: _submitting
                                ? null
                                : () => _removeVoiceNote(note.clientId),
                            icon: const Icon(Icons.close_rounded),
                          ),
                        ],
                      ),
                    );
                  }),
                ],
              ],
              if (_error != null) ...[
                const SizedBox(height: AppSpacing.sm),
                Text(_error!, style: const TextStyle(color: AppColors.danger)),
              ] else if (!_canSubmit && !_loading && _submitBlockedReason != null) ...[
                const SizedBox(height: AppSpacing.sm),
                Text(
                  _submitBlockedReason!,
                  style: const TextStyle(color: AppColors.danger),
                ),
              ],
              const SizedBox(height: AppSpacing.lg),
              PrimaryButton(
                label: _submitting
                    ? (_isEdit ? 'Saving...' : 'Completing...')
                    : (_isEdit ? 'Save changes' : 'Complete subtask'),
                loading: _submitting,
                onPressed: _canSubmit ? () => _submit() : null,
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _deviceSummary(Map<String, dynamic>? info) {
    if (info == null) return 'Unknown';
    final model = info['model']?.toString();
    final platform = info['platform']?.toString() ?? '';
    final version = info['osVersion']?.toString() ?? info['appVersion']?.toString() ?? '';
    if (model != null && model.isNotEmpty) return '$model · $platform $version';
    return '$platform $version'.trim();
  }

  String _shortFileName(String name) {
    final base = name.split('/').last;
    if (base.length <= 28) return base;
    return '${base.substring(0, 12)}…${base.substring(base.length - 12)}';
  }

  TaskAttachment? _matchAttachment(String name, {Set<String> usedIds = const {}}) {
    final target = name.trim().toLowerCase();
    if (target.isEmpty) return null;
    TaskAttachment? fuzzy;
    for (final attachment in widget.existingAttachments) {
      if (usedIds.contains(attachment.id)) continue;
      final fileName = attachment.fileName.trim().toLowerCase();
      final stored = attachment.storedFileName?.trim().toLowerCase() ?? '';
      if (fileName == target || stored == target) return attachment;
      if (fuzzy == null &&
          (fileName.endsWith(target) ||
              target.endsWith(fileName) ||
              (stored.isNotEmpty &&
                  (stored.endsWith(target) || target.endsWith(stored))))) {
        fuzzy = attachment;
      }
    }
    return fuzzy;
  }

  List<AttachmentGridEntry> get _proofPreviewEntries {
    final entries = <AttachmentGridEntry>[];
    final usedIds = <String>{};
    var index = 1;

    void addNamed(String name, VoidCallback onDelete) {
      final attachment = _matchAttachment(name, usedIds: usedIds);
      if (attachment == null) return;
      usedIds.add(attachment.id);
      entries.add(
        AttachmentGridEntry(
          attachment: attachment,
          index: index++,
          onDelete: _submitting ? null : onDelete,
        ),
      );
    }

    for (final name in _keptBeforeNames) {
      addNamed(name, () => setState(() => _keptBeforeNames.remove(name)));
    }
    for (final name in _keptAfterNames) {
      addNamed(name, () => setState(() => _keptAfterNames.remove(name)));
    }
    if (_keptVideoName != null) {
      addNamed(_keptVideoName!, () => setState(() => _keptVideoName = null));
    }
    return entries;
  }

  List<Widget> get _unmatchedKeptNameChips {
    final chips = <Widget>[];
    for (final name in _keptBeforeNames) {
      if (_matchAttachment(name) != null) continue;
      chips.add(
        InputChip(
          label: Text(
            'Before · ${_shortFileName(name)}',
            overflow: TextOverflow.ellipsis,
          ),
          onDeleted: _submitting
              ? null
              : () => setState(() => _keptBeforeNames.remove(name)),
        ),
      );
    }
    for (final name in _keptAfterNames) {
      if (_matchAttachment(name) != null) continue;
      chips.add(
        InputChip(
          label: Text(
            'After · ${_shortFileName(name)}',
            overflow: TextOverflow.ellipsis,
          ),
          onDeleted: _submitting
              ? null
              : () => setState(() => _keptAfterNames.remove(name)),
        ),
      );
    }
    return chips;
  }

  List<Widget> get _pendingImageTiles {
    final tiles = <Widget>[];
    for (final file in _beforePhotos) {
      tiles.add(
        _PendingProofTile(
          file: file,
          badge: 'Before',
          enabled: !_submitting,
          onRemove: () => setState(
            () => _beforePhotos.removeWhere((f) => f.clientId == file.clientId),
          ),
        ),
      );
    }
    for (final file in _afterPhotos) {
      tiles.add(
        _PendingProofTile(
          file: file,
          badge: 'After',
          enabled: !_submitting,
          onRemove: () => setState(
            () => _afterPhotos.removeWhere((f) => f.clientId == file.clientId),
          ),
        ),
      );
    }
    return tiles;
  }

  Widget _keptVoiceTile() {
    final name = _keptVoiceName!;
    final attachment = _matchAttachment(name);
    if (attachment != null && widget.organizationId.isNotEmpty) {
      return AttachmentGrid(
        organizationId: widget.organizationId,
        enabled: !_submitting,
        items: [
          AttachmentGridEntry(
            attachment: attachment,
            index: 1,
            onDelete: _submitting
                ? null
                : () => setState(() => _keptVoiceName = null),
          ),
        ],
      );
    }
    return InputChip(
      label: Text(
        'Voice · ${_shortFileName(name)}',
        overflow: TextOverflow.ellipsis,
      ),
      onDeleted:
          _submitting ? null : () => setState(() => _keptVoiceName = null),
    );
  }
}

class _PendingProofTile extends StatelessWidget {
  const _PendingProofTile({
    required this.file,
    required this.badge,
    required this.onRemove,
    this.enabled = true,
  });

  final PendingAttachment file;
  final String badge;
  final VoidCallback onRemove;
  final bool enabled;

  static const _size = 84.0;

  @override
  Widget build(BuildContext context) {
    final bytes = file.bytes;
    final imageBytes = (bytes != null &&
            bytes.isNotEmpty &&
            isImageMime(file.mimeType, file.fileName))
        ? bytes
        : null;

    return SizedBox(
      width: _size,
      height: _size,
      child: Material(
        color: Theme.of(context)
            .colorScheme
            .surfaceContainerHighest
            .withValues(alpha: 0.45),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: BorderSide(
            color: Theme.of(context).dividerColor.withValues(alpha: 0.45),
          ),
        ),
        clipBehavior: Clip.antiAlias,
        child: Stack(
          fit: StackFit.expand,
          children: [
            if (imageBytes != null)
              Image.memory(imageBytes, fit: BoxFit.cover)
            else
              const Center(
                child: Icon(
                  Icons.insert_drive_file_outlined,
                  color: AppColors.textMuted,
                ),
              ),
            Positioned(
              left: 6,
              top: 6,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: Colors.black.withValues(alpha: 0.62),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  badge,
                  style: Theme.of(context).textTheme.labelSmall?.copyWith(
                        color: Colors.white,
                        fontSize: 9,
                        fontWeight: FontWeight.w700,
                      ),
                ),
              ),
            ),
            Positioned(
              top: 4,
              right: 4,
              child: Material(
                color: Colors.black.withValues(alpha: 0.55),
                shape: const CircleBorder(),
                clipBehavior: Clip.antiAlias,
                child: InkWell(
                  onTap: enabled ? onRemove : null,
                  child: const Padding(
                    padding: EdgeInsets.all(4),
                    child: Icon(Icons.close_rounded, size: 14, color: Colors.white),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _InfoTile extends StatelessWidget {
  const _InfoTile({
    required this.icon,
    required this.label,
    required this.value,
    this.valueColor,
  });

  final IconData icon;
  final String label;
  final String value;
  final Color? valueColor;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 18, color: AppColors.primary),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: Theme.of(context).textTheme.labelSmall?.copyWith(
                        color: AppColors.textMuted,
                        fontWeight: FontWeight.w600,
                      ),
                ),
                Text(
                  value,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: valueColor,
                      ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

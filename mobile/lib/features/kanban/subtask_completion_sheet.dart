import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../core/services/device_info_service.dart';
import '../../core/services/geofence_service.dart';
import '../../core/services/location_service.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../data/models/login_response.dart';
import '../../data/models/pending_attachment.dart';
import '../../data/models/subtask_completion_record.dart';
import '../../shared/voice_dictation/voice_note_recorder_sheet.dart';
import '../../shared/widgets/app_widgets.dart';
import 'attachment_picker_section.dart';
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
    ),
  );
}

class _SubtaskCompletionSheet extends StatefulWidget {
  const _SubtaskCompletionSheet({
    required this.subtaskTitle,
    required this.projectId,
    required this.employee,
    required this.requireVideo,
    required this.requireLocation,
  });

  final String subtaskTitle;
  final String projectId;
  final AuthUser employee;
  final bool requireVideo;
  final bool requireLocation;

  @override
  State<_SubtaskCompletionSheet> createState() => _SubtaskCompletionSheetState();
}

class _SubtaskCompletionSheetState extends State<_SubtaskCompletionSheet> {
  final _notesController = TextEditingController();
  final _notesFocus = FocusNode();

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

  @override
  void initState() {
    super.initState();
    _timestamp = DateTime.now().toUtc();
    _bootstrap();
  }

  @override
  void dispose() {
    _notesController.dispose();
    _notesFocus.dispose();
    super.dispose();
  }

  Future<void> _bootstrap() async {
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
    if (_submitting) return null;
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
    final picked = await AttachmentPickerUtils.capturePhoto();
    if (picked == null) return;
    final renamed = PendingAttachment(
      clientId: picked.clientId,
      fileName: '${before ? 'before' : 'after'}-${picked.fileName}',
      bytes: picked.bytes,
      path: picked.path,
      mimeType: picked.mimeType,
    );
    setState(() {
      if (before) {
        _beforePhotos.add(renamed);
      } else {
        _afterPhotos.add(renamed);
      }
    });
  }

  Future<void> _pickVideo() async {
    _notesFocus.unfocus();
    final picked = await AttachmentPickerUtils.captureVideo();
    if (picked == null) return;
    setState(() => _video = picked);
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
      _voiceNotes.add(stable);
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
      final location = _location;
      final geofence = _geofence;
      final record = SubtaskCompletionRecord(
        completedAt: _timestamp.toIso8601String(),
        employeeId: widget.employee.id,
        employeeName: widget.employee.fullName,
        employeeEmail: widget.employee.email,
        latitude: location?.latitude ?? 0,
        longitude: location?.longitude ?? 0,
        accuracyMeters: location?.accuracyMeters,
        geofenceValid: widget.requireLocation ? (geofence?.valid ?? false) : true,
        geofenceDistanceMeters: geofence?.distanceMeters,
        geofenceRadiusMeters: geofence?.radiusMeters,
        geofenceSiteId: widget.requireLocation ? widget.projectId : null,
        deviceInfo: _deviceInfo ?? const {'platform': 'unknown'},
        notes: _notesController.text.trim().isEmpty
            ? null
            : _notesController.text.trim(),
        beforePhotoFileNames: _beforePhotos.map((f) => f.fileName).toList(),
        afterPhotoFileNames: _afterPhotos.map((f) => f.fileName).toList(),
        voiceNoteFileName:
            _voiceNotes.isEmpty ? null : _voiceNotes.first.fileName,
        videoFileName: _video?.fileName,
      );

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
        _error = 'Could not complete: $e';
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
              Text('Complete subtask', style: Theme.of(context).textTheme.titleLarge),
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
                  decoration: const InputDecoration(
                    labelText: 'Notes (optional)',
                    hintText: 'Add completion notes...',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: AppSpacing.md),
                Text('Attachments (optional)', style: Theme.of(context).textTheme.titleSmall),
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
                        icon: const Icon(Icons.photo_camera_outlined, size: 16),
                        label: Text(
                          'Before (${_beforePhotos.length})',
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
                        icon: const Icon(Icons.photo_camera_outlined, size: 16),
                        label: Text(
                          'After (${_afterPhotos.length})',
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
                          'Voice (${_voiceNotes.length})',
                          overflow: TextOverflow.ellipsis,
                          maxLines: 1,
                        ),
                      ),
                    ),
                    if (widget.requireVideo) ...[
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
                            _video == null ? 'Video' : 'Video ✓',
                            overflow: TextOverflow.ellipsis,
                            maxLines: 1,
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
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
                label: _submitting ? 'Completing...' : 'Complete subtask',
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

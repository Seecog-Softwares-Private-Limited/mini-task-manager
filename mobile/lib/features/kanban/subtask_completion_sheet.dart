import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:record/record.dart';

import '../../core/services/device_info_service.dart';
import '../../core/services/geofence_service.dart';
import '../../core/services/location_service.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/utils/client_id.dart';
import '../../data/models/login_response.dart';
import '../../data/models/pending_attachment.dart';
import '../../data/models/subtask_completion_record.dart';
import '../../shared/widgets/app_widgets.dart';
import 'attachment_picker_section.dart';

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
}) {
  return showModalBottomSheet<SubtaskCompletionResult>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    builder: (context) => _SubtaskCompletionSheet(
      subtaskTitle: subtaskTitle,
      projectId: projectId,
      employee: employee,
      requireVideo: requireVideo,
    ),
  );
}

class _SubtaskCompletionSheet extends StatefulWidget {
  const _SubtaskCompletionSheet({
    required this.subtaskTitle,
    required this.projectId,
    required this.employee,
    required this.requireVideo,
  });

  final String subtaskTitle;
  final String projectId;
  final AuthUser employee;
  final bool requireVideo;

  @override
  State<_SubtaskCompletionSheet> createState() => _SubtaskCompletionSheetState();
}

class _SubtaskCompletionSheetState extends State<_SubtaskCompletionSheet> {
  final _notesController = TextEditingController();
  final _recorder = AudioRecorder();

  bool _loading = true;
  bool _submitting = false;
  String? _error;

  CapturedLocation? _location;
  GeofenceValidation? _geofence;
  Map<String, dynamic>? _deviceInfo;
  late final DateTime _timestamp;

  final List<PendingAttachment> _beforePhotos = [];
  final List<PendingAttachment> _afterPhotos = [];
  PendingAttachment? _voiceNote;
  PendingAttachment? _video;
  bool _recordingVoice = false;

  @override
  void initState() {
    super.initState();
    _timestamp = DateTime.now().toUtc();
    _bootstrap();
  }

  @override
  void dispose() {
    _notesController.dispose();
    _recorder.dispose();
    super.dispose();
  }

  Future<void> _bootstrap() async {
    try {
      final location = await LocationService.captureCurrent();
      final deviceInfo = await DeviceInfoService.capture();
      final geofence = await GeofenceService.validate(
        projectId: widget.projectId,
        latitude: location.latitude,
        longitude: location.longitude,
      );
      if (!mounted) return;
      setState(() {
        _location = location;
        _deviceInfo = deviceInfo;
        _geofence = geofence;
        _loading = false;
        if (!geofence.valid) {
          _error =
              'You are outside the work site (${geofence.distanceMeters.round()} m away, limit ${geofence.radiusMeters.round()} m).';
        }
      });
    } on LocationCaptureException catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.message;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = 'Could not capture location: $e';
        _loading = false;
      });
    }
  }

  bool get _canSubmit {
    if (_loading || _submitting) return false;
    if (_location == null || _deviceInfo == null || _geofence == null) return false;
    if (!_geofence!.valid) return false;
    if (widget.requireVideo && _video == null) return false;
    return true;
  }

  Future<void> _pickPhoto({required bool before}) async {
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
    final picked = await AttachmentPickerUtils.captureVideo();
    if (picked == null) return;
    setState(() => _video = picked);
  }

  Future<void> _toggleVoiceRecording() async {
    if (kIsWeb) {
      setState(() => _error = 'Voice notes are not supported on web.');
      return;
    }
    if (_recordingVoice) {
      final path = await _recorder.stop();
      setState(() => _recordingVoice = false);
      if (path == null || path.isEmpty) return;
      final bytes = await File(path).readAsBytes();
      setState(() {
        _voiceNote = PendingAttachment(
          clientId: generateClientId(),
          fileName: 'voice-${DateTime.now().toIso8601String().replaceAll(':', '-')}.m4a',
          bytes: bytes,
          path: path,
          mimeType: 'audio/mp4',
        );
      });
      return;
    }

    final hasPermission = await _recorder.hasPermission();
    if (!hasPermission) {
      setState(() => _error = 'Microphone permission is required for voice notes.');
      return;
    }
    final stamp = DateTime.now().toIso8601String().replaceAll(':', '-');
    final path = '${Directory.systemTemp.path}/voice-$stamp.m4a';
    await _recorder.start(const RecordConfig(encoder: AudioEncoder.aacLc), path: path);
    setState(() {
      _recordingVoice = true;
      _error = null;
    });
  }

  Future<void> _submit() async {
    if (!_canSubmit) return;
    setState(() => _submitting = true);
    final location = _location!;
    final geofence = _geofence!;
    final record = SubtaskCompletionRecord(
      completedAt: _timestamp.toIso8601String(),
      employeeId: widget.employee.id,
      employeeName: widget.employee.fullName,
      employeeEmail: widget.employee.email,
      latitude: location.latitude,
      longitude: location.longitude,
      accuracyMeters: location.accuracyMeters,
      geofenceValid: geofence.valid,
      geofenceDistanceMeters: geofence.distanceMeters,
      geofenceRadiusMeters: geofence.radiusMeters,
      geofenceSiteId: widget.projectId,
      deviceInfo: _deviceInfo!,
      notes: _notesController.text.trim().isEmpty ? null : _notesController.text.trim(),
      beforePhotoFileNames: _beforePhotos.map((f) => f.fileName).toList(),
      afterPhotoFileNames: _afterPhotos.map((f) => f.fileName).toList(),
      voiceNoteFileName: _voiceNote?.fileName,
      videoFileName: _video?.fileName,
    );

    final attachments = <PendingAttachment>[
      ..._beforePhotos,
      ..._afterPhotos,
      if (_voiceNote != null) _voiceNote!,
      if (_video != null) _video!,
    ];

    if (!mounted) return;
    Navigator.pop(
      context,
      SubtaskCompletionResult(record: record, attachments: attachments),
    );
  }

  @override
  Widget build(BuildContext context) {
    final timestampLabel = DateFormat('MMM d, yyyy · h:mm a').format(_timestamp.toLocal());

    return Padding(
      padding: EdgeInsets.only(
        left: AppSpacing.md,
        right: AppSpacing.md,
        top: AppSpacing.sm,
        bottom: MediaQuery.viewInsetsOf(context).bottom + AppSpacing.lg,
      ),
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
            const SizedBox(height: AppSpacing.md),
            TextField(
              controller: _notesController,
              minLines: 2,
              maxLines: 4,
              decoration: const InputDecoration(
                labelText: 'Notes (optional)',
                hintText: 'Add completion notes...',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: AppSpacing.md),
            Text('Photos (optional)', style: Theme.of(context).textTheme.titleSmall),
            const SizedBox(height: AppSpacing.sm),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                OutlinedButton.icon(
                  onPressed: _submitting ? null : () => _pickPhoto(before: true),
                  icon: const Icon(Icons.photo_camera_outlined, size: 18),
                  label: Text('Before (${_beforePhotos.length})'),
                ),
                OutlinedButton.icon(
                  onPressed: _submitting ? null : () => _pickPhoto(before: false),
                  icon: const Icon(Icons.photo_camera_outlined, size: 18),
                  label: Text('After (${_afterPhotos.length})'),
                ),
                if (!kIsWeb)
                  OutlinedButton.icon(
                    onPressed: _submitting ? null : _toggleVoiceRecording,
                    icon: Icon(
                      _recordingVoice ? Icons.stop_rounded : Icons.mic_rounded,
                      size: 18,
                    ),
                    label: Text(_recordingVoice
                        ? 'Stop'
                        : _voiceNote == null
                            ? 'Voice'
                            : 'Voice ✓'),
                  ),
                if (widget.requireVideo)
                  OutlinedButton.icon(
                    onPressed: _submitting ? null : _pickVideo,
                    icon: const Icon(Icons.videocam_rounded, size: 18),
                    label: Text(_video == null ? 'Video (required)' : 'Video ✓'),
                  ),
              ],
            ),
          ],
          if (_error != null) ...[
            const SizedBox(height: AppSpacing.sm),
            Text(_error!, style: const TextStyle(color: AppColors.danger)),
          ],
          const SizedBox(height: AppSpacing.lg),
          PrimaryButton(
            label: _submitting ? 'Completing...' : 'Complete subtask',
            loading: _submitting,
            onPressed: _canSubmit ? _submit : null,
          ),
        ],
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
